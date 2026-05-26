<?php

namespace App\Services;

use App\Models\Perusahaan;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionService
{
    public const INTERNAL_ROLES = ['staff', 'marketing', 'manager', 'supervisor'];

    public const EXTERNAL_ROLES = ['customer'];

    public function seedPermissions(): Collection
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($this->permissionNames() as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);
        }

        return Permission::query()->whereIn('name', $this->permissionNames())->get();
    }

    public function seedGlobalRoles(): void
    {
        $this->seedPermissions();

        $admin = Role::query()->firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web', 'id_perusahaan' => null],
            ['role_type' => 'admin']
        );

        $admin->update(['role_type' => 'admin']);
        $admin->syncPermissions(Permission::all());
    }

    public function seedCompanyRoles(?int $idPerusahaan = null): void
    {
        $this->seedPermissions();

        $companies = Perusahaan::query()
            ->when($idPerusahaan, fn ($query) => $query->where('id_perusahaan', $idPerusahaan))
            ->get(['id_perusahaan']);

        foreach ($companies as $company) {
            $this->ensureCompanyRoles((int) $company->id_perusahaan);
        }
    }

    public function ensureCompanyRoles(int $idPerusahaan): void
    {
        foreach (self::INTERNAL_ROLES as $roleName) {
            $role = Role::query()->firstOrCreate(
                [
                    'name' => $roleName,
                    'guard_name' => 'web',
                    'id_perusahaan' => $idPerusahaan,
                ],
                ['role_type' => 'internal']
            );

            $role->update(['role_type' => 'internal']);

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($this->permissionsForRole($roleName));
            }
        }

        foreach (self::EXTERNAL_ROLES as $roleName) {
            $role = Role::query()->firstOrCreate(
                [
                    'name' => $roleName,
                    'guard_name' => 'web',
                    'id_perusahaan' => $idPerusahaan,
                ],
                ['role_type' => 'eksternal']
            );

            $role->update(['role_type' => 'eksternal']);

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($this->permissionsForRole($roleName));
            }
        }
    }

    public function syncExistingUsers(): void
    {
        User::query()->chunkById(100, function (Collection $users) {
            foreach ($users as $user) {
                $roleName = $user->role === 'eksternal'
                    ? 'customer'
                    : ($user->role_internal ?: null);

                if (!$roleName) {
                    continue;
                }

                $this->assignRoleToUser($user, $roleName, $user->id_perusahaan ? (int) $user->id_perusahaan : null);
            }
        }, 'id_user');
    }

    public function removeLegacyGlobalCompanyRoles(): void
    {
        Role::query()
            ->whereNull('id_perusahaan')
            ->whereIn('name', array_merge(self::INTERNAL_ROLES, self::EXTERNAL_ROLES))
            ->delete();
    }

    public function assignRoleToUser(User $user, string $roleName, ?int $idPerusahaan): void
    {
        $role = $this->findRoleForCompany($roleName, $idPerusahaan);

        if (!$role) {
            return;
        }

        $user->syncRoles([$role]);
    }

    public function assignRoleModelToUser(User $user, Role $role): void
    {
        $user->syncRoles([$role]);
    }

    public function findRoleForCompany(string $roleName, ?int $idPerusahaan): ?Role
    {
        if ($roleName === 'admin') {
            return Role::query()
                ->where('name', 'admin')
                ->whereNull('id_perusahaan')
                ->first();
        }

        if (!$idPerusahaan) {
            return null;
        }

        $this->ensureCompanyRoles($idPerusahaan);

        return Role::query()
            ->where('name', $roleName)
            ->where('id_perusahaan', $idPerusahaan)
            ->first();
    }

    public function findRoleByIdForCompany(int $roleId, ?int $idPerusahaan, ?string $roleType = null): ?Role
    {
        $query = Role::query()->whereKey($roleId);

        if ($idPerusahaan === null) {
            $query->whereNull('id_perusahaan');
        } else {
            $query->where('id_perusahaan', $idPerusahaan);
        }

        if ($roleType !== null) {
            $query->where('role_type', $roleType);
        }

        return $query->first();
    }

    public function permissionsForRole(string $roleName): array
    {
        $businessPermissions = [
            'view-customer', 'create-customer', 'update-customer', 'delete-customer',
            'view-user', 'create-user', 'update-user', 'delete-user',
            'view-document', 'create-document', 'update-document', 'delete-document',
            'view-master-shipping', 'create-master-shipping', 'update-master-shipping', 'delete-master-shipping',
            'view-shipping-package', 'create-shipping-package', 'update-shipping-package', 'delete-shipping-package',
            'upload-document', 'verify-document',
            'view-section', 'create-section', 'update-section', 'delete-section',
            'assign_staff-master-shipping',
            'delete-shipping-document',
        ];

        return match ($roleName) {
            'staff' => [
                'view-master-shipping',
                'create-master-shipping',
                'update-master-shipping',
                'upload-document',
                'verify-document',
            ],
            'marketing' => [
                'view-customer',
                'create-customer',
                'view-master-shipping',
                'update-master-shipping',
                'create-master-shipping',
            ],
            'manager', 'supervisor' => $businessPermissions,
            'customer' => [
                'view-master-shipping',
                'view-document',
                'update-master-shipping',
                'upload-document',
                'verify-document',
            ],
            default => [],
        };
    }

    private function permissionNames(): array
    {
        $modules = [
            'user',
            'customer',
            'document',
            'role',
            'master-shipping',
            'shipping-package',
            'section',
        ];

        $permissions = [];

        foreach ($modules as $module) {
            foreach (['view', 'create', 'update', 'delete'] as $action) {
                $permissions[] = "{$action}-{$module}";
            }
        }

        return array_values(array_unique(array_merge($permissions, [
            'upload-document',
            'verify-document',
            'assign_staff-master-shipping',
            'delete-shipping-document',
        ])));
    }
}
