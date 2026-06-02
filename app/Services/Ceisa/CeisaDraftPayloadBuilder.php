<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaDocumentMapping;
use App\Models\DocumentTrans;
use App\Models\Spk;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CeisaDraftPayloadBuilder
{
    public function __construct(
        private readonly CeisaNomorAjuGenerator $nomorAjuGenerator,
        private readonly CeisaImportPayloadNormalizer $payloadNormalizer,
        private readonly CeisaDocumentMappingResolver $documentMappingResolver
    ) {}

    public function build(CeisaCompanyConfig $config, Spk $spk, string $nomorAju): array
    {
        $spk->loadMissing(['customer', 'hsCodes', 'parties']);

        $shipmentType = $this->shipmentType($spk);
        $documentType = $shipmentType === 'export' ? 'BC30' : 'BC20';
        $kodeDokumen = $this->nomorAjuGenerator->resolveDocumentCode($documentType);
        $today = now()->toDateString();
        $warnings = [];

        $documentRows = $this->documentRows($spk, $shipmentType, $today, $warnings);
        $kemasanRows = $this->kemasanRows($spk);
        $originCountry = $this->payloadNormalizer->countryFromValue((string) ($spk->port_of_loading ?: $spk->origin));
        $barangRows = $this->barangRows($spk, $warnings, $kemasanRows, $originCountry);

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
            'biayaTambahan' => 0,
            'biayaPengurang' => 0,
            'nilaiBarang' => 0,
            'nilaiIncoterm' => 0,
            'nilaiMaklon' => 0,
            'totalDanaSawit' => 0,
            'vd' => 0,
            'flagVd' => 'T',
            'kodeIncoterm' => 'CIF',
            'kodeAsuransi' => 'LN',
            'bruto' => 0,
            'netto' => 0,
            'ndpbm' => 0,
            'jumlahKontainer' => max(0, $this->containerCount($spk)),
            'jabatanTtd' => (string) $config->default_signer_title,
            'namaTtd' => (string) $config->default_signer_name,
            'kotaTtd' => (string) $config->default_signer_city,
            'tanggalTtd' => $today,
            'disclaimer' => '1',
            'entitas' => $this->entityRows($config, $spk, $shipmentType, $warnings),
            'dokumen' => $documentRows,
            'pengangkut' => $this->pengangkutRows($spk),
            'kemasan' => $kemasanRows,
            'kontainer' => $this->kontainerRows($spk),
            'informasiKomponenBiaya' => [$this->informasiKomponenBiayaRow()],
            'barang' => $barangRows,
        ];

        if ($shipmentType === 'import') {
            $kodeCaraBayar = '2';
            $kodeJenisNilai = preg_match('/^[A-Za-z]{3}$/', $kodeCaraBayar) === 1 ? strtoupper($kodeCaraBayar) : 'LAI';

            $payload = array_merge($payload, [
                'kodeJenisImpor' => '1',
                'kodeJenisProsedur' => '1',
                'kodeCaraBayar' => $kodeCaraBayar,
                'kodeJenisNilai' => $kodeJenisNilai,
                'kodeTutupPu' => '11',
                'kodePelMuat' => (string) $spk->port_of_loading,
                'kodePelTujuan' => (string) $spk->port,
                'tanggalTiba' => optional($spk->eta_date)->toDateString() ?: $today,
            ]);
        } else {
            $exportDate = optional($spk->etd_date)->toDateString() ?: $today;
            $kodePelMuat = (string) $spk->port_of_loading;
            $kodePelTujuan = (string) $spk->port;

            $payload = array_merge($payload, [
                'kodeJenisEkspor' => '1',
                'kodeKategoriEkspor' => '10',
                'kodeCaraDagang' => '1',
                'kodeCaraBayar' => '1',
                'flagBarkir' => 'T',
                'flagCurah' => '2',
                'flagMigas' => '2',
                'kodeJenisPengangkutan' => '1',
                'kodeKantorMuat' => (string) $config->default_kode_kantor,
                'kodeKantorEkspor' => (string) $config->default_kode_kantor,
                'kodeKantorPeriksa' => (string) $config->default_kode_kantor,
                'kodeLokasi' => '2',
                'kodePelMuat' => $kodePelMuat,
                'kodePelEkspor' => $kodePelMuat,
                'kodePelTujuan' => $kodePelTujuan,
                'kodePelBongkar' => $kodePelTujuan,
                'kodeNegaraTujuan' => $this->payloadNormalizer->countryFromValue($kodePelTujuan),
                'tanggalEkspor' => $exportDate,
                'tanggalPeriksa' => $exportDate,
                'bankDevisa' => [[
                    'seriBank' => 1,
                    'kodeBank' => '9',
                ]],
                'kesiapanBarang' => [$this->exportReadinessRow($payload, $exportDate)],
            ]);
        }

        $payload = $this->payloadNormalizer->normalize($payload, $documentType);
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

    private function entityRows(CeisaCompanyConfig $config, Spk $spk, string $shipmentType, array &$warnings): array
    {
        $customer = $spk->customer;
        $identity = $this->identityFromCustomer($customer, $config);
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
            $warnings[] = 'Data entitas customer belum lengkap. Isi nama perusahaan, NPWP, NIB, dan alamat customer sebelum submit final.';
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

        if ($shipmentType === 'import') {
            $shipperName = trim((string) $spk->shipper);
            $shipperAddress = trim((string) ($spk->origin ?: $spk->port_of_loading));
            $countryCode = $this->payloadNormalizer->countryFromValue((string) ($spk->port_of_loading ?: $spk->origin));

            if ($shipperName === '') {
                $warnings[] = 'Data shipper/pengirim belum diisi. Lengkapi di form draft CEISA.';
            }

            if ($countryCode === '') {
                $warnings[] = 'Kode negara shipper/penjual belum terdeteksi. Isi dari kode pelabuhan muat atau data invoice.';
            }

            foreach ([
                ['code' => '9', 'fallback' => 'PENGIRIM'],
                ['code' => '10', 'fallback' => 'PENJUAL'],
            ] as $entity) {
                $rows[] = [
                    'seriEntitas' => count($rows) + 1,
                    'kodeEntitas' => $entity['code'],
                    'namaEntitas' => $shipperName ?: $entity['fallback'],
                    'alamatEntitas' => $shipperAddress ?: '-',
                    'kodeNegara' => $countryCode,
                    'kodeJenisIdentitas' => '6',
                    'nomorIdentitas' => '-',
                    'kodeAfiliasi' => 'TAH',
                ];
            }

            $rows[] = [
                'seriEntitas' => count($rows) + 1,
                'kodeEntitas' => '11',
                'namaEntitas' => $identity['name'],
                'alamatEntitas' => $identity['address'],
                'nomorIdentitas' => $identity['npwp16'],
                'kodeJenisIdentitas' => $identity['kodeJenisIdentitas'],
                'nitku' => $identity['nitku'],
                'nibEntitas' => $identity['nib'],
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

    private function identityFromCustomer(mixed $customer, CeisaCompanyConfig $config): array
    {
        $npwp16 = $this->toNpwp16(
            ($customer?->no_npwp_16 ?: $customer?->no_npwp)
                ?: ($config->npwp_16 ?: $config->npwp)
        );

        return [
            'name' => trim((string) ($customer?->nama_perusahaan ?: $config->ppjk_name)),
            'address' => (string) ($customer?->alamat_lengkap ?: $config->ppjk_address ?: '-'),
            'npwp16' => $npwp16,
            'nitku' => (string) ($npwp16 ? $this->toNitku($npwp16) : ''),
            'nib' => (string) ($customer?->nib ?: $config->nib ?: ''),
            'kodeJenisIdentitas' => '6',
            'kodeStatus' => '01',
            'kodeJenisApi' => '01',
        ];
    }

    private function documentRows(Spk $spk, string $shipmentType, string $today, array &$warnings): array
    {
        $documents = DocumentTrans::where('id_spk', $spk->id)
            ->whereNotNull('url_path_file')
            ->with('masterDocument')
            ->orderBy('id')
            ->get();

        $mappings = Schema::connection('tenant')->hasTable('ceisa_document_mappings')
            ? CeisaDocumentMapping::where('is_active', true)
                ->with('document')
                ->where(function ($query) use ($shipmentType) {
                    $query->whereNull('shipment_type')
                        ->orWhere('shipment_type', $shipmentType);
                })
                ->get()
                ->sortBy(fn (CeisaDocumentMapping $mapping) => $mapping->shipment_type === $shipmentType ? 1 : 0)
                ->keyBy('id_dokumen')
            : collect();

        if ($documents->isEmpty()) {
            $warnings[] = 'Belum ada file dokumen yang terupload di SPK ini.';
        }

        $rows = $documents->values()->map(function (DocumentTrans $document) use ($mappings, $spk, $today, &$warnings) {
            $mapping = $mappings->get($document->id_dokumen);
            $name = (string) ($document->masterDocument?->nama_file ?: $document->nama_file);

            if (! $this->documentMappingResolver->shouldIncludeInDraft($mapping, $name)) {
                return null;
            }

            $kodeDokumen = $this->documentMappingResolver->codeFor($mapping, $name);

            if (! $kodeDokumen) {
                $warnings[] = "Kode dokumen CEISA untuk {$name} belum dimapping.";

                return null;
            }

            return [
                'seriDokumen' => 1,
                'kodeDokumen' => (string) $kodeDokumen,
                'nomorDokumen' => $this->documentNumber($document, $spk),
                'tanggalDokumen' => optional($document->ori_date)->toDateString()
                    ?: optional($document->upload_date)->toDateString()
                    ?: optional($document->created_at)->toDateString()
                    ?: $today,
            ];
        })->filter()->values()->all();

        return $this->ensureRequiredDocumentRows($rows, $spk, $shipmentType, $today, $warnings, $mappings);
    }

    private function ensureRequiredDocumentRows(array $rows, Spk $spk, string $shipmentType, string $today, array &$warnings, $mappings): array
    {
        $requiredRows = $mappings
            ->filter(fn (CeisaDocumentMapping $mapping) => $mapping->is_required_for_submit)
            ->map(function (CeisaDocumentMapping $mapping) use ($shipmentType) {
                $name = (string) ($mapping->document?->nama_file ?: $mapping->document?->nama_dokumen ?: '');
                $code = $this->documentMappingResolver->codeFor($mapping, $name);

                if (! $code || ! $this->documentMappingResolver->shouldIncludeInDraft($mapping, $name)) {
                    return null;
                }

                if ($shipmentType === 'export' && in_array((string) $code, ['705', '740'], true)) {
                    return null;
                }

                return [
                    'code' => (string) $code,
                    'name' => $name ?: "dokumen {$code}",
                ];
            })
            ->filter()
            ->values();

        if ($requiredRows->isEmpty()) {
            $requiredRows = collect([
                ['code' => '380', 'name' => 'invoice'],
            ]);

            if ($shipmentType === 'import') {
                $requiredRows->push(['code' => '705', 'name' => 'B/L atau AWB']);
            }
        }

        if ($shipmentType === 'export') {
            $requiredRows = $requiredRows
                ->filter(fn (array $row) => in_array((string) $row['code'], ['380', '217'], true))
                ->values();

            foreach ([['code' => '380', 'name' => 'Invoice'], ['code' => '217', 'name' => 'Packing List']] as $requiredExportDocument) {
                if (! $requiredRows->contains(fn (array $row) => (string) $row['code'] === $requiredExportDocument['code'])) {
                    $requiredRows->push($requiredExportDocument);
                }
            }
        }

        foreach ($requiredRows as $required) {
            $code = (string) $required['code'];
            $exists = $code === '705' && $shipmentType === 'import'
                ? collect($rows)->contains(fn (array $row) => in_array($row['kodeDokumen'] ?? null, ['705', '740'], true))
                : collect($rows)->contains(fn (array $row) => ($row['kodeDokumen'] ?? null) === $code);

            if ($exists) {
                continue;
            }

            $label = $code === '705' && $shipmentType === 'import' ? 'B/L 705 atau AWB 740' : trim((string) $required['name']);
            $fallbackCode = $code === '705' && $shipmentType === 'import' ? '705' : $code;
            $warnings[] = "Dokumen {$label} belum terdeteksi. Isi nomor dan tanggal dokumen di form draft CEISA.";
            $rows[] = [
                'seriDokumen' => count($rows) + 1,
                'kodeDokumen' => $fallbackCode,
                'nomorDokumen' => (string) ($spk->spk_code ?: '-'),
                'tanggalDokumen' => $today,
            ];
        }

        return collect($rows)->values()
            ->map(fn (array $row, int $index) => array_merge($row, ['seriDokumen' => $index + 1]))
            ->all();
    }

    private function documentNumber(DocumentTrans $document, Spk $spk): string
    {
        $mapped = trim((string) $document->mapping_insw);

        if ($mapped !== '') {
            return $mapped;
        }

        $fileBase = trim((string) pathinfo((string) $document->nama_file, PATHINFO_FILENAME));

        $masterName = trim((string) ($document->masterDocument?->nama_file ?: ''));
        if ($fileBase !== '' && $masterName !== '' && $this->sameDocumentName($fileBase, $masterName)) {
            return '';
        }

        return $fileBase !== '' ? $fileBase : ((string) $spk->spk_code ?: '-');
    }

    private function sameDocumentName(string $left, string $right): bool
    {
        $normalize = fn (string $value): string => preg_replace('/[^a-z0-9]+/', '', Str::lower($value)) ?: '';

        return $normalize($left) === $normalize($right);
    }

    private function barangRows(Spk $spk, array &$warnings, array $kemasanRows, string $originCountry): array
    {
        $hsCodes = $spk->hsCodes;
        $kemasanQty = (int) ($kemasanRows[0]['jumlahKemasan'] ?? 1);
        $kemasanCode = (string) ($kemasanRows[0]['kodeJenisKemasan'] ?? 'PK');

        if ($hsCodes->isEmpty()) {
            $warnings[] = 'Belum ada HS Code. Payload membuat 1 baris barang placeholder.';

            return [$this->barangRow(1, '', (string) ($spk->comodity ?: 'BARANG'), $kemasanQty, $kemasanCode, $originCountry)];
        }

        return $hsCodes->values()
            ->map(fn ($hsCode, int $index) => $this->barangRow(
                $index + 1,
                preg_replace('/\D+/', '', (string) $hsCode->hs_code),
                (string) ($spk->comodity ?: 'BARANG'),
                $kemasanQty,
                $kemasanCode,
                $originCountry
            ))
            ->all();
    }

    private function barangRow(int $seri, string $posTarif, string $uraian, int $kemasanQty, string $kemasanCode, string $originCountry): array
    {
        return [
            'seriBarang' => $seri,
            'posTarif' => $posTarif,
            'uraian' => $uraian,
            'jumlahSatuan' => 1,
            'kodeSatuanBarang' => 'PCE',
            'hargaSatuan' => 0,
            'fob' => 0,
            'freight' => 0,
            'asuransi' => 0,
            'cif' => 0,
            'netto' => 0,
            'beratBersih' => 0,
            'jumlahKemasan' => max(1, $kemasanQty),
            'kodeJenisKemasan' => $kemasanCode ?: 'PK',
            'merk' => $uraian ?: 'MERK',
            'tipe' => 'BARU',
            'kodeKondisiBarang' => '1',
            'kodeNegaraAsal' => $originCountry,
            'saldoAwal' => 1,
            'saldoAkhir' => 1,
            'metodePenentuanNilai' => 'Metode 1',
            'alasanMetodePenentuanNilai' => null,
            'statementPerbedaanHarga' => 'T',
            'pernyataanLartas' => 'Y',
            'barangTarif' => [],
            'barangVd' => [],
        ];
    }

    private function kemasanRows(Spk $spk): array
    {
        $partyQty = (int) $spk->parties->sum(fn ($party) => (int) $party->party_qty);

        return [[
            'seriKemasan' => 1,
            'kodeJenisKemasan' => 'PK',
            'jumlahKemasan' => max(1, $partyQty),
            'merkKemasan' => (string) ($spk->comodity ?: 'PACKAGE'),
        ]];
    }

    private function informasiKomponenBiayaRow(): array
    {
        return [
            'jenisNilai' => '1',
            'hargaInvoice' => 0,
            'pembayaranTidakLangsung' => 0,
            'diskon' => 0,
            'komisiPenjualan' => 0,
            'biayaPengemasan' => 0,
            'biayaPengepakan' => 0,
            'assist' => 0,
            'royalti' => 0,
            'proceeds' => 0,
            'biayaTransportasi' => 0,
            'biayaPemuatan' => 0,
            'asuransi' => 0,
            'garansi' => 0,
            'biayaKepentinganSendiri' => 0,
            'biayaPascaImpor' => 0,
            'biayaPajakInternal' => 0,
            'bunga' => 0,
            'deviden' => 0,
        ];
    }

    private function exportReadinessRow(array $payload, string $date): array
    {
        $containerCount = (int) ($payload['jumlahKontainer'] ?? 0);

        return [
            'kodeJenisBarang' => '1',
            'kodeJenisGudang' => '2',
            'namaPic' => (string) ($payload['namaTtd'] ?? 'PIC'),
            'alamat' => (string) ($payload['kotaTtd'] ?? '-'),
            'nomorTelpPic' => '0000000000',
            'lokasiSiapPeriksa' => (string) ($payload['kotaTtd'] ?? '-'),
            'kodeCaraStuffing' => $containerCount > 0 ? '8' : '7',
            'kodeJenisPartOf' => '2',
            'tanggalPkb' => $date,
            'waktuSiapPeriksa' => "{$date}T08:00:00.000Z",
            'jumlahContainer20' => $containerCount,
            'jumlahContainer40' => 0,
        ];
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

        if ($this->shipmentType($spk) === 'import' && ! collect($documents)->contains(fn (array $row) => in_array($row['kodeDokumen'] ?? null, ['705', '740'], true))) {
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
