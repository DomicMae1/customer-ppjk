<?php

namespace App\Services\Ceisa;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class CeisaImportPayloadNormalizer
{
    private const IMPORT_ENTITY_ORDER = ['1', '7', '9', '10', '11', '4'];

    private const NULLABLE_SUBMIT_FIELDS = ['alasanMetodePenentuanNilai'];

    private const VALID_TUTUP_PU = ['11', '12', '14'];

    private const VALID_CARA_BAYAR = [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17',
    ];

    private const VALID_JENIS_IMPOR = ['1', '2', '5', '9'];

    private const VALID_JENIS_NILAI = ['IMB', 'IOA', 'KMD', 'KON', 'LAI', 'PMK', 'RLC', 'SLC', 'ULC', 'WSI'];

    private const KNOWN_COUNTRY_CODES = [
        'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AN', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
        'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
        'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
        'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
        'GA', 'GB', 'GD', 'GE', 'GF', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY',
        'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JM', 'JO', 'JP',
        'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
        'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
        'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
        'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
        'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
        'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
    ];

    private const COUNTRY_ALIASES = [
        'ANDORRA' => 'AD',
        'UNITED ARAB EMIRATES' => 'AE',
        'DUBAI' => 'AE',
        'JEBEL ALI' => 'AE',
        'ARGENTINA' => 'AR',
        'AUSTRALIA' => 'AU',
        'BELGIUM' => 'BE',
        'ANTWERP' => 'BE',
        'BRUNEI' => 'BN',
        'BRAZIL' => 'BR',
        'CANADA' => 'CA',
        'SWITZERLAND' => 'CH',
        'CHINA' => 'CN',
        'SHANGHAI' => 'CN',
        'NINGBO' => 'CN',
        'SHENZHEN' => 'CN',
        'QINGDAO' => 'CN',
        'XIAMEN' => 'CN',
        'GUANGZHOU' => 'CN',
        'GERMANY' => 'DE',
        'HAMBURG' => 'DE',
        'SPAIN' => 'ES',
        'FRANCE' => 'FR',
        'UNITED KINGDOM' => 'GB',
        'ENGLAND' => 'GB',
        'HONG KONG' => 'HK',
        'HONGKONG' => 'HK',
        'INDONESIA' => 'ID',
        'JAKARTA' => 'ID',
        'TANJUNG PRIOK' => 'ID',
        'SURABAYA' => 'ID',
        'TANJUNG PERAK' => 'ID',
        'BELAWAN' => 'ID',
        'CIGADING' => 'ID',
        'CILACAP' => 'ID',
        'INDIA' => 'IN',
        'NHAVA' => 'IN',
        'NHAVA SHEVA' => 'IN',
        'MUNDRA' => 'IN',
        'CHENNAI' => 'IN',
        'MUMBAI' => 'IN',
        'ITALY' => 'IT',
        'JAPAN' => 'JP',
        'KOBE' => 'JP',
        'YOKOHAMA' => 'JP',
        'KOREA' => 'KR',
        'SOUTH KOREA' => 'KR',
        'BUSAN' => 'KR',
        'MALAYSIA' => 'MY',
        'PORT KLANG' => 'MY',
        'KLANG' => 'MY',
        'NETHERLANDS' => 'NL',
        'ROTTERDAM' => 'NL',
        'NEW ZEALAND' => 'NZ',
        'PHILIPPINES' => 'PH',
        'MANILA' => 'PH',
        'PAKISTAN' => 'PK',
        'KARACHI' => 'PK',
        'SAUDI ARABIA' => 'SA',
        'SINGAPORE' => 'SG',
        'THAILAND' => 'TH',
        'BANGKOK' => 'TH',
        'TAIWAN' => 'TW',
        'KAOHSIUNG' => 'TW',
        'TURKEY' => 'TR',
        'UNITED STATES' => 'US',
        'USA' => 'US',
        'AMERICA' => 'US',
        'VIETNAM' => 'VN',
        'HO CHI MINH' => 'VN',
        'SOUTH AFRICA' => 'ZA',
    ];

    public function normalizeForSubmit(array $payload, ?string $documentType = null): array
    {
        return $this->normalizeNulls($this->normalize($payload, $documentType));
    }

