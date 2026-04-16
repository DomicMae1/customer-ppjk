<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SectionReminderMail extends Mailable
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

    public $section;
    public $externalUser;
    public $spk;

    /**
     * Create a new message instance.
     */
    public function __construct($section, User $externalUser, $spk = null)
    {
        $this->section = $section;
        $this->externalUser = $externalUser;
        $this->spk = $spk;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Reminder: Section ' . $this->section . ' Disimpan oleh ' . $this->externalUser->name)
            ->view('emails.section_reminder');
    }
}
