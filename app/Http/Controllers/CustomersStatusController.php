<?php

namespace App\Http\Controllers;

use App\Models\Customers_Status;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;


class CustomersStatusController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $customerId = $request->query('customer_id');

        if (!$customerId) {
            return response()->json(['error' => 'Customer ID is required.'], 400);
        }

        $status = Customers_Status::with([
            'user',
            'status1Approver',
            'status2Approver',
            'status3Approver',
        ])->where('id_Customer', $customerId)->first();

        if (!$status) {
            return response()->json(['message' => 'Status belum tersedia.'], 404);
        }

        $statusData = $status->toArray();
        $statusData['nama_user'] = $status->user?->name ?? null;
        $statusData['status_1_by_name'] = $status->status1Approver?->name ?? null;
        $statusData['status_2_by_name'] = $status->status2Approver?->name ?? null;
        $statusData['status_3_by_name'] = $status->status3Approver?->name ?? null;

        return response()->json($statusData);
    }


    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Customers_Status $customers_Status)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customers_Status $customers_Status)
    {
        //
    }

    public function submit(Request $request)
    {
        // dd($request);

        $request->validate([
            'customer_id' => 'required|exists:customers_statuses,id_Customer',
            'keterangan' => 'nullable|string',
            'attach' => 'nullable|file|mimes:pdf|max:5120', // max 5MB
        ]);


        $status = Customers_Status::where('id_Customer', $request->customer_id)->first();

        if (!$status) {
            return back()->with('error', 'Data status customer tidak ditemukan.');
        }

        $user = Auth::user();
        $userId = $user->id;
        $role = $user->getRoleNames()->first(); // Ambil role pertama user

        $now = Carbon::now();
        $nama = $user->name;

        // Handle attachment
        $filename = null;
        if ($request->hasFile('attach')) {
            $file = $request->file('attach');
            $filename = uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('attachments', $filename, 'public');
        }

        switch ($role) {
            case 'user':
                $status->submit_1_timestamps = $now;
                if ($filename) {
                    $status->submit_1_nama_file = $filename;
                    $status->submit_1_path = $path;
                }
                break;

            case 'manager':
                // 🔍 Cek apakah sudah pernah disubmit
                if ($status->status_1_by || $status->status_1_timestamps) {
                    return back()->with('error', 'Data sudah pernah disubmit oleh manager.');
                }

                $status->status_1_by = $userId;
                $status->status_1_timestamps = $now;
                $status->status_1_keterangan = $request->keterangan;
                if ($filename) {
                    $status->status_1_attach = $filename;
                }
                break;

            case 'direktur':
                $status->status_2_by = $userId;
                $status->status_2_timestamps = $now;
                $status->status_2_keterangan = $request->keterangan;
                if ($filename) {
                    $status->status_2_attach = $filename;
                }
                break;

            case 'lawyer':
                $status->status_3_by = $userId;
                $status->status_3_timestamps = $now;
                $status->status_3_keterangan = $request->keterangan;
                if ($filename) {
                    $status->submit_3_attach = $filename;
                }
                break;

            default:
                return back()->with('error', 'Role tidak dikenali.');
        }

        // ✅ Logging untuk audit trail
        Log::info("Submit oleh {$nama} ({$role})", [
            'customer_id' => $request->customer_id,
            'timestamp' => $now->toDateTimeString(),
            'keterangan' => $request->keterangan,
            'attachment' => $filename
        ]);

        $status->save();

        return back()->with('success', 'Data berhasil disubmit.');
    }
}
