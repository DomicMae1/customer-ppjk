<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TenantSectionSeeder extends Seeder
{
    /**
     * Seed the master_sections_trans table in the TENANT database.
     * This seeds the sections available for the company into their tenant DB.
     */
    public function run(): void
    {
        $now = Carbon::now();

        $sections = [
            [
                'id_section'    => 1,
                'section_name'  => 'PPJK Document Request',
                'section_order' => 1,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 1,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 2,
                'section_name'  => 'Shipping Line',
                'section_order' => 2,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 2,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 3,
                'section_name'  => 'Pib/Peb',
                'section_order' => 3,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 3,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 4,
                'section_name'  => 'Bill Payment',
                'section_order' => 4,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 4,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 5,
                'section_name'  => 'Result',
                'section_order' => 5,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 5,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 6,
                'section_name'  => 'Additional Document',
                'section_order' => 6,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => 6,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id_section'    => 7,
                'section_name'  => 'Quarantine',
                'section_order' => 7,
                'is_penjaluran' => false,
                'attribute_section' => true,
                'is_checklist' => false,
                'source_master_section_id' => null,
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
        ];

        // Seed into current tenant connection
        try {
            DB::connection('tenant')->statement('TRUNCATE TABLE master_sections_trans RESTART IDENTITY CASCADE');
        } catch (\Exception $e) {
            DB::connection('tenant')->table('master_sections_trans')->delete();
        }

        DB::connection('tenant')->table('master_sections_trans')->insert($sections);

        // Reset PostgreSQL sequence so auto-increment works correctly after manual insert
        if (config('database.default') === 'pgsql' || DB::connection('tenant')->getDriverName() === 'pgsql') {
            DB::connection('tenant')->statement("SELECT setval(pg_get_serial_sequence('master_sections_trans', 'id_section'), (SELECT MAX(id_section) FROM master_sections_trans))");
        }
    }
}
