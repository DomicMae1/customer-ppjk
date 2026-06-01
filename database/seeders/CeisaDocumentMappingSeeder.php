<?php

namespace Database\Seeders;

use App\Models\CeisaDocumentMapping;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CeisaDocumentMappingSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::connection('tenant')->hasTable('ceisa_document_mappings')) {
            return;
        }

        $columns = array_flip(Schema::connection('tenant')->getColumnListing('ceisa_document_mappings'));
        $documentIds = DB::connection('tenant')
            ->table('master_documents_trans')
            ->whereIn('nama_file', array_keys($this->mappings()))
            ->pluck('id_dokumen', 'nama_file');
        $now = Carbon::now();

        foreach ($this->mappings() as $name => $mapping) {
            $idDokumen = $documentIds[$name] ?? null;

            if (! $idDokumen) {
                continue;
            }

            $attributes = array_intersect_key([
                'id_dokumen' => $idDokumen,
                'parser_type' => 'ceisa_draft',
            ], $columns);

            $payload = array_intersect_key([
                'id_dokumen' => $idDokumen,
                'id_section' => null,
                'parser_type' => 'ceisa_draft',
                'ceisa_document_code' => $mapping['code'],
                'shipment_type' => $mapping['shipment_type'] ?? null,
                'draft_usage' => $mapping['draft_usage'],
                'aliases' => json_encode($mapping['aliases'] ?? []),
                'is_required_for_submit' => (bool) ($mapping['required'] ?? false),
                'is_active' => true,
                'updated_at' => $now,
                'created_at' => $now,
            ], $columns);

            DB::connection('tenant')
                ->table('ceisa_document_mappings')
                ->updateOrInsert($attributes, $payload);
        }
    }

    private function mappings(): array
    {
        return [
            'Bill of Lading' => $this->include('705', true, ['B/L', 'BL', 'Konosemen'], 'import'),
            'Shipping Instruction' => $this->include('343', false, ['SI', 'Instruksi Pengapalan', 'Shiping Order', 'Shipping Order'], 'export'),
            'Invoice' => $this->include('380', true, ['Commercial Invoice', 'INV']),
            'Packing List' => $this->include('217', false, ['Packing']),
            'Asuransi' => $this->include('999', false, ['Insurance']),
            'Surat Kuasa Kepabeanan' => $this->ignore(['Power of Attorney', 'SK Kepabeanan']),
            'Persetujuan Impor' => $this->include('959', false, ['PI', 'Surat Persetujuan Impor']),
            'Laporan Surveyor' => $this->include('958', false, ['LS', 'L/S']),
            'Sales Contract / Purchase Order' => $this->include('315', false, ['Sales Contract', 'Purchase Order', 'PO']),
            'Weight Certificate' => $this->include('999', false, ['Weight Note']),
            'Product Catalog' => $this->include('999', false, ['Catalogue', 'Katalog Produk']),
            'Surat Kuasa BC' => $this->ignore(['Kuasa Bea Cukai']),
            'Surat Pernyataan Surrender' => $this->ignore(['Surrender Letter']),
            'Surat Kuasa Release DO' => $this->ignore(['Release DO']),
            'Surat Pinjam Container' => $this->ignore(['Container Loan']),
            'Invoice DO' => $this->ignore(['Delivery Order Invoice']),
            'Draft PIB/PEB' => $this->postSubmit(['Draft PIB', 'Draft PEB']),
            'PIB/PEB Confirm' => $this->postSubmit(['PIB Confirm', 'PEB Confirm']),
            'Id Billing' => $this->postSubmit(['Billing ID']),
            'Bukti Penerimaan Negara' => $this->postSubmit(['BPN']),
            'Surat Perintah Pemindahan Media Pembawa (SP2MP)' => $this->include('999', false, ['SP2MP']),
            'PIB/PEB NOPEN Stamp' => $this->postSubmit(['NOPEN Stamp']),
            'PIB/PEB NOPEN Non Stamp' => $this->postSubmit(['NOPEN Non Stamp']),
            'SPJM/PPB' => $this->postSubmit(['SPJM', 'PPB']),
            'SPPB/NPE' => $this->postSubmit(['SPPB', 'NPE']),
            'Additional Memo' => $this->ignore(['Memo']),
            'Sertifikat Fumigasi' => $this->include('857', false, ['Fumigation Certificate']),
            'Packing Declaration' => $this->include('217', false, ['Packing Declaration']),
            'Prior Notice' => $this->include('999', false, ['Prior Notice']),
            'S-Kep 142' => $this->include('999', false, ['SKEP 142']),
            'Rekomendasi Menteri Pertanian' => $this->include('993', false, ['Rekomendasi Kementan']),
            'Rekomendasi Menteri Perikanan' => $this->include('999', false, ['Rekomendasi KKP']),
            'Pernyataan Keterlambatan Muat Kapal' => $this->ignore(['Keterlambatan Muat']),
            'Perka' => $this->include('999', false, ['PERKA']),
            'SKEP 41' => $this->include('999', false, ['S-Kep 41']),
            'Certificate Halal' => $this->include('999', false, ['Halal Certificate']),
            'SKEP 26' => $this->include('999', false, ['S-Kep 26']),
            'Certificate of Origin (COO) Fasilitas' => $this->include('860', false, ['E-CO', 'COO Fasilitas']),
            'Certificate of Origin (COO) Non Fasilitas' => $this->include('861', false, ['CO', 'COO Non Fasilitas']),
            'Certificate of Analysis (COA)' => $this->include('961', false, ['COA', 'Hasil Lab']),
            'Phytosanitary Certificate (Phyto)' => $this->include('851', false, ['Phyto', 'Phytosanitary']),
            'Health Certificate (HC)' => $this->include('853', false, ['HC', 'Health Certificate']),
            'Depkes' => $this->include('999', false, ['BPOM', 'Kemenkes']),
            'Setifikat Pelepasan' => $this->include('999', false, ['Sertifikat Pelepasan']),
        ];
    }

    private function include(string $code, bool $required = false, array $aliases = [], ?string $shipmentType = null): array
    {
        return [
            'code' => $code,
            'shipment_type' => $shipmentType,
            'draft_usage' => CeisaDocumentMapping::DRAFT_USAGE_INCLUDE,
            'required' => $required,
            'aliases' => $aliases,
        ];
    }

    private function ignore(array $aliases = []): array
    {
        return [
            'code' => null,
            'draft_usage' => CeisaDocumentMapping::DRAFT_USAGE_IGNORE,
            'required' => false,
            'aliases' => $aliases,
        ];
    }

    private function postSubmit(array $aliases = []): array
    {
        return [
            'code' => null,
            'draft_usage' => CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT,
            'required' => false,
            'aliases' => $aliases,
        ];
    }
}
