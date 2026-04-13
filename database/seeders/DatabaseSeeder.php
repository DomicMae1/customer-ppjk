<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            PerusahaanSeeder::class,
            UserSeeder::class,
            MasterStatusSeeder::class,
            MasterSectionSeeder::class,
            DocumentSeeder::class,
        ]);

        // --- SEED ALL TENANTS ---
        \App\Models\Tenant::all()->each(function ($tenant) {
            tenancy()->initialize($tenant);
            
            $this->call([
                TenantSectionSeeder::class,
                TenantDocumentSeeder::class,
            ]);
            
            tenancy()->end();
        });
    }
}
