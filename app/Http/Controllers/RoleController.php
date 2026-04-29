<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        if (!$user->can('view-role')) {
            abort(403, 'Unauthorized access. You do not have permission to view roles.');
        }

        $roles = Role::with('permissions')->get();

        // Sort permissions: view first, then create, update, delete
        $allPermissions = Permission::all()->sortBy(function($perm) {
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
            'trans_role' => $trans_role,
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
        if (!Auth::user()->can('create-role')) {
            abort(403, 'Unauthorized access.');
        }

        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create(['name' => $request->name]);
        if ($request->permissions) {
            $role->syncPermissions($request->permissions);
        }

        return redirect()->route('role-manager.index')->with('success', 'Role created successfully.');
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
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('update-role')) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($id);

        $request->validate([
            'name' => 'required|string|unique:roles,name,' . $id,
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role->update(['name' => $request->name]);
        $role->syncPermissions($request->permissions);

        return redirect()->route('role-manager.index')->with('success', 'Role updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('delete-role')) {
            abort(403, 'Unauthorized access.');
        }

        $role = Role::findOrFail($id);

        $role->delete();
        return redirect()->route('role-manager.index')->with('success', 'Role deleted successfully.');
    }
}
