<?php

namespace App\Mail;

use App\Models\Spk;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DocumentAddedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $spk;
    public $sectionName;
    public $adminUser;
    public $recipient;
    public $count;

    /**
     * Create a new message instance.
     */
    public function __construct(Spk $spk, $sectionName, User $adminUser, User $recipient, $count)
    {
        $this->spk = $spk;
        $this->sectionName = $sectionName;
        $this->adminUser = $adminUser;
        $this->recipient = $recipient;
        $this->count = $count;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $type = $this->spk->shipment_type;
        $code = $this->spk->spk_code;

        if ($type === 'Import') {
            $subject = 'Dokumen Tambahan (B/L ' . $code . ') - ' . $this->sectionName;
        } elseif ($type === 'Export') {
            $subject = 'Dokumen Tambahan (S/I ' . $code . ') - ' . $this->sectionName;
        } else {
            $subject = 'Dokumen Tambahan (' . $code . ') - ' . $this->sectionName;
        }

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.document_added',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
