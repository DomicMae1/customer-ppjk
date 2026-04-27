<?php

namespace App\Mail;

use App\Models\Spk;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShippingComposeMail extends Mailable
{
    use Queueable, SerializesModels;

    // KUNCI PERBAIKAN: Property ini harus ada!
    public $spk;
    public $subjectText;
    public $bodyHtml;
    public $fromName; // Kita pakai string saja supaya aman dari error undefined

    public function __construct(Spk $spk, string $subjectText, string $bodyHtml, $fromName = null)
    {
        $this->spk = $spk;
        $this->subjectText = $subjectText;
        $this->bodyHtml = $bodyHtml;
        $this->fromName = $fromName; // Menyimpan nama perusahaan pengirim
    }

    public function envelope(): Envelope
    {
        // Gunakan fromName yang dikirim dari Job/Controller, 
        // kalau kosong baru ambil dari relasi SPK, kalau masih kosong pakai default .env
        $finalName = $this->fromName 
                     ?? $this->spk->perusahaan->nama_perusahaan 
                     ?? config('mail.from.name');

        return new Envelope(
            from: new Address(config('mail.from.address'), $finalName),
            subject: $this->subjectText,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.shipping_compose',
            with: [
                'spk' => $this->spk,
                'bodyHtml' => $this->bodyHtml,
                'senderName' => $this->fromName, // Bisa dipakai di template blade
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}