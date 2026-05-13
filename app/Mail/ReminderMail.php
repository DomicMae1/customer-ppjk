<?php

namespace App\Mail;

use App\Models\Spk;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Spk    $spk,
        public string $reminderType,   // 'deadline' | 'eta'
        public string $title,
        public string $message,
        public int    $daysBefore,
        public ?string $deadlineDate = null,  // formatted date string
        public array   $sectionNames = [],    // for deadline type
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->title . ' — SPK ' . $this->spk->spk_code,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reminder',
            with: [
                'spk'          => $this->spk,
                'reminderType' => $this->reminderType,
                'title'        => $this->title,
                'bodyMessage'  => $this->message,
                'daysBefore'   => $this->daysBefore,
                'deadlineDate' => $this->deadlineDate,
                'sectionNames' => $this->sectionNames,
            ],
        );
    }
}
