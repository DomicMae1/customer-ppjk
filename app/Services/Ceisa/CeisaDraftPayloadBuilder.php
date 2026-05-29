<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaDocumentMapping;
use App\Models\CeisaImportirPreset;
use App\Models\DocumentTrans;
use App\Models\Spk;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CeisaDraftPayloadBuilder
{
    public function __construct(private readonly CeisaNomorAjuGenerator $nomorAjuGenerator) {}

    public function build(CeisaCompanyConfig $config, Spk $spk, string $nomorAju): array
    {
        $spk->loadMissing(['customer', 'hsCodes', 'parties']);

        $shipmentType = $this->shipmentType($spk);
        $documentType = $shipmentType === 'export' ? 'BC30' : 'BC20';
        $kodeDokumen = $this->nomorAjuGenerator->resolveDocumentCode($documentType);
        $today = now()->toDateString();
        $warnings = [];

        $preset = $this->importirPreset($config, $spk);
        $documentRows = $this->documentRows($spk, $shipmentType, $today, $warnings);
        $barangRows = $this->barangRows($spk, $warnings);

        $payload = [
            'kodeDokumen' => $kodeDokumen,
            'asalData' => 'S',
            'nomorAju' => $nomorAju,
            'tanggalAju' => $today,
            'kodeKantor' => (string) $config->default_kode_kantor,
            'kodeTps' => (string) $config->default_kode_tps,
            'kodeValuta' => 'USD',
            'fob' => 0,
            'freight' => 0,
            'asuransi' => 0,
            'cif' => 0,
            'bruto' => 0,
            'netto' => 0,
            'ndpbm' => $preset?->default_ndpbm ? (float) $preset->default_ndpbm : 0,
            'jumlahKontainer' => max(0, $this->containerCount($spk)),
            'jabatanTtd' => $preset?->default_signer_title ?: (string) $config->default_signer_title,
            'namaTtd' => $preset?->default_signer_name ?: (string) $config->default_signer_name,
            'kotaTtd' => $preset?->default_signer_city ?: (string) $config->default_signer_city,
            'tanggalTtd' => $today,
            'disclaimer' => '1',
            'entitas' => $this->entityRows($config, $spk, $preset, $shipmentType, $warnings),
            'dokumen' => $documentRows,
            'pengangkut' => $this->pengangkutRows($spk),
            'kemasan' => [],
            'kontainer' => $this->kontainerRows($spk),
            'barang' => $barangRows,
        ];

        if ($shipmentType === 'import') {
            $payload = array_merge($payload, [
                'kodeJenisImpor' => (string) ($preset?->default_kode_jenis_impor ?: ''),
                'kodeJenisProsedur' => '1',
                'kodeCaraBayar' => (string) ($preset?->default_kode_cara_bayar ?: ''),
                'kodeTutupPu' => (string) ($preset?->default_kode_tutup_pu ?: ''),
                'kodePelMuat' => (string) $spk->port_of_loading,
                'kodePelTujuan' => (string) $spk->port,
                'tanggalTiba' => optional($spk->eta_date)->toDateString() ?: $today,
            ]);
        } else {
            $payload = array_merge($payload, [
                'kodeJenisEkspor' => '',
                'kodeKategoriEkspor' => '',
                'kodeCaraDagang' => '',
                'kodeCaraBayar' => (string) ($preset?->default_kode_cara_bayar ?: ''),
                'kodePelMuat' => (string) $spk->port_of_loading,
                'kodePelTujuan' => (string) $spk->port,
                'tanggalEkspor' => optional($spk->etd_date)->toDateString() ?: $today,
            ]);
        }

        $this->appendCommonWarnings($config, $spk, $documentRows, $barangRows, $warnings);

        return [
            'nomor_aju' => $nomorAju,
            'document_type' => $documentType,
            'payload' => $payload,
            'warnings' => array_values(array_unique(array_filter($warnings))),
            'source_documents' => collect($documentRows)->map(fn (array $row) => [
                'seri_dokumen' => $row['seriDokumen'] ?? null,
                'kode_dokumen' => $row['kodeDokumen'] ?? null,
                'nomor_dokumen' => $row['nomorDokumen'] ?? null,
                'tanggal_dokumen' => $row['tanggalDokumen'] ?? null,
            ])->all(),
        ];
    }

    private function shipmentType(Spk $spk): string
    {
        return Str::contains(Str::lower((string) $spk->shipment_type), ['export', 'ekspor']) ? 'export' : 'import';
    }

    private function importirPreset(CeisaCompanyConfig $config, Spk $spk): ?CeisaImportirPreset
    {
        return CeisaImportirPreset::where('id_perusahaan', $config->id_perusahaan)
            ->where('is_active', true)
            ->where(function ($query) use ($spk) {
                $query->where('id_customer', $spk->id_customer)
                    ->orWhereNull('id_customer');
            })
            ->orderByRaw('CASE WHEN id_customer IS NULL THEN 1 ELSE 0 END')
            ->latest('updated_at')
            ->first();
    }

    private function entityRows(CeisaCompanyConfig $config, Spk $spk, ?CeisaImportirPreset $preset, string $shipmentType, array &$warnings): array
    {
        $customer = $spk->customer;
        $identity = $this->identityFromPresetOrCustomer($preset, $customer);
        $rows = [];
        $customerEntityCode = $shipmentType === 'export' ? '2' : '1';
        $ownerEntityCode = $shipmentType === 'export' ? null : '7';

        if ($identity['name'] !== '') {
            $rows[] = [
                'seriEntitas' => count($rows) + 1,
                'kodeEntitas' => $customerEntityCode,
                'namaEntitas' => $identity['name'],
                'alamatEntitas' => $identity['address'],
                'nomorIdentitas' => $identity['npwp16'],
                'kodeJenisIdentitas' => $identity['kodeJenisIdentitas'],
                'nitku' => $identity['nitku'],
                'nibEntitas' => $identity['nib'],
                'kodeStatus' => $identity['kodeStatus'],
                'kodeJenisApi' => $identity['kodeJenisApi'],
            ];
        } else {
            $warnings[] = 'Data importir/eksportir belum lengkap. Isi importir preset atau data customer sebelum submit final.';
        }

        if ($ownerEntityCode && $identity['name'] !== '') {
            $rows[] = [
                'seriEntitas' => count($rows) + 1,
                'kodeEntitas' => $ownerEntityCode,
                'namaEntitas' => $identity['name'],
                'alamatEntitas' => $identity['address'],
                'nomorIdentitas' => $identity['npwp16'],
                'kodeJenisIdentitas' => $identity['kodeJenisIdentitas'],
                'nitku' => $identity['nitku'],
                'kodeAfiliasi' => 'TAH',
            ];
        }

        if ($config->ppjk_name || $config->ppjk_npwp || $config->ppjk_npwp_16) {
            $ppjkNpwp16 = $this->toNpwp16($config->ppjk_npwp_16 ?: $config->ppjk_npwp);
            $rows[] = [
                'seriEntitas' => count($rows) + 1,
                'kodeEntitas' => '4',
                'namaEntitas' => (string) $config->ppjk_name,
                'alamatEntitas' => (string) $config->ppjk_address,
                'nomorIdentitas' => $ppjkNpwp16,
                'kodeJenisIdentitas' => '6',
                'nitku' => $ppjkNpwp16 ? $this->toNitku($ppjkNpwp16) : '',
                'nibEntitas' => (string) $config->ppjk_nib,
                'kodeNegara' => 'ID',
                'kodeStatus' => '01',
                'kodeJenisApi' => '01',
            ];
        }

        return $rows;
    }

    private function identityFromPresetOrCustomer(?CeisaImportirPreset $preset, mixed $customer): array
    {
        $npwp16 = $this->toNpwp16($preset?->npwp_16 ?: $preset?->npwp ?: ($customer?->no_npwp_16 ?: $customer?->no_npwp));

        return [
            'name' => trim((string) ($preset?->name ?: $customer?->nama_perusahaan)),
            'address' => (string) ($preset?->address ?: ''),
            'npwp16' => $npwp16,
            'nitku' => (string) ($preset?->nitku ?: ($npwp16 ? $this->toNitku($npwp16) : '')),
            'nib' => (string) ($preset?->nib ?: ''),
            'kodeJenisIdentitas' => (string) ($preset?->kode_jenis_identitas ?: '6'),
            'kodeStatus' => (string) ($preset?->kode_status ?: '01'),
            'kodeJenisApi' => (string) ($preset?->kode_jenis_api ?: '01'),
        ];
    }

    private function documentRows(Spk $spk, string $shipmentType, string $today, array &$warnings): array
    {
        $documents = DocumentTrans::where('id_spk', $spk->id)
            ->whereNotNull('url_path_file')
            ->with('masterDocument')
            ->orderBy('id')
            ->get();

        if ($documents->isEmpty()) {
            $warnings[] = 'Belum ada file dokumen yang terupload di SPK ini.';

            return [];
        }

        $mappings = Schema::connection('tenant')->hasTable('ceisa_document_mappings')
            ? CeisaDocumentMapping::where('is_active', true)
                ->where(function ($query) use ($shipmentType) {
                    $query->whereNull('shipment_type')
                        ->orWhere('shipment_type', $shipmentType);
                })
                ->get()
                ->keyBy('id_dokumen')
            : collect();

        return $documents->values()->map(function (DocumentTrans $document, int $index) use ($mappings, $spk, $today, &$warnings) {
            $mapping = $mappings->get($document->id_dokumen);
            $name = (string) ($document->masterDocument?->nama_file ?: $document->nama_file);
            $kodeDokumen = $mapping?->ceisa_document_code ?: $this->guessDocumentCode($name);

            if (! $kodeDokumen) {
                $warnings[] = "Kode dokumen CEISA untuk {$name} belum dimapping.";
            }

            return [
                'seriDokumen' => $index + 1,
                'kodeDokumen' => (string) $kodeDokumen,
                'nomorDokumen' => $this->documentNumber($document, $spk),
                'tanggalDokumen' => optional($document->ori_date)->toDateString()
                    ?: optional($document->upload_date)->toDateString()
                    ?: optional($document->created_at)->toDateString()
                    ?: $today,
            ];
        })->all();
    }

    private function documentNumber(DocumentTrans $document, Spk $spk): string
    {
        $mapped = trim((string) $document->mapping_insw);

        if ($mapped !== '') {
            return $mapped;
        }

        $fileBase = trim((string) pathinfo((string) $document->nama_file, PATHINFO_FILENAME));

        return $fileBase !== '' ? $fileBase : ((string) $spk->spk_code ?: '-');
    }

    private function guessDocumentCode(string $name): ?string
    {
        $normalized = Str::lower($name);

        return match (true) {
            Str::contains($normalized, ['invoice', 'inv']) => '380',
            Str::contains($normalized, ['packing']) => '217',
            Str::contains($normalized, ['b/l', 'bill of lading', 'konosemen']) => '705',
            Str::contains($normalized, ['awb']) => '740',
            Str::contains($normalized, ['coo', 'certificate of origin', 'e-co', 'origin']) => '860',
            Str::contains($normalized, ['lartas', 'izin', 'permit', 'persetujuan']) => '888',
            default => null,
        };
    }

    private function barangRows(Spk $spk, array &$warnings): array
    {
        $hsCodes = $spk->hsCodes;

        if ($hsCodes->isEmpty()) {
            $warnings[] = 'Belum ada HS Code. Payload membuat 1 baris barang placeholder.';

            return [[
                'seriBarang' => 1,
                'posTarif' => '',
                'uraian' => (string) ($spk->comodity ?: ''),
                'jumlahSatuan' => 1,
                'kodeSatuanBarang' => 'PCE',
                'fob' => 0,
                'freight' => 0,
                'asuransi' => 0,
                'cif' => 0,
                'netto' => 0,
                'barangTarif' => [],
            ]];
        }

        return $hsCodes->values()->map(fn ($hsCode, int $index) => [
            'seriBarang' => $index + 1,
            'posTarif' => preg_replace('/\D+/', '', (string) $hsCode->hs_code),
            'uraian' => (string) ($spk->comodity ?: 'BARANG'),
            'jumlahSatuan' => 1,
            'kodeSatuanBarang' => 'PCE',
            'fob' => 0,
            'freight' => 0,
            'asuransi' => 0,
            'cif' => 0,
            'netto' => 0,
            'kodeNegaraAsal' => '',
            'barangTarif' => [],
        ])->all();
    }

    private function pengangkutRows(Spk $spk): array
    {
        if (! $spk->vessel) {
            return [];
        }

        return [[
            'seriPengangkut' => 1,
            'namaPengangkut' => (string) $spk->vessel,
            'nomorPengangkut' => '',
            'kodeCaraAngkut' => '1',
            'kodeBendera' => '',
        ]];
    }

    private function kontainerRows(Spk $spk): array
    {
        $count = $this->containerCount($spk);

        if ($count < 1) {
            return [];
        }

        return collect(range(1, $count))->map(fn (int $seri) => [
            'seriKontainer' => $seri,
            'kodeJenisKontainer' => '8',
            'kodeTipeKontainer' => '1',
            'kodeUkuranKontainer' => '20',
            'nomorKontainer' => '',
        ])->all();
    }

    private function containerCount(Spk $spk): int
    {
        return (int) $spk->parties
            ->filter(fn ($party) => Str::upper((string) $party->party_type) === 'FCL')
            ->sum(fn ($party) => (int) $party->party_qty);
    }

    private function appendCommonWarnings(CeisaCompanyConfig $config, Spk $spk, array $documents, array $barang, array &$warnings): void
    {
        if (! $config->default_kode_kantor) {
            $warnings[] = 'Kode kantor default belum diisi di CEISA Settings.';
        }

        if (! $config->company_code) {
            $warnings[] = 'Company code CEISA belum diisi di CEISA Settings.';
        }

        if (! $spk->port || ! $spk->port_of_loading) {
            $warnings[] = 'Kode pelabuhan muat/tujuan belum lengkap. Cek referensi pelabuhan lalu isi payload.';
        }

        if (! collect($documents)->contains(fn (array $row) => ($row['kodeDokumen'] ?? null) === '380')) {
            $warnings[] = 'Dokumen invoice 380 belum terdeteksi.';
        }

        if (! collect($documents)->contains(fn (array $row) => in_array($row['kodeDokumen'] ?? null, ['705', '740'], true))) {
            $warnings[] = 'Dokumen B/L 705 atau AWB 740 belum terdeteksi.';
        }

        if (count($barang) === 0) {
            $warnings[] = 'Minimal 1 barang wajib ada sebelum submit.';
        }
    }

    private function toNpwp16(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);

        return strlen($digits) === 15 ? '0'.$digits : $digits;
    }

    private function toNitku(string $npwp16): string
    {
        return $npwp16.'00000';
    }
}
