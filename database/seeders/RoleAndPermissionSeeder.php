<?php

namespace Database\Seeders;

use App\Services\RolePermissionService;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $service = app(RolePermissionService::class);

        $service->seedPermissions();
        $service->seedGlobalRoles();
        $service->seedCompanyRoles();
        $service->syncExistingUsers();
        $service->removeLegacyGlobalCompanyRoles();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
