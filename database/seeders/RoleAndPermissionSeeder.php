<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Reset Cache Permission
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Definisi Modul & Aksi (Otomatis jadi Permission)
        // Pola: {action}-{module}
        $modules = [
            'user',
            'customer',
            'document',
            'role',
            'master-shipping',
            'section',

        ];
        
        $actions = ['view', 'create', 'update', 'delete'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate([
                    'name' => "{$action}-{$module}",
                    'guard_name' => 'web'
                ]);
            }
        }

        // 3. Tambahan Permission Spesial (Non-CRUD)
        $specialPermissions = [
            'upload-document',
            'verify-document',
            'assign_staff-master-shipping',
            'delete-shipping-document',
        ];

        foreach ($specialPermissions as $sp) {
            Permission::firstOrCreate(['name' => $sp, 'guard_name' => 'web']);
        }

        // 4. Definisi Roles
        $rolesList = [
            'admin',
            'staff',
            'manager',
            'supervisor',
            'marketing',
            'customer',
        ];

        $rolesObj = [];
        foreach ($rolesList as $rName) {
            $rolesObj[$rName] = Role::firstOrCreate(
                ['name' => $rName, 'guard_name' => 'web']
            );
        }

        // 5. Assign Permissions ke Role (Setup Awal)

        // Admin: SEMUA AKSES
        $rolesObj['admin']->syncPermissions(Permission::all());

        // Staff: Operasional dasar shipping
        $rolesObj['staff']->syncPermissions([
            'view-master-shipping',
            'create-master-shipping',
            'update-master-shipping',
            'upload-document',
            'verify-document',
        ]);

        // Marketing: View & Create Customer/Shipping
        $rolesObj['marketing']->syncPermissions([
            'view-customer',
            'create-customer',
            'view-master-shipping',
            'update-master-shipping',
            'create-master-shipping',
        ]);

        // Manager & Supervisor: Full akses modul bisnis tapi mungkin tidak untuk user/role management
        $businessPermissions = [
            'view-customer', 'create-customer', 'update-customer', 'delete-customer',
            'view-user', 'create-user', 'update-user', 'delete-user',
            'view-document', 'create-document', 'update-document', 'delete-document',
            'view-master-shipping', 'create-master-shipping', 'update-master-shipping', 'delete-master-shipping',
            'upload-document', 'verify-document',
            'view-section', 'create-section', 'update-section', 'delete-section',
            'assign_staff-master-shipping',
            'delete-shipping-document',
        ];
        
        $rolesObj['manager']->syncPermissions($businessPermissions);
        $rolesObj['supervisor']->syncPermissions($businessPermissions);

        // Customer: Hanya lihat & upload document miliknya (logic filter ada di controller)
        $rolesObj['customer']->syncPermissions([
            'view-master-shipping',
            'view-document',
            'update-master-shipping',
            'upload-document',
            'verify-document',
        ]);
    }
}
