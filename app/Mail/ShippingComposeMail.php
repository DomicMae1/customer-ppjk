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

    public $spk;
    public $subjectText;
    public $bodyHtml;
    public $fromName; 
    public $attachedNames;

    public function __construct(Spk $spk, string $subjectText, string $bodyHtml, $fromName = null, array $attachedNames = [])
    {
        $this->spk = $spk;
        $this->subjectText = $subjectText;
        $this->bodyHtml = $bodyHtml;
        $this->fromName = $fromName; 
        $this->attachedNames = $attachedNames;
    }

    public function envelope(): Envelope
    {
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
                'senderName' => $this->fromName,
                'attachedNames' => $this->attachedNames,
            ],
        );
    }


}