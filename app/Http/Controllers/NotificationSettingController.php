<?php

namespace App\Http\Controllers;

use App\Models\NotificationChannelSetting;
use App\Models\NotificationReminderSetting;
use App\Models\Perusahaan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class NotificationSettingController extends Controller
{
    /**
     * Display the notification settings page.
     */
    public function index()
    {
        $user = auth('web')->user();

        // Only admin can access this page
        if (!$user->hasRole('admin')) {
            abort(403, 'Unauthorized access. Only admin can access this page.');
        }

        // Fetch all companies for the dropdown
        $companies = Perusahaan::select('id_perusahaan', 'nama_perusahaan')->orderBy('nama_perusahaan')->get();

        // Fetch unique internal role names and append 'eksternal'
        $internalRoles = \App\Models\Role::where('role_type', 'internal')
            ->whereNotNull('id_perusahaan')
            ->select('name')
            ->distinct()
            ->orderBy('name')
            ->pluck('name')
            ->toArray();
        $roles = array_merge($internalRoles, ['eksternal']);

        return Inertia::render('notification_settings/page', [
            'companies' => $companies,
            'roles' => $roles,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Fetch settings for a specific company
     */
    public function getSettings($idPerusahaan)
    {
        $user = auth('web')->user();

        if (!$user->hasRole('admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $channelSettings = NotificationChannelSetting::where('id_perusahaan', $idPerusahaan)->get();
        $reminderSettings = NotificationReminderSetting::where('id_perusahaan', $idPerusahaan)->get();

        return response()->json([
            'channelSettings' => $channelSettings,
            'reminderSettings' => $reminderSettings,
        ]);
    }

    /**
     * Update or create a channel setting.
     */
    public function upsertChannel(Request $request)
    {
        $user = auth('web')->user();

        if (!$user->hasRole('admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'id_perusahaan' => 'required|integer',
            'role_internal' => 'required|string',
            'event_type' => 'required|string',
            'send_email' => 'required|boolean',
            'send_notification' => 'required|boolean',
        ]);

        NotificationChannelSetting::updateOrCreate(
            [
                'id_perusahaan' => $validated['id_perusahaan'],
                'role_internal' => $validated['role_internal'],
                'event_type' => $validated['event_type'],
            ],
            [
                'send_email' => $validated['send_email'],
                'send_notification' => $validated['send_notification'],
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Update or create a reminder setting.
     */
    public function upsertReminder(Request $request)
    {
        $user = auth('web')->user();

        if (!$user->hasRole('admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'id_perusahaan' => 'required|integer',
            'reminder_type' => 'required|string|in:deadline,eta',
            'role_internal' => 'required|string',
            'days_before' => 'nullable|array',
            'send_email' => 'required|boolean',
            'send_notification' => 'required|boolean',
            'is_active' => 'required|boolean',
        ]);

        NotificationReminderSetting::updateOrCreate(
            [
                'id_perusahaan' => $validated['id_perusahaan'],
                'reminder_type' => $validated['reminder_type'],
                'role_internal' => $validated['role_internal'],
            ],
            [
                'days_before' => $validated['days_before'] ?? [],
                'send_email' => $validated['send_email'],
                'send_notification' => $validated['send_notification'],
                'is_active' => $validated['is_active'],
            ]
        );

        return response()->json(['success' => true]);
    }
}
