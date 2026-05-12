<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationReminderLog extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';
    protected $table = 'notification_reminder_logs';

    protected $fillable = [
        'id_perusahaan',
        'id_spk',
        'reminder_type',
        'role_internal',
        'days_before',
        'sent_date',
    ];

    protected $casts = [
        'sent_date' => 'date',
    ];
}