    public function normalize(array $payload, ?string $documentType = null): array
    {
        $payload['kodeValuta'] = $this->currencyCode($payload['kodeValuta'] ?? null);

        if ($this->isImportPayload($payload, $documentType)) {
            $originCountry = $this->originCountry($payload);
            $legacyJenisNilai = $this->jenisNilaiCode($payload['kodeCaraBayar'] ?? null);

            $payload['kodeJenisPib'] = $this->codeFromReference($payload['kodeJenisPib'] ?? null, ['1', '2'], '1');
            $payload['kodeJenisImpor'] = $this->codeFromReference($payload['kodeJenisImpor'] ?? null, self::VALID_JENIS_IMPOR, '1');
            $payload['kodeCaraBayar'] = $this->codeFromReference($payload['kodeCaraBayar'] ?? null, self::VALID_CARA_BAYAR, '2');
            $payload['kodeJenisNilai'] = $this->jenisNilaiCode($payload['kodeJenisNilai'] ?? null) ?: ($legacyJenisNilai ?: 'LAI');
            $payload['kodeTutupPu'] = $this->tutupPuCode($payload['kodeTutupPu'] ?? null);
            $payload['entitas'] = $this->normalizeImportEntities($payload['entitas'] ?? [], $originCountry);
            $payload['barang'] = $this->normalizeImportGoods($payload['barang'] ?? [], $originCountry, $payload['kodeValuta']);
        }

        return $payload;
    }

    public function validateDraft(array $payload, ?string $documentType = null): array
    {
        if (! $this->isImportPayload($payload, $documentType)) {
            return [];
        }

        $errors = [];

        if (! in_array((string) ($payload['kodeTutupPu'] ?? ''), self::VALID_TUTUP_PU, true)) {
            $errors[] = 'Kode Tutup PU wajib salah satu dari 11, 12, atau 14.';
        }

        if (! in_array((string) ($payload['kodeJenisImpor'] ?? ''), self::VALID_JENIS_IMPOR, true)) {
            $errors[] = 'Kode jenis impor wajib mengikuti referensi CEISA, misalnya 1 untuk UNTUK DIPAKAI.';
        }

        if (! in_array((string) ($payload['kodeCaraBayar'] ?? ''), self::VALID_CARA_BAYAR, true)) {
            $errors[] = 'Kode cara pembayaran wajib kode numerik referensi CEISA.';
        }

        if (! in_array((string) ($payload['kodeJenisNilai'] ?? ''), self::VALID_JENIS_NILAI, true)) {
            $errors[] = 'Kode jenis transaksi wajib mengikuti referensi CEISA, misalnya LAI.';
        }

        $entitiesByCode = collect($payload['entitas'] ?? [])
            ->filter(fn ($entity) => is_array($entity))
            ->keyBy(fn (array $entity) => (string) ($entity['kodeEntitas'] ?? ''));

        foreach (['9' => 'Pengirim', '10' => 'Penjual'] as $code => $label) {
            $country = $entitiesByCode->get($code)['kodeNegara'] ?? null;

            if (! $this->isCountryCode($country)) {
                $errors[] = "Kode negara {$label} wajib 2 huruf sesuai referensi CEISA.";
            }
        }

        $entities = array_values(array_filter($payload['entitas'] ?? [], fn ($entity) => is_array($entity)));

        if (($entities[4]['kodeEntitas'] ?? null) !== '11') {
            $errors[] = 'Urutan entitas BC 2.0 belum sesuai: entitas ke-5 harus kodeEntitas 11.';
        }

        foreach (array_values($payload['barang'] ?? []) as $index => $barang) {
            if (! is_array($barang)) {
                continue;
            }

            $seri = $index + 1;

            if (! array_key_exists('alasanMetodePenentuanNilai', $barang)) {
                $errors[] = "Barang {$seri}: alasanMetodePenentuanNilai wajib ada walaupun nilainya kosong.";
            }

            if (! $this->isCountryCode($barang['kodeNegaraAsal'] ?? null)) {
                $errors[] = "Barang {$seri}: kode negara asal wajib 2 huruf sesuai referensi CEISA.";
            }
        }

        return array_values(array_unique($errors));
    }

    public function countryFromValue(?string $value): string
    {
        $value = strtoupper(trim((string) $value));

        if ($value === '') {
            return '';
        }

        $alnum = preg_replace('/[^A-Z0-9]+/', '', $value) ?: '';
        $letters = preg_replace('/[^A-Z]+/', '', $value) ?: '';

        if (strlen($letters) === 2 && $this->isCountryCode($letters)) {
            return $letters;
        }

        if (strlen($alnum) >= 5 && $this->isCountryCode(substr($alnum, 0, 2))) {
            return substr($alnum, 0, 2);
        }

        foreach (self::COUNTRY_ALIASES as $needle => $country) {
            $needleAlnum = preg_replace('/[^A-Z0-9]+/', '', $needle) ?: $needle;

            if (Str::contains($value, $needle) || Str::contains($alnum, $needleAlnum)) {
                return $country;
            }
        }

        return '';
    }

