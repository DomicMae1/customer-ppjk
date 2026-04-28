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

        $mailable = new \App\Mail\ShippingComposeMail($spk, $this->subject, $this->bodyHtml, $this->senderName);
        $pdfService = new \App\Services\ShippingPdfService();
        $disk = Storage::disk('customers_external');

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
            $fullPath = $disk->path($doc->url_path_file);
            $mailable->attach($fullPath, ['as' => $doc->nama_file ?? basename($fullPath)]);
        }

        // 2. Attach Manually Uploaded Files
        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            $name = $temp['name'] ?? null;
            if (!$path || !$disk->exists($path)) {
                continue;
            }
            $mailable->attach($disk->path($path), ['as' => $name ?: basename($path)]);
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

