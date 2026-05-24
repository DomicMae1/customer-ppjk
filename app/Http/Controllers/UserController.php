<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Perusahaan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Validation\Rules;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('view-user')) {
            abort(403);
        }

        $usersQuery = User::with(['role_internal', 'roles']);
    
        $companyQuery = Perusahaan::select(['id_perusahaan as id', 'nama_perusahaan']);

        if ($user->hasRole('admin')) {
            
        } 
        elseif ($user->hasRole(['manager', 'supervisor'])) {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);

            $companyQuery->where('id_perusahaan', $user->id_perusahaan);
        }
        else {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);
        }

        $users = $usersQuery->get();

        $roles = Role::all(['id', 'name', 'role_type']);
            
        $perusahaan = $companyQuery->get();
        
        if ($user->hasRole('admin')) {
            $customers = Customer::select([
                    'id_customer as id',
                    'nama_perusahaan',
                    'ownership',
                ])
                ->get();
        } else {
            $customers = Customer::select([
                    'id_customer as id',
                    'nama_perusahaan',
                    'ownership',
                ])
                ->where('ownership', $user->id_perusahaan)
                ->get();
        }

        return Inertia::render('auth/page', [
            'users' => $users,
            'roles' => $roles,
            'companies' => $perusahaan,
            'customers' => $customers,
            'isAdmin' => $user->hasRole('admin'),
            'authCompanyId' => $user->id_perusahaan,
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
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('create-user')) {
            return back()->with('error', 'Anda tidak memiliki hak akses untuk membuat user.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|string|exists:roles,name', 
            'user_type' => 'required|string|max:255',
            'id_perusahaan' => 'nullable|exists:perusahaan,id_perusahaan',
            'id_customer' => 'nullable|exists:customers,id_customer',
        ]);

        // 1. Normalisasi 'role' (User Type)
        $userType = $request->user_type;
        if ($userType === 'external') {
            $userType = 'eksternal'; // Ubah ke Bahasa Indonesia sesuai Constraint Database
        }

        // 2. Tentukan Logic role_internal
        $roleInternal = null;
        if ($userType === 'internal') {
            $roleInternal = $request->role; 
        }
        // Jika eksternal, $roleInternal tetap null (sesuai aturan database)

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            
            // --- PERBAIKAN DISINI ---
            // Gunanakan variabel yang sudah diolah ($userType), JANGAN $request->user_type
            'role' => $userType, 
            
            // Gunakan variabel yang sudah diolah ($roleInternal), JANGAN $request->role
            'role_internal' => $roleInternal, 
            
            'id_perusahaan' => $request->id_perusahaan,
            'id_customer' => $request->id_customer,
        ]);

        // 4. Assign Role Spatie
        $user->assignRole($request->role);

        return redirect()->back()->with('success', 'User created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
   public function update(Request $request, User $user): RedirectResponse
    {
        // 1. Cek permission menggunakan user yang sedang LOGIN
        if (!auth()->user()->hasPermissionTo('update-user')) {
            abort(403);
        }

        // 2. Validasi (Gunakan $user->id_user dari parameter route untuk exception unique)
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email,' . $user->id_user . ',id_user',
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role_internal' => 'nullable|exists:roles,name', 
        ]);

        try {
            $data = [
                'name' => $request->name,
                'email' => $request->email,
            ];

            // 3. Update Password jika diisi
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            // 4. Update Role untuk si TARGET user
            if ($user->role === 'internal') {
                if ($request->filled('role_internal')) {
                    $data['role_internal'] = $request->role_internal;
                    
                    // Sinkronisasi role spatie ke user yang sedang diedit
                    $user->syncRoles($request->role_internal);
                }
            } 

            // 5. Eksekusi update ke user yang dituju
            $user->update($data);

            return redirect()->back()->with('success', 'User updated successfully.');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        // Ambil user yang sedang login untuk cek permission
        $me = Auth::user();

        if (!$me->hasPermissionTo('delete-user')) {
            abort(403);
        }
        $user->delete(); 
        
        return redirect()->back()->with('success', 'User deleted successfully.');
    }
}
