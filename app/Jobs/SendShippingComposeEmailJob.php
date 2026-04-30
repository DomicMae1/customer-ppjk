<?php

namespace App\Jobs;

use App\Mail\ShippingComposeMail;
use App\Models\DocumentTrans;
use App\Models\Spk;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SendShippingComposeEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 30;

    public function __construct(
        public string $tenantId,
        public int $spkId,
        public array $to,
        public array $cc,
        public string $subject,
        public string $bodyHtml,
        public array $documentIds,
        public array $tempFilePaths,
        public string $senderName,
        public bool $attachOverviewPdf = false,
        public bool $attachKarantinaPdf = false,
        public bool $attachNonKarantinaPdf = false,
        public ?int $senderPerusahaanId = null,
        public ?string $userName = null,
    ) {
    }

    public function handle(): void
    {
        $tenant = Tenant::findOrFail($this->tenantId);
        tenancy()->initialize($tenant);

        $spk = Spk::with('parties')->findOrFail($this->spkId);

        $latestDocs = DocumentTrans::with('masterDocument')
            ->where('id_spk', $this->spkId)
            ->orderByDesc('id')
            ->get()
            ->groupBy('id_dokumen')
            ->map(function ($items) {
                return $items->first();
            });

        $attachedNames = [];
        $disk = Storage::disk('customers_external');

        // 1. Prepare DocumentTrans attachments & names
        foreach ($this->documentIds as $idDokumen) {
            $doc = $latestDocs->get((int) $idDokumen);
            if ($doc && $doc->url_path_file && $disk->exists($doc->url_path_file)) {
                $originalName = $doc->nama_file ?? $doc->masterDocument?->nama_dokumen ?? basename($doc->url_path_file);
                $safeName = str_replace(['/', '\\'], '-', $originalName);
                
                $pathExt = pathinfo($doc->url_path_file, PATHINFO_EXTENSION);
                if ($pathExt && !str_ends_with(strtolower($safeName), '.' . strtolower($pathExt))) {
                    $safeName .= '.' . $pathExt;
                }
                $attachedNames[] = $safeName;
            }
        }

        // 2. Manual Uploads
        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            if ($path && $disk->exists($path)) {
                $name = $temp['name'] ?? basename($path);
                $attachedNames[] = str_replace(['/', '\\'], '-', $name);
            }
        }

        // 3. Background PDFs
        if ($this->attachOverviewPdf) $attachedNames[] = "SPK Overview (PDF)";
        if ($this->attachKarantinaPdf) $attachedNames[] = "SPK Karantina (PDF)";
        if ($this->attachNonKarantinaPdf) $attachedNames[] = "SPK Non Karantina (PDF)";

        $mailable = new \App\Mail\ShippingComposeMail($spk, $this->subject, $this->bodyHtml, $this->senderName, $attachedNames);
        $pdfService = new \App\Services\ShippingPdfService();

        // 1. Attach DocumentTrans files
        foreach ($this->documentIds as $idDokumen) {
            $doc = $latestDocs->get((int) $idDokumen);
            if (!$doc || !$doc->url_path_file) {
                continue;
            }
            if (!$disk->exists($doc->url_path_file)) {
                Log::warning("Job Attachment Missing: {$doc->url_path_file} for SPK {$this->spkId}");
                continue;
            }

            $fileContent = $disk->get($doc->url_path_file);
            
            // Tentukan nama file: gunakan nama_file dari DB atau basename dari path
            $originalName = $doc->nama_file ?? basename($doc->url_path_file);
            
            // Bersihkan nama dari karakter bermasalah (seperti / di "Draft PIB/PEB")
            $safeName = str_replace(['/', '\\'], '-', $originalName);

            // Pastikan ada ekstensi jika di nama tidak ada tapi di path ada
            $pathExt = pathinfo($doc->url_path_file, PATHINFO_EXTENSION);
            if ($pathExt && !str_ends_with(strtolower($safeName), '.' . strtolower($pathExt))) {
                $safeName .= '.' . $pathExt;
            }

            try {
                $mime = $disk->mimeType($doc->url_path_file);
                $mailable->attachData($fileContent, $safeName, ['mime' => $mime]);
            } catch (\Exception $e) {
                $mailable->attachData($fileContent, $safeName);
            }
        }

        // 2. Attach Manually Uploaded Files
        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            $name = $temp['name'] ?? null;
            if (!$path || !$disk->exists($path)) {
                continue;
            }
            $fileContent = $disk->get($path);
            $safeName = str_replace(['/', '\\'], '-', $name ?: basename($path));
            
            try {
                $mime = $disk->mimeType($path);
                $mailable->attachData($fileContent, $safeName, ['mime' => $mime]);
            } catch (\Exception $e) {
                $mailable->attachData($fileContent, $safeName);
            }
        }

        // 3. Generate and Attach PDFs in Background
        $pdfModes = [];
        if ($this->attachOverviewPdf) {
            $pdfModes[] = ['template' => false, 'karantina' => false];
        }
        if ($this->attachKarantinaPdf) {
            $pdfModes[] = ['template' => true, 'karantina' => true];
        }
        if ($this->attachNonKarantinaPdf) {
            $pdfModes[] = ['template' => true, 'karantina' => false];
        }

        $user = null;
        if ($this->userName) {
            $user = (object) ['name' => $this->userName];
        }

        foreach ($pdfModes as $mode) {
            try {
                [$pdf, $filename] = $pdfService->build(
                    $spk,
                    $tenant,
                    $user,
                    $this->senderPerusahaanId,
                    (bool) $mode['template'],
                    (bool) $mode['karantina']
                );
                $mailable->attachData($pdf->output(), $filename, ['mime' => 'application/pdf']);
            } catch (\Exception $e) {
                Log::error("Failed to generate PDF in background job: " . $e->getMessage());
            }
        }

        // 4. Send Email
        Mail::to($this->to)->cc($this->cc)->send($mailable);

        // 5. Cleanup manually uploaded files
        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            if ($path) {
                $disk->delete($path);
            }
        }
    }
}

