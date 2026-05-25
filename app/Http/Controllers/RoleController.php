<?php

namespace App\Http\Controllers;

use App\Models\Perusahaan;
use App\Models\Permission;
use App\Models\Role;
use App\Services\AdminCompanyContextService;
use App\Services\RolePermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->can('view-role')) {
            abort(403, 'Unauthorized access. You do not have permission to view roles.');
        }

        $isAdmin = $user->hasRole('admin');
        $selectedCompanyId = $isAdmin
            ? app(AdminCompanyContextService::class)->selectedCompanyIdForUser($user)
            : ($user->id_perusahaan ? (int) $user->id_perusahaan : null);

        if ($selectedCompanyId !== null) {
            app(RolePermissionService::class)->ensureCompanyRoles($selectedCompanyId);

            $roles = Role::with('permissions')
                ->where('id_perusahaan', $selectedCompanyId)
                ->orderBy('role_type')
                ->orderBy('name')
                ->get();
        } else {
            $roles = collect();
        }

        $allPermissions = Permission::all()->sortBy(function ($perm) {
            $order = ['view' => 1, 'create' => 2, 'update' => 3, 'delete' => 4];
            $parts = explode('-', $perm->name);
            $action = $parts[0];
            return ($order[$action] ?? 99) . $perm->name;
        });

        $permissions = $allPermissions->groupBy(function ($permission) {
            $parts = explode('-', $permission->name, 2);
            return $parts[1] ?? 'other';
        })->map(function ($group) {
            return $group->pluck('name')->toArray();
        })->toArray();

        $trans_role = [
            'page_title_manage' => 'Role Management',
            'title_create_role' => 'Create New Role',
            'title_edit_role' => 'Edit Role Permissions',
            'label_role_name' => 'Role Name',
            'label_role_type' => 'Role Type',
            'label_permissions' => 'Assign Permissions',
            'label_select_all' => 'Select All Module',
            'placeholder_role_name' => 'e.g. Finance, Operation Manager',
            'btn_create' => 'Create Role',
            'btn_save_changes' => 'Save Changes',
            'btn_cancel' => 'Cancel',
            'title_delete' => 'Delete Role',
            'text_delete_confirm_role' => 'Are you sure? This action cannot be undone and may affect users assigned to this role.',
            'btn_delete' => 'Yes, Delete',
            'toast_create_success' => 'Role created successfully!',
            'toast_update_success' => 'Role updated successfully!',
            'toast_delete_success' => 'Role removed successfully!',
        ];

        return Inertia::render('role/page', [
            'roles' => $roles,
            'permissions' => $permissions,
            'selectedCompanyId' => $selectedCompanyId,
            'isAdmin' => $isAdmin,
            'trans_role' => $trans_role,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function create()
    {
        //
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('create-role')) {
            abort(403, 'Unauthorized access.');
        }

        $companyId = $this->companyIdForMutation($request);
        $this->authorizeCompanyAccess($companyId);

        $validated = $this->validateRolePayload($request);
        $this->ensureUniqueRoleName($validated['name'], $companyId);

        $role = Role::create([
            'id_perusahaan' => $companyId,
            'name' => $validated['name'],
            'role_type' => $validated['role_type'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        return redirect()
            ->route('role-manager.index')
            ->with('success', 'Role created successfully.');
    }

    public function show(Role $role)
    {
        //
    }

    public function edit(Role $role)
    {
        //
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('update-role')) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($id);

        if ($role->id_perusahaan === null) {
            abort(403, 'Global roles cannot be edited here.');
        }

        $companyId = (int) $role->id_perusahaan;
        $this->authorizeCompanyAccess($companyId);

        $validated = $this->validateRolePayload($request);
        $this->ensureUniqueRoleName($validated['name'], $companyId, $role->id);

        $role->update([
            'name' => $validated['name'],
            'role_type' => $validated['role_type'],
        ]);
        $role->syncPermissions($validated['permissions'] ?? []);

        return redirect()
            ->route('role-manager.index')
            ->with('success', 'Role updated successfully.');
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('delete-role')) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($id);

        if ($role->id_perusahaan === null) {
            abort(403, 'Global roles cannot be deleted here.');
        }

        $companyId = (int) $role->id_perusahaan;
        $this->authorizeCompanyAccess($companyId);

        $role->delete();

        return redirect()
            ->route('role-manager.index')
            ->with('success', 'Role deleted successfully.');
    }

    private function companyIdForMutation(Request $request): int
    {
        $user = Auth::user();

        $companyId = $user->hasRole('admin')
            ? ($request->integer('id_perusahaan') ?: app(AdminCompanyContextService::class)->selectedCompanyIdForUser($user))
            : (int) $user->id_perusahaan;

        if (!$companyId) {
            throw ValidationException::withMessages([
                'id_perusahaan' => 'Perusahaan wajib dipilih.',
            ]);
        }

        return $companyId;
    }

    private function authorizeCompanyAccess(int $companyId): void
    {
        $user = Auth::user();

        if (!$user->hasRole('admin') && (int) $user->id_perusahaan !== $companyId) {
            abort(403, 'Unauthorized company access.');
        }

        if (!Perusahaan::whereKey($companyId)->exists()) {
            throw ValidationException::withMessages([
                'id_perusahaan' => 'Perusahaan tidak ditemukan.',
            ]);
        }
    }

    private function validateRolePayload(Request $request): array
    {
        $permissionNames = Permission::pluck('name')->all();

        return $request->validate([
            'id_perusahaan' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'role_type' => ['required', 'string', Rule::in(['internal', 'eksternal'])],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in($permissionNames)],
        ]);
    }

    private function ensureUniqueRoleName(string $name, int $companyId, ?int $ignoreRoleId = null): void
    {
        $query = Role::query()
            ->where('id_perusahaan', $companyId)
            ->where('guard_name', 'web')
            ->whereRaw('LOWER(name) = ?', [strtolower($name)]);

        if ($ignoreRoleId !== null) {
            $query->whereKeyNot($ignoreRoleId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Nama role sudah digunakan untuk perusahaan ini.',
            ]);
        }
    }
}
