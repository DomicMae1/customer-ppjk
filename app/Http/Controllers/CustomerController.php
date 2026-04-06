<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Perusahaan;


class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('view-customer')) {
            return redirect('/shipping')->with('error', 'Anda tidak memiliki akses ke halaman tersebut.');
        }

        // 1. Mulai Query dasar dengan relasi
        $query = Customer::with([
            'perusahaan',
        ]);

        // 2. LOGIC FILTER PERUSAHAAN (TENANCY)
        // Jika user terikat dengan perusahaan tertentu (bukan Super Admin Global)
        if ($user->id_perusahaan) {
            // Filter customer yang 'ownership'-nya sama dengan perusahaan user
            $query->where('ownership', $user->id_perusahaan);
        }

        // 3. Urutkan dan Ambil data
        // (Jika user tidak punya id_perusahaan/Super Admin, dia akan melihat semua data)
        $customers = $query->latest()->get();

        return Inertia::render('m_customer/page', [
            'customers' => $customers,
            'perusahaan_list' => Perusahaan::select('id_perusahaan', 'nama_perusahaan')->get(),
            'company' => [
                'id' => session('company_id'),
                'name' => session('company_name'),
                'logo' => session('company_logo'),
            ],
            'trans_customer' => trans('customer'),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = auth('web')->user();
        // PENTING: Validasi terjadi SEBELUM Try-Catch.
        // Jika validasi gagal, Laravel akan melempar ValidationException dan kode di bawahnya TIDAK dijalankan.
        // Pastikan frontend Anda menangani error validasi (menampilkan pesan merah di form).
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'type'            => 'required|string|max:100', 
            'email'           => 'required|email|max:255',
            'nama'            => 'required|string|max:255', 
            'no_npwp'         => 'nullable|string|max:50',
            'no_npwp_16'      => 'nullable|string|max:50',
            'id_perusahaan'   => 'nullable|exists:perusahaan,id_perusahaan', 
        ]);

        DB::beginTransaction(); // Memulai Transaksi

        try {
            $roles = $user->getRoleNames();
            $ownership = null;

            if ($roles->contains('admin')) {
                $ownership = $request->id_perusahaan;
            } else{
                $ownership = $user->id_perusahaan;
            }
            
            Customer::create([
                'uid'             => (string) Str::uuid(), 
                'nama_perusahaan' => $validated['nama_perusahaan'],
                'type'            => $validated['type'],
                'email'           => $validated['email'],
                'nama'            => $validated['nama'],
                'no_npwp'         => $validated['no_npwp'] ?? null,
                'no_npwp_16'      => $validated['no_npwp_16'] ?? null,
                'ownership'       => $ownership, 
                'created_by'      => $user->id_user,
            ]);

            // --- PERBAIKAN UTAMA DI SINI ---
            DB::commit(); // Simpan perubahan permanen ke database
            // -------------------------------

            // Gunakan to_route / redirect untuk SPA experience yang lebih mulus dibanding Inertia::location
            return to_route('customer.index')->with('success', 'Data Customer berhasil ditambahkan!');

        } catch (\Throwable $th) {
            DB::rollBack(); // Batalkan perubahan jika ada error
            Log::error("Error Store Customer: " . $th->getMessage());
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        // Validasi Update
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'type'            => 'required|string|max:100',
            'email'           => 'required|email|max:255',
            'nama'            => 'required|string|max:255',
            'no_npwp'         => 'nullable|string|max:50',
            'no_npwp_16'      => 'nullable|string|max:50',
            'id_perusahaan'   => 'nullable|numeric',
        ]);

        try {
            DB::beginTransaction();

            $user = auth('web')->user();
            $roles = $user->getRoleNames();
            $ownership = $customer->ownership;

            if ($roles->contains('admin')) {
                $ownership = $validated['id_perusahaan'] ?? $customer->ownership;
            } else {
                $ownership = $user->id_perusahaan;
            }

            $customer->update([
                'nama_perusahaan' => $validated['nama_perusahaan'],
                'type'            => $validated['type'],
                'email'           => $validated['email'],
                'nama'            => $validated['nama'],
                'no_npwp'         => $validated['no_npwp'] ?? null,
                'no_npwp_16'      => $validated['no_npwp_16'] ?? null,
                'ownership'       => $ownership,
            ]);

            DB::commit();

            return redirect()->route('customer.index')->with('success', 'Data Customer berhasil diperbarui!');

        } catch (\Throwable $th) {
            DB::rollBack();
            Log::error("Error Update Customer: " . $th->getMessage());
            return redirect()->back()->withErrors(['error' => 'Gagal update: ' . $th->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);

        try {
            DB::beginTransaction();

            $customer->delete();

            DB::commit();

            return redirect()->route('customer.index')
                ->with('success', 'Data Customer berhasil dihapus!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error Delete Customer: " . $e->getMessage());
            
            return redirect()->route('customer.index')
                ->with('error', 'Gagal menghapus data: ' . $e->getMessage());
        }
    }
}
