<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CeisaExportDocumentSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::connection('tenant')->hasTable('master_documents_trans')) {
            return;
        }

        $columns = array_flip(Schema::connection('tenant')->getColumnListing('master_documents_trans'));
        $now = Carbon::now();

        $this->markBillOfLadingImportOnly($columns, $now);
        $this->upsertShippingInstruction($columns, $now);
    }

    private function markBillOfLadingImportOnly(array $columns, Carbon $now): void
    {
        $payload = array_intersect_key([
            'import_mandatory' => true,
            'export_mandatory' => false,
            'updated_at' => $now,
        ], $columns);

        if ($payload === []) {
            return;
        }

        DB::connection('tenant')
            ->table('master_documents_trans')
            ->where('nama_file', 'Bill of Lading')
            ->update($payload);
    }

    private function upsertShippingInstruction(array $columns, Carbon $now): void
    {
        $payload = array_intersect_key([
            'id_section' => 1,
            'nama_file' => 'Shipping Instruction',
            'is_internal' => false,
            'is_verification' => true,
            'attribute' => true,
            'import_mandatory' => false,
            'export_mandatory' => true,
            'is_confirmed' => false,
            'is_ori' => false,
            'is_print' => true,
            'is_send_email' => false,
            'is_active' => true,
            'kuota_revisi' => 3,
            'description_file' => 'Shipping Instruction (SI) adalah instruksi pengapalan untuk proses ekspor dan menjadi dokumen pendukung draft PEB/BC30.',
            'updated_by' => 1,
            'updated_at' => $now,
            'created_at' => $now,
        ], $columns);

        DB::connection('tenant')
            ->table('master_documents_trans')
            ->updateOrInsert(['nama_file' => 'Shipping Instruction'], $payload);
    }
}
