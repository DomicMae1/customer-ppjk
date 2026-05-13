<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationReminderSetting extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';
    protected $table = 'notification_reminder_settings';

    protected $fillable = [
        'id_perusahaan',
        'reminder_type',
        'role_internal',
        'days_before',
        'send_email',
        'send_notification',
        'is_active',
    ];

    protected $casts = [
        'days_before' => 'array',
        'send_email' => 'boolean',
        'send_notification' => 'boolean',
        'is_active' => 'boolean',
    ];
}
