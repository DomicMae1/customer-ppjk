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
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'domain'          => 'required|string|max:255|unique:domains,domain',
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
        // 1. VALIDASI
        $tenant = Tenant::where('perusahaan_id', $perusahaan->id_perusahaan)->first();
        $domainId = $tenant ? $tenant->domains()->first()?->id : null;

        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'domain'          => 'required|string|max:255|unique:domains,domain,' . ($domainId ?? 'NULL'),
            'company_logo'    => 'nullable|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        // 2. UPDATE LOGO
        if ($request->hasFile('company_logo')) {
            if ($perusahaan->path_company_logo && Storage::disk('public')->exists($perusahaan->path_company_logo)) {
                Storage::disk('public')->delete($perusahaan->path_company_logo);
            }
            $perusahaan->path_company_logo = $request->file('company_logo')->store('company_logo', 'public');
        }

        // 3. UPDATE DATA PERUSAHAAN
        $perusahaan->update([
            'nama_perusahaan'   => $validated['nama_perusahaan'],
            'path_company_logo' => $perusahaan->path_company_logo,
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
        $tenant->domains()->create([
            'domain' => $validated['domain'],
        ]);

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
