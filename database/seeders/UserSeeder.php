<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Customer;
use App\Models\Perusahaan;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Setup Roles
        $roles = ['staff','marketing', 'manager', 'supervisor', 'admin', 'customer'];
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        // 2. Setup Internal Users
        $internalUsers = [
            // Perusahaan 1
            ['name' => 'John Doe', 'email' => 'staff@gmail.com', 'password' => 'Ppjk_tako@2026', 'role_internal' => 'staff',      'id_perusahaan' => 1],
            ['name' => 'Rose Doe', 'email' => 'manager@gmail.com', 'password' => 'Ppjk_tako@2026', 'role_internal' => 'manager',     'id_perusahaan' => 1],
            ['name' => 'Emi Rina', 'email' => 'direktur@gmail.com', 'password' => 'Ppjk_tako@2026', 'role_internal' => 'supervisor', 'id_perusahaan' => 1],
            ['name' => 'Mark', 'email' => 'marketing@gmail.com', 'password' => 'Ppjk_tako@2026', 'role_internal' => 'marketing', 'id_perusahaan' => 1],

            // Admin Global (Tanpa Perusahaan)
            ['name' => 'Admin PPJK', 'email' => 'admin@gmail.com', 'password' => 'Ppjk_tako@2026', 'role_internal' => 'admin', 'id_perusahaan' => null],

            //AML
            ['name' => 'Supervisor AML', 'email' => 'spv@amlogistik.com', 'password' => 'djLmzR1d3d835rWX', 'role_internal' => 'supervisor','id_perusahaan' => 2],
            ['name' => 'Manager AML', 'email' => 'manager@amlogistik.com', 'password' => 'D2jW1Lluwr8K8ppK', 'role_internal' => 'manager','id_perusahaan' => 2],
            ['name' => 'Staff AML', 'email' => 'documentamlogistik@gmail.com', 'password' => 'Q2DtSj8o0PBilZbA', 'role_internal' => 'staff', 'id_perusahaan' => 2],
            ['name' => 'Marketing AML', 'email' => 'deboraamlogistik@gmail.com', 'password' => 'WV5jcrfJVlUIc815', 'role_internal' => 'marketing', 'id_perusahaan' => 2],

            //Amin Trans
            ['name' => 'Anna Supervisor', 'email' => 'ppjk@amintrans.co.id', 'password' => '96NwHVqWU688nOA8', 'role_internal' => 'supervisor','id_perusahaan' => 3],
            ['name' => 'Nana Supervisor', 'email' => 'nana@amintrans.co.id', 'password' => 'JIJsFPppA3DDIpmE', 'role_internal' => 'supervisor','id_perusahaan' => 3],
            
            ['name' => 'Amelia Marketing', 'email' => 'amelia@amintrans.co.id', 'password' => '8gKsK6ZrRVBfuQNw', 'role_internal' => 'marketing', 'id_perusahaan' => 3],
            ['name' => 'Neni Marketing', 'email' => 'neni@amintrans.co.id', 'password' => 'XAxoOlBhOU6gN9UI', 'role_internal' => 'marketing', 'id_perusahaan' => 3],
            ['name' => 'Cristina Marketing', 'email' => 'christina@amintrans.co.id', 'password' => '7Nk1MTozA51r3keS', 'role_internal' => 'marketing', 'id_perusahaan' => 3],
            ['name' => 'Yhani Marketing', 'email' => 'suryanih@amintrans.co.id', 'password' => 'lOn4lk2A2ojAHwGR', 'role_internal' => 'marketing', 'id_perusahaan' => 3],

            ['name' => 'Lissa Staff', 'email' => 'lissa@amintrans.co.id', 'password' => 'EaTZVxS6R9bQzhXZ', 'role_internal' => 'staff', 'id_perusahaan' => 3],
            ['name' => 'Amandha Staff', 'email' => 'amandha@amintrans.co.id', 'password' => 'aWYI0X6MoWH2xlzQ', 'role_internal' => 'staff', 'id_perusahaan' => 3],
            ['name' => 'Sella Staff', 'email' => 'docimport@amintrans.co.id', 'password' => '6ffMNDDH7VB8Js4O', 'role_internal' => 'staff', 'id_perusahaan' => 3],
            ['name' => 'Efita Staff', 'email' => 'docexport@amintrans.co.id', 'password' => 'aXUYAE5lih1Er8bl', 'role_internal' => 'staff', 'id_perusahaan' => 3],
        ];

        foreach ($internalUsers as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($data['password']),
                    'id_perusahaan' => $data['id_perusahaan'] ?? null,
                    'role' => 'internal',
                    'role_internal' => $data['role_internal'],
                ]
            );

            $user->syncRoles([$data['role_internal']]);
        }

        // 3. Setup External Users
        $externalUsers = [
            [
                'user_name' => 'Budi Santoso', 
                'user_email' => 'client.a@gmail.com', 
                'password' => '1234',
                // Data untuk tabel customers
                'customer_data' => [
                    'id_customer' => 1,
                    'nama_perusahaan' => 'PT Client A Maju',
                    'type' => 'external',
                    'nama' => 'Budi Santoso', 
                    'email' => 'corporate.a@gmail.com',
                    'ownership' => 1, // ID Perusahaan pemilik customer ini
                ]
            ],
            [
                'user_name' => 'Sari Roti',    
                'user_email' => 'client.b@gmail.com', 
                'password' => '1234',
                // Data untuk tabel customers
                'customer_data' => [
                    'id_customer' => 2,
                    'nama_perusahaan' => 'CV Sari Roti Enak',
                    'type' => 'external',
                    'nama' => 'Sari Roti',
                    'email' => 'corporate.b@gmail.com',
                    'ownership' => 1, // ID Perusahaan pemilik customer ini
                ]
            ],
        ];

        foreach ($externalUsers as $data) {
            $custData = $data['customer_data'];
            
            $customer = Customer::updateOrCreate(
                ['id_customer' => $custData['id_customer']],
                [
                    'uid' => Str::uuid(), // Ensure UID is generated if creating new
                    'nama_perusahaan' => $custData['nama_perusahaan'],
                    'type' => $custData['type'],
                    'nama' => $custData['nama'],
                    'email' => $custData['email'],
                    'ownership' => $custData['ownership'],
                ]
            );

            $user = User::updateOrCreate(
                ['email' => $data['user_email']],
                [
                    'name' => $data['user_name'],
                    'password' => Hash::make($data['password']),
                    'id_perusahaan' => $custData['ownership'], 
                    'id_customer' => $customer->id_customer,
                    'role' => 'eksternal',
                    'role_internal' => null,
                ]
            );

            $user->syncRoles(['customer']);
        }

        if (DB::connection('tako-user')->getDriverName() === 'pgsql') {
            DB::connection('tako-user')->statement("SELECT setval(pg_get_serial_sequence('customers', 'id_customer'), coalesce(max(id_customer),0) + 1, false) FROM customers;");
        }
    }
}
