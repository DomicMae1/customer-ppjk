<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Perusahaan;
use App\Models\Role;
use App\Models\User;
use App\Services\RolePermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('view-user')) {
            abort(403);
        }

        $usersQuery = User::with(['role_internal', 'roles']);
        $companyQuery = Perusahaan::select(['id_perusahaan as id', 'nama_perusahaan']);

        if ($user->hasRole('admin')) {
            //
        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);
            $companyQuery->where('id_perusahaan', $user->id_perusahaan);
        } else {
            $usersQuery->where('id_perusahaan', $user->id_perusahaan);
            $companyQuery->where('id_perusahaan', $user->id_perusahaan);
        }

        $roles = Role::query()
            ->select(['id', 'name', 'role_type', 'id_perusahaan'])
            ->whereNotNull('id_perusahaan')
            ->whereIn('role_type', ['internal', 'eksternal'])
            ->when(!$user->hasRole('admin'), fn ($query) => $query->where('id_perusahaan', $user->id_perusahaan))
            ->orderBy('id_perusahaan')
            ->orderBy('role_type')
            ->orderBy('name')
            ->get();

        $users = $usersQuery->get();
        $perusahaan = $companyQuery->get();

        if ($user->hasRole('admin')) {
            $customers = Customer::select([
                'id_customer as id',
                'nama_perusahaan',
                'ownership',
            ])->get();
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

    public function create()
    {
        //
    }

    public function store(Request $request): RedirectResponse
    {
        $actor = Auth::user();

        if (!$actor->can('create-user')) {
            return back()->with('error', 'Anda tidak memiliki hak akses untuk membuat user.');
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['nullable', 'string'],
            'role_id' => ['nullable', 'integer'],
            'user_type' => ['required', 'string', 'max:255'],
            'id_perusahaan' => ['nullable', 'exists:perusahaan,id_perusahaan'],
            'id_customer' => ['nullable', 'exists:customers,id_customer'],
        ]);

        $userType = $request->user_type === 'external' ? 'eksternal' : $request->user_type;
        $companyId = $this->companyIdForUserPayload($request, $actor);
        $roleService = app(RolePermissionService::class);

        $roleInternal = null;
        $roleToAssign = null;

        if ($userType === 'internal') {
            $roleToAssign = $this->resolveScopedRole($request, $companyId, 'internal');
            $roleInternal = $roleToAssign->name;
        } elseif ($userType === 'eksternal') {
            $this->ensureCustomerBelongsToCompany($request->integer('id_customer'), $companyId);
            $roleToAssign = $roleService->findRoleForCompany('customer', $companyId);
        } else {
            throw ValidationException::withMessages([
                'user_type' => 'Tipe user tidak valid.',
            ]);
        }

        $newUser = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $userType,
            'role_internal' => $roleInternal,
            'id_perusahaan' => $companyId,
            'id_customer' => $userType === 'eksternal' ? $request->integer('id_customer') : null,
        ]);

        if ($roleToAssign) {
            $roleService->assignRoleModelToUser($newUser, $roleToAssign);
        }

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function show(User $user)
    {
        //
    }

    public function edit(User $user)
    {
        //
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $actor = Auth::user();

        if (!$actor->hasPermissionTo('update-user')) {
            abort(403);
        }

        $this->authorizeUserCompanyAccess($actor, $user);

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email,' . $user->id_user . ',id_user'],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role_internal' => ['nullable', 'string'],
            'role_id' => ['nullable', 'integer'],
        ]);

        try {
            $data = [
                'name' => $request->name,
                'email' => $request->email,
            ];

            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $roleToAssign = null;

            if ($user->role === 'internal' && $user->role_internal !== 'admin' && $user->id_perusahaan) {
                $roleToAssign = $this->resolveScopedRole($request, (int) $user->id_perusahaan, 'internal');
                $data['role_internal'] = $roleToAssign->name;
            }

            $user->update($data);

            if ($roleToAssign) {
                app(RolePermissionService::class)->assignRoleModelToUser($user, $roleToAssign);
            }

            return redirect()->route('users.index')->with('success', 'User updated successfully.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }

    public function destroy(User $user)
    {
        $me = Auth::user();

        if (!$me->hasPermissionTo('delete-user')) {
            abort(403);
        }

        $this->authorizeUserCompanyAccess($me, $user);

        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }

    private function companyIdForUserPayload(Request $request, User $actor): int
    {
        $companyId = $actor->hasRole('admin')
            ? $request->integer('id_perusahaan')
            : (int) $actor->id_perusahaan;

        if (!$companyId) {
            throw ValidationException::withMessages([
                'id_perusahaan' => 'Perusahaan wajib dipilih.',
            ]);
        }

        if (!Perusahaan::whereKey($companyId)->exists()) {
            throw ValidationException::withMessages([
                'id_perusahaan' => 'Perusahaan tidak ditemukan.',
            ]);
        }

        return $companyId;
    }

    private function resolveScopedRole(Request $request, int $companyId, string $roleType): Role
    {
        $roleService = app(RolePermissionService::class);
        $role = null;

        if ($request->integer('role_id')) {
            $role = $roleService->findRoleByIdForCompany($request->integer('role_id'), $companyId, $roleType);
        } elseif ($request->filled('role') || $request->filled('role_internal')) {
            $roleName = (string) ($request->input('role') ?: $request->input('role_internal'));
            $role = $roleService->findRoleForCompany($roleName, $companyId);

            if ($role && $role->role_type !== $roleType) {
                $role = null;
            }
        }

        if (!$role) {
            throw ValidationException::withMessages([
                'role_id' => 'Role tidak valid untuk perusahaan ini.',
            ]);
        }

        return $role;
    }

    private function ensureCustomerBelongsToCompany(?int $customerId, int $companyId): void
    {
        if (!$customerId) {
            throw ValidationException::withMessages([
                'id_customer' => 'Customer wajib dipilih.',
            ]);
        }

        $customer = Customer::whereKey($customerId)->first();

        if (!$customer || (int) $customer->ownership !== $companyId) {
            throw ValidationException::withMessages([
                'id_customer' => 'Customer tidak valid untuk perusahaan ini.',
            ]);
        }
    }

    private function authorizeUserCompanyAccess(User $actor, User $targetUser): void
    {
        if ($actor->hasRole('admin')) {
            return;
        }

        if ((int) $actor->id_perusahaan !== (int) $targetUser->id_perusahaan) {
            abort(403);
        }
    }
}
