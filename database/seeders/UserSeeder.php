<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\RolePermissionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roleService = app(RolePermissionService::class);
        $roleService->seedGlobalRoles();
        $roleService->seedCompanyRoles();

        // 1. Setup Internal Users
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
            ['name' => 'Adel Staff', 'email' => 'adel@amlogistik.com', 'password' => 'xO5eP7FsJ7x0l14v', 'role_internal' => 'staff', 'id_perusahaan' => 2],
            ['name' => 'Putra Staff', 'email' => 'putra@amlogistik.com', 'password' => 'F8YjlaRn4rOFqwSd', 'role_internal' => 'staff', 'id_perusahaan' => 2],
            ['name' => 'Cessy Staff', 'email' => 'cessy@amlogistik.com', 'password' => 'yLStphPUS72L684b', 'role_internal' => 'staff', 'id_perusahaan' => 2],
            ['name' => 'Staff AML', 'email' => 'documentamlogistik@gmail.com', 'password' => 'Q2DtSj8o0PBilZbA', 'role_internal' => 'staff', 'id_perusahaan' => 2],
            ['name' => 'Marketing AML', 'email' => 'deboraamlogistik@gmail.com', 'password' => 'WV5jcrfJVlUIc815', 'role_internal' => 'marketing', 'id_perusahaan' => 2],

            //Amin Trans
            ['name' => 'Joshua Manager', 'email' => 'joshuawjaya@gmail.com', 'password' => 'KkUyd65ER', 'role_internal' => 'manager','id_perusahaan' => 3],
            ['name' => 'Anna Supervisor', 'email' => 'ppjk@amintrans.co.id', 'password' => '96NwHVqWU688nOA8', 'role_internal' => 'supervisor','id_perusahaan' => 3],
            ['name' => 'Nana Marketing', 'email' => 'nana@amintrans.co.id', 'password' => 'JIJsFPppA3DDIpmE', 'role_internal' => 'marketing','id_perusahaan' => 3],
            
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

            $roleService->assignRoleToUser(
                $user,
                $data['role_internal'],
                $data['id_perusahaan'] ? (int) $data['id_perusahaan'] : null
            );
        }

        // 2. Setup External Users
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
                    'email_to' => 'corporate.a@gmail.com',
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
                    'email_to' => 'corporate.b@gmail.com',
                    'ownership' => 1, // ID Perusahaan pemilik customer ini
                ]
            ],
        ];

        foreach ($externalUsers as $data) {
            $custData = $data['customer_data'];

            $customerId = (int) $custData['id_customer'];
            $now = now();

            $hasEmailTo = Schema::connection('tako-user')->hasColumn('customers', 'email_to');
            $hasEmail = Schema::connection('tako-user')->hasColumn('customers', 'email');

            $existing = DB::connection('tako-user')
                ->table('customers')
                ->where('id_customer', $customerId)
                ->first();

            $uid = $existing?->uid ?: (string) Str::uuid();
            $payload = [
                'uid' => $uid,
                'nama_perusahaan' => $custData['nama_perusahaan'],
                'type' => $custData['type'],
                'nama' => $custData['nama'],
                'ownership' => $custData['ownership'],
                'updated_at' => $now,
            ];

            if ($existing === null) {
                $payload['id_customer'] = $customerId;
                $payload['created_at'] = $now;
            }

            if ($hasEmailTo) {
                $emailTo = $custData['email_to'] ?? null;
                $emailToArray = $emailTo ? (is_array($emailTo) ? $emailTo : [$emailTo]) : null;
                $payload['email_to'] = $emailToArray ? json_encode($emailToArray) : null;
                if (Schema::connection('tako-user')->hasColumn('customers', 'email_cc')) {
                    $payload['email_cc'] = json_encode([]);
                }
            } elseif ($hasEmail) {
                $payload['email'] = $custData['email_to'] ?? null;
            }

            if ($existing === null) {
                DB::connection('tako-user')->table('customers')->insert($payload);
            } else {
                DB::connection('tako-user')->table('customers')->where('id_customer', $customerId)->update($payload);
            }

            $user = User::updateOrCreate(
                ['email' => $data['user_email']],
                [
                    'name' => $data['user_name'],
                    'password' => Hash::make($data['password']),
                    'id_perusahaan' => $custData['ownership'], 
                    'id_customer' => $customerId,
                    'role' => 'eksternal',
                    'role_internal' => null,
                ]
            );

            $roleService->assignRoleToUser($user, 'customer', (int) $custData['ownership']);
        }

        if (DB::connection('tako-user')->getDriverName() === 'pgsql') {
            DB::connection('tako-user')->statement("SELECT setval(pg_get_serial_sequence('customers', 'id_customer'), coalesce(max(id_customer),0) + 1, false) FROM customers;");
        }
    }
}
