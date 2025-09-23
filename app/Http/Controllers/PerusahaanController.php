<?php

namespace App\Http\Controllers;

use App\Models\Perusahaan;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class PerusahaanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        // Hanya izinkan akses jika user memiliki role 'admin'
        if (!$user->hasRole('admin')) {
            abort(403, 'Unauthorized access. Only admin can access this page.');
        }

        $perusahaans = Perusahaan::with(['user', 'users'])->get();
        $users = User::select('id', 'name')->get();

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
            'id_User_1' => 'nullable|integer|exists:users,id',
            'id_User_2' => 'nullable|integer|exists:users,id',
            'id_User_3' => 'nullable|integer|exists:users,id',
            'id_User' => 'nullable|integer|exists:users,id', // Validasi sudah ada, bagus!
            'notify_1' => 'nullable|string',
            'notify_2' => 'nullable|string',
        ]);

        // Ambil hanya field yang ada di tabel perusahaan
        $perusahaanData = collect($validated)->only([
            'nama_perusahaan',
            'notify_1',
            'notify_2'
        ])->toArray();

        // Buat perusahaan
        $perusahaan = Perusahaan::create($perusahaanData);

        // 👇 1. Tambahkan 'id_User' ke dalam array userRoles
        $userRoles = [
            $validated['id_User_1'] ?? null => 'manager',
            $validated['id_User_2'] ?? null => 'direktur',
            $validated['id_User_3'] ?? null => 'lawyer',
            $validated['id_User']   ?? null => 'user', // Tambahkan user/marketing di sini
        ];

        foreach ($userRoles as $userId => $role) {
            if ($userId) {
                // Gunakan attach pada relasi untuk memasukkan ke tabel pivot
                $perusahaan->users()->attach($userId, ['role' => $role]);

                 User::where('id', $userId)->update([
                'id_perusahaan' => $perusahaan->id
            ]);
            }
        }

        // 👇 2. Hapus blok 'creator' yang lama karena sudah ditangani di atas
        // if (!empty($validated['id_User'])) { ... }

        return back()->with('success', 'Perusahaan berhasil ditambahkan.');
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
        $validated = $request->validate([
            'nama_perusahaan' => 'required|string|max:255',
            'id_User'   => 'nullable|integer|exists:users,id',   // user/marketing
            'id_User_1' => 'nullable|integer|exists:users,id',   // manager
            'id_User_2' => 'nullable|integer|exists:users,id',   // direktur
            'id_User_3' => 'nullable|integer|exists:users,id',   // lawyer
            'notify_1'  => 'nullable|string',
            'notify_2'  => 'nullable|string',
        ]);

        // Update data perusahaan
        $perusahaan->update([
            'nama_perusahaan' => $validated['nama_perusahaan'],
            'notify_1'        => $validated['notify_1'] ?? null,
            'notify_2'        => $validated['notify_2'] ?? null,
        ]);

        // Siapkan sync role baru
        $syncData = [];

        if (!empty($validated['id_User'])) {
            $syncData[$validated['id_User']] = ['role' => 'user']; // atau 'creator' kalau memang pakai itu
        }
        if (!empty($validated['id_User_1'])) {
            $syncData[$validated['id_User_1']] = ['role' => 'manager'];
        }
        if (!empty($validated['id_User_2'])) {
            $syncData[$validated['id_User_2']] = ['role' => 'direktur'];
        }
        if (!empty($validated['id_User_3'])) {
            $syncData[$validated['id_User_3']] = ['role' => 'lawyer'];
        }

        // Sync ulang user-role (hapus yang lama & isi yang baru)
        $perusahaan->users()->sync($syncData);

        return redirect()
            ->back()
            ->with('success', 'Perusahaan berhasil diedit');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Perusahaan $perusahaan)
    {
        // Hapus relasi user-role terlebih dahulu
        $perusahaan->users()->detach();

        // Hapus data perusahaan
        $perusahaan->delete();

        // Kembalikan redirect dengan flash message agar Inertia bisa tangkap
        return redirect()
            ->back()
            ->with('success', 'Perusahaan berhasil dihapus');
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
