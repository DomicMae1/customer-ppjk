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
use App\Services\RolePermissionService;
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
        $perusahaans->transform(function ($company) {
            // Ambil domain pertama dari tenant
            $domainRecord = $company->tenant->domains->first() ?? null;
            
            $logoPath = $domainRecord ? $domainRecord->path_company_logo : null;

            if ($logoPath) {
                // Kita gunakan helper asset() atau Storage::url() agar URL-nya benar
                // Hasilnya: http://domain-anda.com/storage/company_logo/xxx.jpg
                $company->path_company_logo = asset('storage/' . $logoPath);
            } else {
                $company->path_company_logo = null;
            }

            return $company;
        });

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
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'domain'          => 'required|string|max:255|unique:domains,domain',
            'company_logo' => 'nullable|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        $tenantId = Str::slug($validated['nama_perusahaan']);

        if (Tenant::where('id', $tenantId)->exists()) {
            return back()->withErrors(['error' => "ID Perusahaan '$tenantId' sudah ada."]);
        }

        $logoPath = $request->hasFile('company_logo') 
                ? $request->file('company_logo')->store('company_logo', 'public') 
                : null;

        try {
            // 2. Buat Data Perusahaan (Gunakan DB::transaction HANYA untuk tabel reguler)
            // Jika Tenant::create memicu pembuatan database, jangan masukkan ke dalam DB::transaction
            $perusahaan = Perusahaan::create([
                'nama_perusahaan' => $validated['nama_perusahaan'],
            ]);

            // 3. Buat Tenant (Ini yang biasanya memicu CREATE DATABASE secara otomatis)
            $tenant = Tenant::create([
                'id'            => $tenantId, 
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);

            // 4. Buat Domain & Masukkan Logo
            $appDomain = preg_replace('#^https?://#', '', env('APP_DOMAIN', 'localhost'));
            $fullDomain = $validated['domain'] . '.' . $appDomain;

            $domainRecord = $tenant->domains()->create([
                'domain'            => $fullDomain,
                'path_company_logo' => $logoPath,
            ]);

            // 5. Update relasi id_domain di tabel perusahaan
            $perusahaan->update(['id_domain' => $domainRecord->id]);
            app(RolePermissionService::class)->ensureCompanyRoles((int) $perusahaan->id_perusahaan);

            return back()->with('success', "Perusahaan {$validated['nama_perusahaan']} berhasil dibuat.");

        } catch (\Exception $e) {
            // Jika gagal, hapus file yang sudah terlanjur diupload
            if ($logoPath && Storage::disk('public')->exists($logoPath)) {
                Storage::disk('public')->delete($logoPath);
            }
            
            // Log error untuk debug
            \Log::error("Gagal membuat perusahaan: " . $e->getMessage());

            return back()->withErrors(['error' => "Terjadi kesalahan: " . $e->getMessage()]);
        }
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
        // 1. VALIDASI
        $tenant = Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();
        $currentDomain = $tenant ? $tenant->domains()->first() : null;
        $domainId = $currentDomain ? $currentDomain->id : null;

        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'domain'          => 'required|string|max:255|unique:domains,domain,' . ($domainId ?? 'NULL'),
            'company_logo'    => 'nullable|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        $path = $currentDomain ? $currentDomain->path_company_logo : null;

        // 2. UPDATE LOGO
        if ($request->hasFile('company_logo')) {
            // Hapus file fisik lama jika ada di storage
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
            // Simpan file baru ke storage dan update variabel path
            $path = $request->file('company_logo')->store('company_logo', 'public');
        }

        // 4. UPDATE DATA PERUSAHAAN (Hanya nama, karena kolom logo tidak ada di sini)
        $perusahaan->update([
            'nama_perusahaan' => $validated['nama_perusahaan'],
        ]);

        // 4. UPDATE TENANT & DOMAIN
        if (!$tenant) {
            $tenant = Tenant::create([
                'id'            => Str::slug($validated['nama_perusahaan']),
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);
        }

        // Update Domain: Hapus yang lama, buat yang baru
        $tenant->domains()->delete();
        $newDomain = $tenant->domains()->create([
            'domain'            => $validated['domain'],
            'path_company_logo' => $path, // Simpan ke kolom di tabel domains
        ]);

        // Opsional: Update id_domain di tabel perusahaan jika Anda ingin menjaga relasi langsung
        $perusahaan->update(['id_domain' => $newDomain->id]);

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
