<?php

namespace App\Console\Commands;

use App\Models\NotificationReminderLog;
use App\Models\NotificationReminderSetting;
use App\Models\Spk;
use App\Models\Tenant;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reminders:send';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send deadline and ETA reminders based on settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting reminders check...');
        $today = Carbon::today();

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            if (!$tenant->perusahaan_id) {
                continue;
            }

            tenancy()->initialize($tenant);
            $idPerusahaan = $tenant->perusahaan_id;

            // Fetch settings for this company
            $settings = NotificationReminderSetting::where('id_perusahaan', $idPerusahaan)
                ->where('is_active', true)
                ->get()
                ->groupBy('reminder_type');

            if ($settings->isEmpty()) {
                continue; // No active settings for this company
            }

            // --- ETA REMINDERS ---
            if ($settings->has('eta')) {
                $etaSettings = $settings['eta'];

                // Find SPKs with ETA
                $spks = Spk::whereNotNull('eta_date')
                    ->where('eta_date', '>=', $today)
                    ->get();

                foreach ($spks as $spk) {
                    $etaDate = Carbon::parse($spk->eta_date)->startOfDay();
                    $diffInDays = $today->diffInDays($etaDate, false); // false = return negative if past
                    
                    if ($diffInDays < 0) continue;

                    foreach ($etaSettings as $setting) {
                        $daysBeforeArr = $setting->days_before ?? [];
                        
                        // Check if today matches any "days_before"
                        if (in_array($diffInDays, $daysBeforeArr)) {
                            $this->processReminder($spk, 'eta', $setting, $diffInDays, $today);
                        }
                    }
                }
            }

            // --- DEADLINE REMINDERS ---
            if ($settings->has('deadline')) {
                $deadlineSettings = $settings['deadline'];

                // Find SPKs and their nearest section deadline
                $spks = Spk::with('sections')->get();

                foreach ($spks as $spk) {
                    // Get nearest deadline date across all sections
                    $nearestDeadlineSection = $spk->sections
                        ->filter(function ($section) {
                            return !empty($section->deadline_date);
                        })
                        ->sortBy(function ($section) {
                            return Carbon::parse($section->deadline_date)->timestamp;
                        })
                        ->first();

                    if (!$nearestDeadlineSection) continue;

                    $deadlineDate = Carbon::parse($nearestDeadlineSection->deadline_date)->startOfDay();
                    $diffInDays = $today->diffInDays($deadlineDate, false);

                    if ($diffInDays < 0) continue;

                    foreach ($deadlineSettings as $setting) {
                        $daysBeforeArr = $setting->days_before ?? [];

                        if (in_array($diffInDays, $daysBeforeArr)) {
                            $this->processReminder($spk, 'deadline', $setting, $diffInDays, $today, $nearestDeadlineSection->section_name);
                        }
                    }
                }
            }
        }

        $this->info('Reminders check completed.');
    }

    private function processReminder($spk, $type, $setting, $daysBefore, $today, $extraContext = null)
    {
        $idPerusahaan = $setting->id_perusahaan;
        $role = $setting->role_internal;

        // Deduplication check
        $logExists = NotificationReminderLog::where('id_perusahaan', $idPerusahaan)
            ->where('id_spk', $spk->id)
            ->where('reminder_type', $type)
            ->where('role_internal', $role)
            ->where('days_before', $daysBefore)
            ->where('sent_date', $today)
            ->exists();

        if ($logExists) {
            return; // Already sent today for this combo
        }

        // Find targets
        $targets = collect();

        if ($role === 'eksternal') {
            $targets = User::on('tako-user')
                ->where('role', 'eksternal')
                ->where('id_customer', $spk->id_customer)
                ->get();
        } else {
            // internal role
            // If the role is staff, and SPK is assigned, we might only want to notify the assigned staff
            if ($role === 'staff' && $spk->validated_by) {
                $pic = User::on('tako-user')->find($spk->validated_by);
                if ($pic) {
                    $targets->push($pic);
                }
            } else {
                // otherwise send to everyone with that role
                $targets = User::on('tako-user')
                    ->where('role', 'internal')
                    ->where('role_internal', $role)
                    ->where('id_perusahaan', $idPerusahaan)
                    ->get();
            }
        }

        if ($targets->isEmpty()) {
            return;
        }

        $eventKey = $type === 'eta' ? 'eta_reminder' : 'deadline_reminder';

        // Send Notification
        if ($setting->send_notification) {
            foreach ($targets as $target) {
                try {
                    $title = $type === 'eta' ? "Reminder: ETA Kapal" : "Reminder: Deadline Section {$extraContext}";
                    $message = $type === 'eta' 
                        ? "Kapal untuk SPK {$spk->spk_code} diperkirakan tiba dalam {$daysBefore} hari."
                        : "Batas waktu untuk section {$extraContext} pada SPK {$spk->spk_code} tersisa {$daysBefore} hari.";

                    NotificationService::send([
                        'send_to' => $target->id_user,
                        'created_by' => null, // System
                        'role' => $target->role,
                        'id_spk' => $spk->id,
                        'data' => [
                            'type' => $eventKey,
                            'title' => $title,
                            'message' => $message,
                            'url' => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code
                        ]
                    ]);
                } catch (\Exception $e) {
                    Log::error("Failed to send reminder notification: " . $e->getMessage());
                }
            }
        }

        // Send Email
        if ($setting->send_email) {
            // Note: Since you don't have Mail templates for this yet, we just log it or you can implement the Mail classes later.
            // e.g. Mail::to($target->email)->queue(new ReminderMail(...));
            Log::info("Sending email reminder for SPK {$spk->spk_code} to role {$role}");
        }

        // Log to prevent duplicate
        NotificationReminderLog::create([
            'id_perusahaan' => $idPerusahaan,
            'id_spk' => $spk->id,
            'reminder_type' => $type,
            'role_internal' => $role,
            'days_before' => $daysBefore,
            'sent_date' => $today,
        ]);
    }
}
