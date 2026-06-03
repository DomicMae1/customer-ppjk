<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Perusahaan;
use App\Models\Tenant; // Pastikan Model Tenant di-import
use App\Services\RolePermissionService;

class PerusahaanSeeder extends Seeder
{
    public function run(): void
    {
        $perusahaans = [
            // ['nama_perusahaan' => 'PT Alpha', 'subdomain' => 'alpha'],
            ['nama_perusahaan' => 'PT Beta', 'subdomain' => 'beta'],
            ['nama_perusahaan' => 'PT. Anugerah Multi Logistik', 'subdomain' => 'pt-anugerah-multi-logistik'],
            ['nama_perusahaan' => 'PT. Anugerah Mandiri Internasional Trans', 'subdomain' => 'pt-anugerah-mandiri-internasional-trans'],
        ];

        $appDomain = env('APP_DOMAIN');

        $appDomain = preg_replace('#^https?://#', '', $appDomain);

        foreach ($perusahaans as $data) {
            
            // 1. Buat Perusahaan
            $perusahaan = Perusahaan::create([
                'nama_perusahaan' => $data['nama_perusahaan'],
            ]);

            // 2. Buat Tenant
            $tenant = Tenant::create([
                'id' => $data['subdomain'],
                'perusahaan_id' => $perusahaan->id_perusahaan,
            ]);

            // 3. Logic Pembentukan Domain (Concatenation)
            // Rumus: Subdomain + Titik + AppDomain
            // Contoh: beta + . + customer-review-tako.test
            $customDomain = $data['subdomain'] . '.' . $appDomain;

            // 4. Simpan Domain
            $domainRecord = $tenant->domains()->create([
                'domain' => $customDomain,
            ]);

            // 5. Update Perusahaan dengan ID Domain
            $perusahaan->update([
                'id_domain' => $domainRecord->id,
            ]);

            app(RolePermissionService::class)->ensureCompanyRoles((int) $perusahaan->id_perusahaan);
        }
    }
}
