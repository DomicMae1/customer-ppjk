<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Perusahaan;
use App\Models\User;
use App\Services\AdminCompanyContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth('web')->user();

        if (! $user->hasPermissionTo('view-customer')) {
            abort(403);
        }

        // 1. Mulai Query dasar dengan relasi
        $query = Customer::with('perusahaan');

        $selectedCompanyId = $this->selectedCompanyId($user);

        if ($selectedCompanyId) {
            $query->where('ownership', $selectedCompanyId);
        }

        // 3. Urutkan dan Ambil data
        $customers = $query->orderBy('id_customer', 'asc')->get();

        return Inertia::render('m_customer/page', [
            'customers' => $customers,
            'perusahaan_list' => Perusahaan::select('id_perusahaan', 'nama_perusahaan')
                ->when($selectedCompanyId, fn ($query) => $query->where('id_perusahaan', $selectedCompanyId))
                ->get(),
            'selectedCompanyId' => $selectedCompanyId,
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
            'type' => 'required|string|max:100',
            'email_to' => 'required|array|min:1',
            'email_to.*' => 'email|max:255',
            'email_cc' => 'nullable|array',
            'email_cc.*' => 'email|max:255',
            'nama' => 'required|string|max:255',
            'no_npwp' => 'nullable|string|max:50',
            'no_npwp_16' => 'nullable|string|max:50',
            'nib' => 'nullable|string|max:32',
            'alamat_lengkap' => 'nullable|string|max:1000',
            'id_perusahaan' => 'nullable|exists:perusahaan,id_perusahaan',
        ]);

        DB::beginTransaction(); // Memulai Transaksi

        try {
            $roles = $user->getRoleNames();
            if ($roles->contains('admin')) {
                $selectedCompanyId = $this->selectedCompanyId($user);
                $requestedCompanyId = $request->integer('id_perusahaan') ?: null;

                if ($selectedCompanyId && $requestedCompanyId && $requestedCompanyId !== $selectedCompanyId) {
                    throw ValidationException::withMessages([
                        'id_perusahaan' => 'Perusahaan tidak sesuai dengan pilihan header.',
                    ]);
                }

                $ownership = $requestedCompanyId ?: $selectedCompanyId;
            } else {
                $ownership = (int) $user->id_perusahaan;
            }

            if (! $ownership) {
                throw ValidationException::withMessages([
                    'id_perusahaan' => 'Perusahaan wajib dipilih.',
                ]);
            }

            Customer::create([
                'uid' => (string) Str::uuid(),
                'nama_perusahaan' => $validated['nama_perusahaan'],
                'type' => $validated['type'],
                'email_to' => $validated['email_to'],
                'email_cc' => $validated['email_cc'] ?? [],
                'nama' => $validated['nama'],
                'no_npwp' => $validated['no_npwp'] ?? null,
                'no_npwp_16' => $validated['no_npwp_16'] ?? null,
                'nib' => $this->digitsOnly($validated['nib'] ?? null) ?: null,
                'alamat_lengkap' => trim((string) ($validated['alamat_lengkap'] ?? '')) ?: null,
                'ownership' => $ownership,
                'created_by' => $user->id_user,
            ]);

            // --- PERBAIKAN UTAMA DI SINI ---
            DB::commit(); // Simpan perubahan permanen ke database
            // -------------------------------

            // Gunakan to_route / redirect untuk SPA experience yang lebih mulus dibanding Inertia::location
            return to_route('customer.index')->with('success', 'Data Customer berhasil ditambahkan!');

        } catch (ValidationException $th) {
            DB::rollBack();
            throw $th;
        } catch (\Throwable $th) {
            DB::rollBack(); // Batalkan perubahan jika ada error
            Log::error('Error Store Customer: '.$th->getMessage());

            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: '.$th->getMessage()]);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        $user = auth('web')->user();
        $this->authorizeCustomerScope($user, $customer);

        // Validasi Update
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'email_to' => 'required|array|min:1',
            'email_to.*' => 'email|max:255',
            'email_cc' => 'nullable|array',
            'email_cc.*' => 'email|max:255',
            'nama' => 'required|string|max:255',
            'no_npwp' => 'nullable|string|max:50',
            'no_npwp_16' => 'nullable|string|max:50',
            'nib' => 'nullable|string|max:32',
            'alamat_lengkap' => 'nullable|string|max:1000',
            'id_perusahaan' => 'nullable|exists:perusahaan,id_perusahaan',
        ]);

        try {
            DB::beginTransaction();

            $roles = $user->getRoleNames();
            $ownership = $customer->ownership;

            if ($roles->contains('admin')) {
                $selectedCompanyId = $this->selectedCompanyId($user);
                $requestedCompanyId = isset($validated['id_perusahaan']) ? (int) $validated['id_perusahaan'] : null;

                if ($selectedCompanyId && $requestedCompanyId && $requestedCompanyId !== $selectedCompanyId) {
                    throw ValidationException::withMessages([
                        'id_perusahaan' => 'Perusahaan tidak sesuai dengan pilihan header.',
                    ]);
                }

                $ownership = $requestedCompanyId ?: $selectedCompanyId ?: $customer->ownership;
            } else {
                $ownership = $user->id_perusahaan;
            }

            $customer->update([
                'nama_perusahaan' => $validated['nama_perusahaan'],
                'type' => $validated['type'],
                'email_to' => $validated['email_to'],
                'email_cc' => $validated['email_cc'] ?? [],
                'nama' => $validated['nama'],
                'no_npwp' => $validated['no_npwp'] ?? null,
                'no_npwp_16' => $validated['no_npwp_16'] ?? null,
                'nib' => $this->digitsOnly($validated['nib'] ?? null) ?: null,
                'alamat_lengkap' => trim((string) ($validated['alamat_lengkap'] ?? '')) ?: null,
                'ownership' => $ownership,
            ]);

            DB::commit();

            return redirect()->route('customer.index')->with('success', 'Data Customer berhasil diperbarui!');

        } catch (ValidationException $th) {
            DB::rollBack();
            throw $th;
        } catch (\Throwable $th) {
            DB::rollBack();
            Log::error('Error Update Customer: '.$th->getMessage());

            return redirect()->back()->withErrors(['error' => 'Gagal update: '.$th->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $user = auth('web')->user();
        $this->authorizeCustomerScope($user, $customer);

        try {
            DB::beginTransaction();

            $customer->delete();

            DB::commit();

            return redirect()->route('customer.index')
                ->with('success', 'Data Customer berhasil dihapus!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error Delete Customer: '.$e->getMessage());

            return redirect()->route('customer.index')
                ->with('error', 'Gagal menghapus data: '.$e->getMessage());
        }
    }

    public function getEmails($id)
    {
        $customer = Customer::findOrFail($id);
        $user = auth('web')->user();
        $this->authorizeCustomerScope($user, $customer);

        return response()->json([
            'email_to' => $customer->email_to ?? [],
            'email_cc' => $customer->email_cc ?? [],
        ]);
    }

    private function digitsOnly(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value);
    }

    private function selectedCompanyId(User $user): ?int
    {
        if ($user->hasRole('admin')) {
            return app(AdminCompanyContextService::class)->selectedCompanyIdForUser($user);
        }

        if ($user->id_perusahaan) {
            return (int) $user->id_perusahaan;
        }

        if ($user->id_customer) {
            $ownership = Customer::whereKey($user->id_customer)->value('ownership');

            return $ownership ? (int) $ownership : null;
        }

        return null;
    }

    private function authorizeCustomerScope(User $user, Customer $customer): void
    {
        $selectedCompanyId = $this->selectedCompanyId($user);

        if ($selectedCompanyId && (int) $customer->ownership !== $selectedCompanyId) {
            abort(404);
        }
    }
}
