<?php

namespace App\Http\Controllers;

use App\Models\Perusahaan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Database\Models\Domain;

class PerusahaanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        if (!$user->hasRole('admin')) {
            abort(403, 'Unauthorized access. Only admin can access this page.');
        }

        $perusahaans = Perusahaan::with(['user', 'users','tenant','tenant.domains'])->get();
        $users = User::select('id_user', 'name', 'id_perusahaan')->get();

        return Inertia::render('company/page', [
            'companies' => $perusahaans,
            'users' => $users,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
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
        $userFields = ['id_User', 'id_User_1', 'id_User_2', 'id_User_3'];

        foreach ($userFields as $field) {
            $value = $request->input($field);

            if ($value && !is_numeric($value)) {
                $user = User::where('name', $value)->first();
                
                if ($user) {
                    $request->merge([$field => $user->id]);
                } else {
                    $request->merge([$field => null]);
                }
            }
        }

        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'domain'          => 'required|string|max:255|unique:domains,domain',
            'id_User_1' => 'nullable|integer|exists:users,id', // manager
            'id_User_2' => 'nullable|integer|exists:users,id', // direktur
            'id_User_3' => 'nullable|integer|exists:users,id', // lawyer
            'id_User'   => 'nullable|integer|exists:users,id', // user

            'notify_1' => 'nullable|string',
            'notify_2' => 'nullable|string',

            'company_logo' => 'nullable|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        $tenantId = Str::slug($validated['nama_perusahaan']);

        if (Tenant::where('id', $tenantId)->exists()) {
            return back()->withErrors(['error' => "ID Perusahaan '$tenantId' sudah ada."]);
        }

            $perusahaan = DB::connection('tako-user')->transaction(function () use ($request, $validated) {
                $logoPath = $request->hasFile('company_logo') 
                    ? $request->file('company_logo')->store('company_logo', 'public') 
                    : null;

                return Perusahaan::create([
                    'nama_perusahaan'   => $validated['nama_perusahaan'],
                    'notify_1'          => $validated['notify_1'] ?? null,
                    'notify_2'          => $validated['notify_2'] ?? null,
                    'path_company_logo' => $logoPath,
                ]);
            });

            $tenant = Tenant::create([
                'id'            => $tenantId, 
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);

            $appDomain = preg_replace('#^https?://#', '', env('APP_DOMAIN', 'localhost'));
            $fullDomain = $validated['domain'] . '.' . $appDomain;

            $domainRecord = $tenant->domains()->create([
                'domain' => $fullDomain,
            ]);

            $perusahaan->update(['id_domain' => $domainRecord->id]);

            $rolesMap = [
                $validated['id_User_1'] ?? null => 'staff',
                $validated['id_User_2'] ?? null => 'manager',
                $validated['id_User_3'] ?? null => 'supervisor',
                $validated['id_User']   ?? null => 'user',
            ];

            foreach ($rolesMap as $fieldName => $roleName) {
            // Ambil ID dari request yang sudah kita bersihkan di atas
            $userId = $request->input($fieldName); 

            if ($userId) {
                // Hubungkan di tabel pivot
                $perusahaan->users()->attach($userId, ['role' => $roleName]);

                // Update id_perusahaan di tabel users
                User::where('id', $userId)->update([
                    'id_perusahaan' => $perusahaan->id_perusahaan
                ]);
            }
        }

        return back()->with('success', "Tenant {$tenantId} dan Database berhasil dibuat.");
    }

    /**
     * Display the specified resource.
     */
    public function show(Perusahaan $perusahaan)
    {
        return response()->json([
            'data' => $perusahaan->load(['user', 'users']),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Perusahaan $perusahaan)
    {
        return response()->json([
            'data' => $perusahaan->load('users'),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Perusahaan $perusahaan)
    {
        // 1. PRE-PROCESSING: Ubah Nama (Don 5) menjadi ID (Angka) sebelum validasi
        $userFields = ['id_User', 'id_User_1', 'id_User_2', 'id_User_3'];
        foreach ($userFields as $field) {
            $value = $request->input($field);
            
            if ($value === 'undefined' || $value === '' || $value === null) {
                $request->merge([$field => null]);
                continue;
            }

            // Jika value bukan angka murni (seperti "Don 5"), cari di DB
           if (!is_numeric($value)) {
                $user = User::where('name', $value)->first();
                if ($user) {
                    // Ambil id_user sesuai primary key di model, bukan 'id'
                    $request->merge([$field => (int) $user->id_user]); 
                } else {
                    $request->merge([$field => null]);
                }
            }
        }

        // 2. VALIDASI
        $tenant = Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();
        $domainId = $tenant ? $tenant->domains()->first()?->id : null;

        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            // Tambahkan unique ignore untuk domain agar bisa simpan tanpa ganti domain
            'domain'          => 'required|string|max:255|unique:domains,domain,' . ($domainId ?? 'NULL'),

            // Gunakan numeric agar string angka dari FormData lolos
            'id_User'   => 'nullable|numeric|exists:tako-user.users,id_user',
            'id_User_1' => 'nullable|numeric|exists:tako-user.users,id_user',
            'id_User_2' => 'nullable|numeric|exists:tako-user.users,id_user',
            'id_User_3' => 'nullable|numeric|exists:tako-user.users,id_user',

            'notify_1' => 'nullable|string',
            'notify_2' => 'nullable|string',
            'company_logo' => 'nullable|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        // 3. UPDATE LOGO
        if ($request->hasFile('company_logo')) {
            if ($perusahaan->path_company_logo && Storage::disk('public')->exists($perusahaan->path_company_logo)) {
                Storage::disk('public')->delete($perusahaan->path_company_logo);
            }
            $perusahaan->path_company_logo = $request->file('company_logo')->store('company_logo', 'public');
        }

        // 4. UPDATE DATA PERUSAHAAN
        $perusahaan->update([
            'nama_perusahaan'   => $validated['nama_perusahaan'],
            'notify_1'          => $validated['notify_1'] ?? null,
            'notify_2'          => $validated['notify_2'] ?? null,
            'path_company_logo' => $perusahaan->path_company_logo,
        ]);

        // 5. UPDATE TENANT & DOMAIN
        if (!$tenant) {
            $tenant = Tenant::create([
                'id'            => Str::slug($validated['nama_perusahaan']),
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);
        }

        // Update Domain: Hapus yang lama, buat yang baru
        $tenant->domains()->delete();
        $tenant->domains()->create([
            'domain' => $validated['domain'],
        ]);

        // 6. SYNC USER ROLES & UPDATE TABLE USERS
        $syncData = [];
        $rolesMap = [
            'id_User'   => 'user',
            'id_User_1' => 'staff',
            'id_User_2' => 'manager',
            'id_User_3' => 'supervisor',
        ];

        // Bersihkan dulu id_perusahaan lama milik user yang sebelumnya terhubung dengan perusahaan ini
        User::where('id_perusahaan', $perusahaan->id_perusahaan)->update(['id_perusahaan' => null]);

        foreach ($rolesMap as $field => $roleName) {
            $userId = $request->input($field); 
            if ($userId) {
                $syncData[$userId] = ['role' => $roleName];
                User::where('id_user', $userId)->update(['id_perusahaan' => $perusahaan->id_perusahaan]);
            }
        }

        // Sinkronisasi ke tabel pivot (perusahaan_user_roles)
        $perusahaan->users()->sync($syncData);

        return back()->with('success', 'Perusahaan berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Perusahaan $perusahaan)
    {
        try {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();

            if ($tenant) {
                // 1. Ambil nama database transaksi menggunakan method yang ada di bootstrapper
                $transactionDbName = $tenant->getTransactionDatabaseName();

                // 2. Hapus database transaksi secara manual
                // Gunakan koneksi central agar bisa melakukan DROP
                DB::connection('tako-user')->statement("DROP DATABASE IF EXISTS \"{$transactionDbName}\"");

                // 3. Hapus Tenant (Ini akan menghapus DB utama tenant secara otomatis)
                $tenant->delete();
            }

            // 4. Hapus data perusahaan & logo
            $perusahaan->users()->detach();
            if ($perusahaan->path_company_logo) {
                Storage::disk('public')->delete($perusahaan->path_company_logo);
            }
            $perusahaan->delete();

            return redirect()->back()->with('success', 'Perusahaan dan semua database terkait berhasil dihapus.');

        } catch (\Exception $e) {
            \Log::error("Gagal hapus database transaksi: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menghapus database transaksi.');
        }
    }

    public function checkManagerExistence($idPerusahaan)
    {
        $perusahaan = Perusahaan::with(['users' => function ($query) {
            $query->wherePivot('role', 'manager');
        }])->find($idPerusahaan);

        return response()->json([
            'manager_exists' => $perusahaan && $perusahaan->users->isNotEmpty(),
        ]);
    }
}
