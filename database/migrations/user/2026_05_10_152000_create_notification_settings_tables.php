<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tako-user';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_channel_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->string('role_internal'); // 'eksternal' for external users
            $table->string('event_type');
            $table->boolean('send_email')->default(true);
            $table->boolean('send_notification')->default(true);
            $table->timestamps();

            $table->unique(['id_perusahaan', 'role_internal', 'event_type'], 'notif_channel_setting_unique');
        });

        Schema::create('notification_reminder_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->string('reminder_type'); // 'deadline', 'eta'
            $table->string('role_internal'); // 'eksternal' for external users
            $table->json('days_before'); // e.g. [5, 3, 1]
            $table->boolean('send_email')->default(true);
            $table->boolean('send_notification')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['id_perusahaan', 'reminder_type', 'role_internal'], 'notif_reminder_setting_unique');
        });

        Schema::create('notification_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->unsignedBigInteger('id_spk');
            $table->string('reminder_type');
            $table->string('role_internal');
            $table->integer('days_before');
            $table->date('sent_date');
            $table->timestamps();

            $table->unique(['id_spk', 'reminder_type', 'role_internal', 'days_before', 'sent_date'], 'notif_reminder_log_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reminder_logs');
        Schema::dropIfExists('notification_reminder_settings');
        Schema::dropIfExists('notification_channel_settings');
    }
};
