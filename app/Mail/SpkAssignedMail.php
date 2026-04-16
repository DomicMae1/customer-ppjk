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

class SpkAssignedMail extends Mailable implements ShouldQueue
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
    public $supervisor;
    public $staff;

    /**
     * Create a new message instance.
     */
    public function __construct(Spk $spk, User $supervisor, User $staff)
    {
        $this->spk = $spk;
        $this->supervisor = $supervisor;
        $this->staff = $staff;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {

        $type = $this->spk->shipment_type;
        $code = $this->spk->spk_code;

        if ($type === 'Import') {
            $subject = 'Penunjukan PIC Nomor B/L ' . $code;
        } elseif ($type === 'Export') {
            $subject = 'Penunjukan PIC Nomor S/I ' . $code;
        } else {
            $subject = 'Penunjukan PIC ' . $code;
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
            view: 'emails.spk_assigned',
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
