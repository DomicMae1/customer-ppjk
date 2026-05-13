<?php

namespace App\Console\Commands;

use App\Mail\ReminderMail;
use App\Models\NotificationReminderLog;
use App\Models\NotificationReminderSetting;
use App\Models\Spk;
use App\Models\Tenant;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendRemindersCommand extends Command
{
    protected $signature = 'reminders:send
        {--date= : Override today\'s date for testing (format: YYYY-MM-DD)}
        {--clear-logs : Clear today\'s reminder logs before running (useful for re-testing)}';

    protected $description = 'Send deadline and ETA reminders based on settings';

    public function handle()
    {
        $this->info('Starting reminders check...');

        // Support --date override for local testing
        $dateOverride = $this->option('date');
        if ($dateOverride) {
            try {
                $today = Carbon::parse($dateOverride)->startOfDay();
                $this->warn("[TEST MODE] Using overridden date: {$today->toDateString()}");
            } catch (\Exception $e) {
                $this->error("Invalid --date format. Use YYYY-MM-DD.");
                return 1;
            }
        } else {
            $today = Carbon::today();
        }

        // Clear logs for the target date to allow re-testing
        if ($this->option('clear-logs')) {
            $deleted = NotificationReminderLog::whereDate('sent_date', $today)->delete();
            $this->warn("[TEST MODE] Cleared {$deleted} reminder log(s) for {$today->toDateString()}.");
        }

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            if (!$tenant->perusahaan_id) continue;

            tenancy()->initialize($tenant);
            $idPerusahaan = $tenant->perusahaan_id;

            $settings = NotificationReminderSetting::where('id_perusahaan', $idPerusahaan)
                ->where('is_active', true)
                ->get()
                ->groupBy('reminder_type');

            if ($settings->isEmpty()) continue;

            // ── ETA REMINDERS ─────────────────────────────────────────────────
            if ($settings->has('eta')) {
                $etaSettings = $settings['eta'];

                $spks = Spk::whereNotNull('eta_date')
                    ->where('eta_date', '>=', $today)
                    ->get();

                foreach ($spks as $spk) {
                    $etaDate    = Carbon::parse($spk->eta_date)->startOfDay();
                    $diffInDays = (int) $today->diffInDays($etaDate, false);

                    if ($diffInDays < 0) continue;

                    foreach ($etaSettings as $setting) {
                        $daysBeforeArr = array_map('intval', $setting->days_before ?? []);
                        $matches = in_array($diffInDays, $daysBeforeArr);

                        if ($this->getOutput()->isVerbose()) {
                            $this->line("  [ETA] SPK={$spk->spk_code} diff={$diffInDays} days_before=[" . implode(',', $daysBeforeArr) . "] role={$setting->role_internal} match=" . ($matches ? 'YES' : 'no'));
                        }

                        if ($matches) {
                            $this->processReminder($spk, 'eta', $setting, $diffInDays, $today, null, null);
                        }
                    }
                }
            }

            // ── DEADLINE REMINDERS ─────────────────────────────────────────────
            if ($settings->has('deadline')) {
                $deadlineSettings = $settings['deadline'];

                $spks = Spk::with('sections')->get();

                foreach ($spks as $spk) {
                    // Group sections by deadline_date → one notification per unique date
                    $sectionsByDate = $spk->sections
                        ->filter(fn($s) => !empty($s->deadline_date))
                        ->groupBy(fn($s) => Carbon::parse($s->deadline_date)->toDateString());

                    foreach ($sectionsByDate as $dateStr => $sectionsForDate) {
                        $deadlineDate = Carbon::parse($dateStr)->startOfDay();
                        $diffInDays   = (int) $today->diffInDays($deadlineDate, false);

                        if ($diffInDays < 0) continue;

                        $sectionNames = $sectionsForDate->pluck('section_name')->unique()->values()->all();

                        foreach ($deadlineSettings as $setting) {
                            $daysBeforeArr = array_map('intval', $setting->days_before ?? []);
                            $matches = in_array($diffInDays, $daysBeforeArr);

                            if ($this->getOutput()->isVerbose()) {
                                $this->line("  [Deadline] SPK={$spk->spk_code} sections=[" . implode(', ', $sectionNames) . "] deadline={$dateStr} diff={$diffInDays} days_before=[" . implode(',', $daysBeforeArr) . "] role={$setting->role_internal} match=" . ($matches ? 'YES' : 'no'));
                            }

                            if ($matches) {
                                $this->processReminder($spk, 'deadline', $setting, $diffInDays, $today, $sectionNames, $dateStr);
                            }
                        }
                    }
                }
            }
        }

        $this->info('Reminders check completed.');
    }

    private function processReminder(
        $spk,
        string $type,
        $setting,
        int $daysBefore,
        Carbon $today,
        ?array $sectionNames,
        ?string $deadlineDateStr
    ): void {
        $idPerusahaan = $setting->id_perusahaan;
        $role         = $setting->role_internal;

        // No new column needed: two deadline groups on the same SPK always have
        // different diff_days values on the same sent_date (since they'd need the
        // same deadline_date to collide, which means they're already grouped).
        $logExists = NotificationReminderLog::where('id_perusahaan', $idPerusahaan)
            ->where('id_spk', $spk->id)
            ->where('reminder_type', $type)
            ->where('role_internal', $role)
            ->where('days_before', $daysBefore)
            ->where('sent_date', $today)
            ->exists();

        if ($logExists) return;

        // ── Resolve target users ──────────────────────────────────────────────
        $targets = collect();

        if ($role === 'eksternal') {
            $targets = User::on('tako-user')
                ->where('role', 'eksternal')
                ->where('id_customer', $spk->id_customer)
                ->get();
        } elseif ($role === 'staff' && $spk->validated_by) {
            $pic = User::on('tako-user')->find($spk->validated_by);
            if ($pic) $targets->push($pic);
        } else {
            $targets = User::on('tako-user')
                ->where('role', 'internal')
                ->where('role_internal', $role)
                ->where('id_perusahaan', $idPerusahaan)
                ->get();
        }

        if ($targets->isEmpty()) return;

        // ── Build notification content ────────────────────────────────────────
        $eventKey = $type === 'eta' ? 'eta_reminder' : 'deadline_reminder';

        if ($type === 'deadline' && !empty($sectionNames)) {
            $count        = count($sectionNames);
            $sectionLabel = implode(', ', $sectionNames);
            $title   = "Reminder: Deadline {$count} Section" . ($count > 1 ? 's' : '');
            $message = "Batas waktu section {$sectionLabel} pada SPK {$spk->spk_code} tersisa {$daysBefore} hari (deadline: {$deadlineDateStr}).";
        } else {
            $title   = "Reminder: ETA Kapal";
            $message = "Kapal untuk SPK {$spk->spk_code} diperkirakan tiba dalam {$daysBefore} hari.";
        }

        // ── Send In-App Notification ──────────────────────────────────────────
        if ($setting->send_notification) {
            foreach ($targets as $target) {
                try {
                    NotificationService::send([
                        'send_to'    => $target->id_user,
                        'created_by' => null,
                        'role'       => $target->role,
                        'id_spk'     => $spk->id,
                        'data'       => [
                            'type'     => $eventKey,
                            'title'    => $title,
                            'message'  => $message,
                            'url'      => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code,
                        ],
                    ]);
                } catch (\Exception $e) {
                    Log::error("[Reminder] Gagal kirim notifikasi: " . $e->getMessage());
                }
            }
        }

        // ── Send Email ────────────────────────────────────────────────────────
        if ($setting->send_email) {
            foreach ($targets as $target) {
                if (empty($target->email)) continue;
                try {
                    Mail::to($target->email)->queue(
                        new ReminderMail(
                            spk:           $spk,
                            reminderType:  $type,
                            title:         $title,
                            message:       $message,
                            daysBefore:    $daysBefore,
                            deadlineDate:  $deadlineDateStr,
                            sectionNames:  $sectionNames ?? [],
                        )
                    );
                    if ($this->getOutput()->isVerbose()) {
                        $this->line("  → Email queued to {$target->email}");
                    }
                } catch (\Exception $e) {
                    Log::error("[Reminder] Gagal queue email ke {$target->email}: " . $e->getMessage());
                }
            }
        }

        // ── Dedup log ─────────────────────────────────────────────────────────
        NotificationReminderLog::create([
            'id_perusahaan' => $idPerusahaan,
            'id_spk'        => $spk->id,
            'reminder_type' => $type,
            'role_internal' => $role,
            'days_before'   => $daysBefore,
            'sent_date'     => $today,
        ]);
    }
}
