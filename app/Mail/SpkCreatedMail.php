<?php

namespace App\Mail;

use App\Models\Spk;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpkCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 5;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 30; // Wait 30 seconds before retrying

    public $spk;
    public $creator;

    /**
     * Create a new message instance.
     */
    public function __construct(Spk $spk, User $creator)
    {
        $this->spk = $spk;
        $this->creator = $creator;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $type = $this->spk->shipment_type;
        $code = $this->spk->spk_code;

        if ($type === 'Import') {
            $subject = 'SPK telah dibuat: Nomor B/L ' . $code;
        } elseif ($type === 'Export') {
            $subject = 'SPK telah dibuat: Nomor S/I ' . $code;
        } else {
            $subject = 'SPK telah dibuat: ' . $code;
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
            view: 'emails.spk_created',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
