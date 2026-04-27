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
    ) {
    }

    public function handle(): void
    {
        $tenant = Tenant::findOrFail($this->tenantId);
        tenancy()->initialize($tenant);

        $spk = Spk::findOrFail($this->spkId);

        $latestDocs = DocumentTrans::with('masterDocument')
            ->where('id_spk', $this->spkId)
            ->orderByDesc('id')
            ->get()
            ->groupBy('id_dokumen')
            ->map(function ($items) {
                return $items->first();
            });

        $mailable = new ShippingComposeMail($spk, $this->subject, $this->bodyHtml, $this->senderName);

        $disk = Storage::disk('customers_external');
        foreach ($this->documentIds as $idDokumen) {
            $doc = $latestDocs->get((int) $idDokumen);
            if (!$doc || !$doc->url_path_file) {
                continue;
            }
            if (!$disk->exists($doc->url_path_file)) {
                continue;
            }
            $fullPath = $disk->path($doc->url_path_file);
            $mailable->attach($fullPath, ['as' => $doc->nama_file ?? basename($fullPath)]);
        }

        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            $name = $temp['name'] ?? null;
            if (!$path || !$disk->exists($path)) {
                continue;
            }
            $mailable->attach($disk->path($path), ['as' => $name ?: basename($path)]);
        }

        Mail::to($this->to)->cc($this->cc)->send($mailable);

        foreach ($this->tempFilePaths as $temp) {
            $path = $temp['path'] ?? null;
            if ($path) {
                $disk->delete($path);
            }
        }
    }
}