    public function isCountryCode(mixed $value): bool
    {
        return is_string($value)
            && preg_match('/^[A-Z]{2}$/', $value) === 1
            && in_array($value, self::KNOWN_COUNTRY_CODES, true);
    }

    private function isImportPayload(array $payload, ?string $documentType): bool
    {
        $documentType = Str::upper((string) $documentType);
        $kodeDokumen = Str::upper((string) ($payload['kodeDokumen'] ?? ''));

        return Str::contains($documentType, ['BC20', 'BC 2.0', 'IMPORT', 'IMPOR'])
            || in_array($kodeDokumen, ['20', 'BC20', 'BC 2.0'], true)
            || array_key_exists('kodeJenisImpor', $payload);
    }

    private function currencyCode(mixed $value): string
    {
        $code = preg_replace('/[^A-Z]/', '', strtoupper(trim((string) $value))) ?: '';

        return strlen($code) === 3 ? $code : 'USD';
    }

    private function tutupPuCode(mixed $value): string
    {
        $code = trim((string) $value);

        return in_array($code, self::VALID_TUTUP_PU, true) ? $code : '11';
    }

    private function codeFromReference(mixed $value, array $validCodes, string $default): string
    {
        $code = strtoupper(trim((string) $value));

        if (preg_match('/^\d+/', $code, $match) === 1) {
            $code = (string) ((int) $match[0]);
        } else {
            $code = preg_replace('/[^A-Z0-9]+/', '', $code) ?: '';
        }

        return in_array($code, $validCodes, true) ? $code : $default;
    }

    private function jenisNilaiCode(mixed $value): string
    {
        $code = preg_replace('/[^A-Z]+/', '', strtoupper(trim((string) $value))) ?: '';

        return in_array($code, self::VALID_JENIS_NILAI, true) ? $code : '';
    }

    private function originCountry(array $payload): string
    {
        foreach ([
            Arr::get($payload, 'kodePelMuat'),
            Arr::get($payload, 'pelabuhanMuat'),
            Arr::get($payload, 'portOfLoading'),
            Arr::get($payload, 'origin'),
            Arr::get($payload, 'entitas.2.kodeNegara'),
            Arr::get($payload, 'entitas.3.kodeNegara'),
            Arr::get($payload, 'barang.0.kodeNegaraAsal'),
        ] as $candidate) {
            $country = $this->countryFromValue(is_scalar($candidate) ? (string) $candidate : null);

            if ($country !== '') {
                return $country;
            }
        }

        return '';
    }

    private function normalizeImportEntities(mixed $entities, string $originCountry): array
    {
        $entities = collect(is_array($entities) ? $entities : [])
            ->filter(fn ($entity) => is_array($entity))
            ->values();

        $byCode = $entities->keyBy(fn (array $entity) => (string) ($entity['kodeEntitas'] ?? ''));

        $importir = $this->entityWithDefaults($byCode->get('1', []), '1');
        $pemilik = $this->entityWithDefaults($byCode->get('7', $this->entityFrom($importir, '7')), '7');
        $pengirim = $this->entityWithDefaults($byCode->get('9', []), '9', $originCountry);
        $penjual = $this->entityWithDefaults($byCode->get('10', []), '10', $originCountry);
        $pemusatan = $this->entityWithDefaults($this->pemusatanEntity($byCode->get('11', []), $importir), '11');
        $ppjk = $byCode->has('4') ? $this->entityWithDefaults($byCode->get('4', []), '4') : null;

        $ordered = collect([
            '1' => $importir,
            '7' => $pemilik,
            '9' => $pengirim,
            '10' => $penjual,
            '11' => $pemusatan,
            '4' => $ppjk,
        ])
            ->filter(fn ($entity, string $code) => $entity !== null && in_array($code, self::IMPORT_ENTITY_ORDER, true))
            ->values()
            ->all();

        foreach ($ordered as $index => &$entity) {
            $entity['seriEntitas'] = $index + 1;
        }

        return $ordered;
    }

