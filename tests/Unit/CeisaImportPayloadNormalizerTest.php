<?php

use App\Services\Ceisa\CeisaImportPayloadNormalizer;

test('it normalizes bc20 draft fields rejected by ceisa validation', function () {
    $normalizer = new CeisaImportPayloadNormalizer;

    $payload = [
        'kodeDokumen' => '20',
        'kodeJenisImpor' => '01',
        'kodeCaraBayar' => 'KMD',
        'kodeJenisNilai' => '',
        'kodePelMuat' => 'NHAVA SHEVA',
        'kodeValuta' => 'usd',
        'kodeTutupPu' => '',
        'entitas' => [
            [
                'seriEntitas' => 1,
                'kodeEntitas' => '1',
                'namaEntitas' => 'PT IMPORTIR',
                'alamatEntitas' => 'SURABAYA',
                'nomorIdentitas' => '0123456789012345',
                'nibEntitas' => '1234567890123',
            ],
            [
                'seriEntitas' => 2,
                'kodeEntitas' => '7',
                'namaEntitas' => 'PT IMPORTIR',
                'alamatEntitas' => 'SURABAYA',
                'nomorIdentitas' => '0123456789012345',
            ],
            [
                'seriEntitas' => 3,
                'kodeEntitas' => '9',
                'namaEntitas' => 'SHIPPER',
                'alamatEntitas' => 'NHAVA SHEVA',
                'kodeNegara' => '',
            ],
            [
                'seriEntitas' => 4,
                'kodeEntitas' => '10',
                'namaEntitas' => 'SELLER',
                'alamatEntitas' => 'NHAVA SHEVA',
                'kodeNegara' => 'NH',
            ],
            [
                'seriEntitas' => 5,
                'kodeEntitas' => '4',
                'namaEntitas' => 'PPJK',
                'alamatEntitas' => 'SURABAYA',
                'nomorIdentitas' => '0123456789012345',
            ],
        ],
        'barang' => [
            [
                'seriBarang' => 1,
                'posTarif' => '84713090',
                'uraian' => 'LAPTOP',
                'kodeNegaraAsal' => '',
                'metodePenentuanNilai' => 'Metode 1',
            ],
        ],
    ];

    $normalized = $normalizer->normalizeForSubmit($payload, 'BC20');

    expect($normalized['kodeValuta'])
        ->toBe('USD')
        ->and($normalized['kodeJenisImpor'])
        ->toBe('1')
        ->and($normalized['kodeCaraBayar'])
        ->toBe('2')
        ->and($normalized['kodeJenisNilai'])
        ->toBe('KMD')
        ->and($normalized['kodeTutupPu'])
        ->toBe('11')
        ->and($normalized['entitas'][2]['kodeNegara'])
        ->toBe('IN')
        ->and($normalized['entitas'][3]['kodeNegara'])
        ->toBe('IN')
        ->and($normalized['entitas'][4]['kodeEntitas'])
        ->toBe('11')
        ->and($normalized['entitas'][4]['nomorIdentitas'])
        ->toBe('0123456789012345')
        ->and(array_key_exists('kodeNegara', $normalized['entitas'][4]))
        ->toBeFalse()
        ->and($normalized['entitas'][5]['kodeEntitas'])
        ->toBe('4')
        ->and($normalized['barang'][0]['kodeNegaraAsal'])
        ->toBe('IN')
        ->and(array_key_exists('alasanMetodePenentuanNilai', $normalized['barang'][0]))
        ->toBeTrue()
        ->and($normalizer->validateDraft($normalized, 'BC20'))
        ->toBe([]);
});

test('it derives country codes from common port values', function (string $value, string $expected) {
    $normalizer = new CeisaImportPayloadNormalizer;

    expect($normalizer->countryFromValue($value))->toBe($expected);
})->with([
    ['INNSA', 'IN'],
    ['NHAVA SHEVA', 'IN'],
    ['SURABAYA', 'ID'],
    ['SGSIN', 'SG'],
]);

