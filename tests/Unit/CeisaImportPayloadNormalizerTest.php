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