    private function entityWithDefaults(array $entity, string $code, string $originCountry = ''): array
    {
        $entity['kodeEntitas'] = $code;

        if ($code === '1') {
            $entity = array_merge([
                'namaEntitas' => '',
                'alamatEntitas' => '',
                'nomorIdentitas' => '',
                'kodeJenisIdentitas' => '6',
                'nitku' => '',
                'nibEntitas' => '',
                'kodeStatus' => '01',
                'kodeJenisApi' => '01',
            ], $entity);
        } elseif ($code === '7') {
            $entity = array_merge([
                'namaEntitas' => '',
                'alamatEntitas' => '',
                'nomorIdentitas' => '',
                'kodeJenisIdentitas' => '6',
                'nitku' => '',
                'kodeAfiliasi' => 'TAH',
            ], $entity);
        } elseif (in_array($code, ['9', '10'], true)) {
            $entity = array_merge([
                'namaEntitas' => $code === '9' ? 'PENGIRIM' : 'PENJUAL',
                'alamatEntitas' => '-',
                'kodeNegara' => $originCountry,
                'kodeJenisIdentitas' => '6',
                'nomorIdentitas' => '-',
                'kodeAfiliasi' => 'TAH',
            ], $entity);

            $country = $this->countryFromValue((string) ($entity['kodeNegara'] ?? '')) ?: $originCountry;
            $entity['kodeNegara'] = $country;
        } elseif ($code === '11') {
            $entity = array_merge([
                'namaEntitas' => '',
                'alamatEntitas' => '',
                'nomorIdentitas' => '',
                'kodeJenisIdentitas' => '6',
                'nitku' => '',
                'nibEntitas' => '',
            ], $entity);

            unset($entity['kodeNegara'], $entity['kodeAfiliasi']);
        } elseif ($code === '4') {
            $entity = array_merge([
                'namaEntitas' => '',
                'alamatEntitas' => '',
                'nomorIdentitas' => '',
                'kodeJenisIdentitas' => '6',
                'nitku' => '',
                'nibEntitas' => '',
                'kodeNegara' => 'ID',
                'kodeStatus' => '01',
                'kodeJenisApi' => '01',
            ], $entity);
        }

        return $entity;
    }

    private function pemusatanEntity(array $existing, array $importir): array
    {
        $fallback = $this->entityFrom($importir, '11');

        if ($existing === []) {
            return $fallback;
        }

        if (array_key_exists('kodeNegara', $existing) && ! $this->blankReferenceValue($fallback['nomorIdentitas'] ?? null)) {
            $existing = array_merge($existing, $fallback);
        }

        foreach (['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'kodeJenisIdentitas', 'nitku', 'nibEntitas'] as $field) {
            if ($this->blankReferenceValue($existing[$field] ?? null) && ! $this->blankReferenceValue($fallback[$field] ?? null)) {
                $existing[$field] = $fallback[$field];
            }
        }

        return $existing;
    }

    private function blankReferenceValue(mixed $value): bool
    {
        return trim((string) $value) === '' || trim((string) $value) === '-';
    }

    private function entityFrom(array $source, string $code): array
    {
        return array_filter([
            'kodeEntitas' => $code,
            'namaEntitas' => $source['namaEntitas'] ?? null,
            'alamatEntitas' => $source['alamatEntitas'] ?? null,
            'nomorIdentitas' => $source['nomorIdentitas'] ?? null,
            'kodeJenisIdentitas' => $source['kodeJenisIdentitas'] ?? null,
            'nitku' => $source['nitku'] ?? null,
            'nibEntitas' => $source['nibEntitas'] ?? null,
            'kodeNegara' => $source['kodeNegara'] ?? null,
            'kodeAfiliasi' => $source['kodeAfiliasi'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function normalizeImportGoods(mixed $goods, string $originCountry, string $currencyCode): array
    {
        return collect(is_array($goods) ? $goods : [])
            ->filter(fn ($item) => is_array($item))
            ->values()
            ->map(function (array $item, int $index) use ($originCountry, $currencyCode) {
                $country = $this->countryFromValue((string) ($item['kodeNegaraAsal'] ?? '')) ?: $originCountry;

                $item['seriBarang'] = $index + 1;
                $item['kodeNegaraAsal'] = $country;
                $item['metodePenentuanNilai'] = $item['metodePenentuanNilai'] ?? 'Metode 1';

                if (! array_key_exists('alasanMetodePenentuanNilai', $item)) {
                    $item['alasanMetodePenentuanNilai'] = null;
                }

                if (empty($item['barangVd']) || ! is_array($item['barangVd'])) {
                    $nilaiBarang = (float) ($item['fob'] ?? $item['cif'] ?? 0);
                    $item['barangVd'] = [[
                        'seriBarangVd' => 1,
                        'kodeJenisVd' => 'NTR',
                        'nilaiBarangVd' => $nilaiBarang,
                        'kodeValuta' => $currencyCode,
                        'ndpbm' => 0,
                    ]];
                }

                return $item;
            })
            ->all();
    }

    private function normalizeNulls(mixed $value, ?string $key = null): mixed
    {
        if (is_array($value)) {
            foreach ($value as $childKey => $childValue) {
                $value[$childKey] = $this->normalizeNulls($childValue, is_string($childKey) ? $childKey : null);
            }

            return $value;
        }

        if ($value === null && ! in_array($key, self::NULLABLE_SUBMIT_FIELDS, true)) {
            return '';
        }

        return $value;
    }
}
