<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule the daily reminders check
\Illuminate\Support\Facades\Schedule::command('reminders:send')->dailyAt('07:00');
