<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationChannelSetting extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';
    protected $table = 'notification_channel_settings';

    protected $fillable = [
        'id_perusahaan',
        'role_internal',
        'event_type',
        'send_email',
        'send_notification',
    ];

    protected $casts = [
        'send_email' => 'boolean',
        'send_notification' => 'boolean',
    ];
}