test('it normalizes bc30 export draft fields required by ceisa schema', function () {
    $normalizer = new CeisaImportPayloadNormalizer;

    $normalized = $normalizer->normalizeForSubmit([
        'kodeDokumen' => '30',
        'kodeKantor' => '070100',
        'kodePelMuat' => 'IDTPE',
        'kodePelTujuan' => 'SAJED',
        'kodeJenisEkspor' => '1',
        'kodeJenisImpor' => '1',
        'kodeJenisNilai' => 'LAI',
        'kodeJenisPib' => '1',
        'kodeTutupPu' => '11',
        'kodeKategoriEkspor' => '10',
        'kodeCaraBayar' => '1',
        'tanggalAju' => '2026-06-01',
        'tanggalEkspor' => '2026-06-02',
        'jumlahKontainer' => 1,
        'namaTtd' => 'DESY TAKO',
        'kotaTtd' => 'SURABAYA',
        'entitas' => [
            [
                'kodeEntitas' => '1',
                'namaEntitas' => 'PT EXPORTIR',
                'alamatEntitas' => 'SURABAYA',
                'nomorIdentitas' => '0123456789012345',
                'kodeJenisIdentitas' => '6',
            ],
            ['kodeEntitas' => '7'],
            ['kodeEntitas' => '9', 'namaEntitas' => 'BUYER', 'alamatEntitas' => 'JEDDAH'],
            ['kodeEntitas' => '10', 'namaEntitas' => 'BUYER', 'alamatEntitas' => 'JEDDAH'],
        ],
        'barang' => [
            [
                'posTarif' => '12345678',
                'uraian' => 'BARANG EKSPOR',
            ],
        ],
        'dokumen' => [
            [
                'seriDokumen' => 1,
                'kodeDokumen' => '36',
                'nomorDokumen' => 'SI-001',
                'tanggalDokumen' => '2026-06-01',
            ],
            [
                'seriDokumen' => 2,
                'kodeDokumen' => '380',
                'nomorDokumen' => 'INV-001',
                'tanggalDokumen' => '2026-06-01',
            ],
        ],
        'pengangkut' => [[]],
    ], 'BC30');

    expect($normalized['flagBarkir'])
        ->toBe('T')
        ->and($normalized['flagCurah'])
        ->toBe('2')
        ->and($normalized['flagMigas'])
        ->toBe('2')
        ->and($normalized['kodeKantorEkspor'])
        ->toBe('070100')
        ->and($normalized['kodeKantorMuat'])
        ->toBe('070100')
        ->and($normalized['kodeLokasi'])
        ->toBe('2')
        ->and($normalized['kodePelEkspor'])
        ->toBe('IDTPE')
        ->and($normalized['kodePelBongkar'])
        ->toBe('SAJED')
        ->and($normalized['kodeNegaraTujuan'])
        ->toBe('SA')
        ->and($normalized['tanggalPeriksa'])
        ->toBe('2026-06-02')
        ->and($normalized['entitas'][0]['kodeEntitas'])
        ->toBe('2')
        ->and($normalized['entitas'][1]['kodeEntitas'])
        ->toBe('7')
        ->and($normalized['entitas'][2]['kodeEntitas'])
        ->toBe('8')
        ->and($normalized['entitas'][2]['kodeNegara'])
        ->toBe('SA')
        ->and($normalized['entitas'][3]['kodeEntitas'])
        ->toBe('6')
        ->and($normalized['barang'][0]['hargaPatokan'])
        ->toBe(0.0)
        ->and($normalized['barang'][0]['spesifikasiLain'])
        ->toBe('BARANG EKSPOR')
        ->and($normalized['barang'][0]['kodeJenisEkspor'])
        ->toBe('1')
        ->and($normalized['barang'][0]['kodePelEkspor'])
        ->toBe('IDTPE')
        ->and($normalized['bankDevisa'][0]['kodeBank'])
        ->toBe('9')
        ->and($normalized['kesiapanBarang'][0]['tanggalPkb'])
        ->toBe('2026-06-02')
        ->and($normalized['pengangkut'][0]['kodeBendera'])
        ->toBe('ID')
        ->and($normalized['dokumen'][0]['kodeDokumen'])
        ->toBe('380')
        ->and($normalized['dokumen'][0]['seriDokumen'])
        ->toBe(1)
        ->and($normalized['dokumen'][1]['kodeDokumen'])
        ->toBe('36')
        ->and($normalized['dokumen'][1]['seriDokumen'])
        ->toBe(2)
        ->and(array_key_exists('kodeJenisImpor', $normalized))
        ->toBeFalse()
        ->and(array_key_exists('kodeJenisNilai', $normalized))
        ->toBeFalse()
        ->and(array_key_exists('kodeJenisPib', $normalized))
        ->toBeFalse()
        ->and(array_key_exists('kodeTutupPu', $normalized))
        ->toBeFalse()
        ->and($normalizer->validateDraft($normalized, 'BC30'))
        ->toBe([]);
});

test('it replaces foreign pemusatan leftovers with importir identity', function () {
    $normalizer = new CeisaImportPayloadNormalizer;

    $normalized = $normalizer->normalizeForSubmit([
        'kodeDokumen' => '20',
        'kodePelMuat' => 'MYNTL',
        'entitas' => [
            [
                'kodeEntitas' => '1',
                'namaEntitas' => 'PT IMPORTIR',
                'alamatEntitas' => 'SURABAYA',
                'nomorIdentitas' => '0123456789012345',
                'kodeJenisIdentitas' => '6',
                'nitku' => '0123456789012345000000',
                'nibEntitas' => '1234567890123',
            ],
            ['kodeEntitas' => '7'],
            ['kodeEntitas' => '9', 'kodeNegara' => 'MY'],
            ['kodeEntitas' => '10', 'kodeNegara' => 'MY'],
            [
                'kodeEntitas' => '11',
                'namaEntitas' => 'FOREIGN SELLER',
                'alamatEntitas' => 'MALAYSIA',
                'nomorIdentitas' => '-',
                'kodeNegara' => 'MY',
            ],
        ],
        'barang' => [['kodeNegaraAsal' => 'MY']],
    ], 'BC20');

    expect($normalized['entitas'][4]['kodeEntitas'])
        ->toBe('11')
        ->and($normalized['entitas'][4]['namaEntitas'])
        ->toBe('PT IMPORTIR')
        ->and($normalized['entitas'][4]['nomorIdentitas'])
        ->toBe('0123456789012345')
        ->and(array_key_exists('kodeNegara', $normalized['entitas'][4]))
        ->toBeFalse();
});
