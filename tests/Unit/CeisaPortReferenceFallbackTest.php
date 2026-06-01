<?php

use App\Services\Ceisa\CeisaPortReferenceFallback;

test('it returns tanjung perak for ceisa portal style keywords', function (string $keyword) {
    $fallback = new CeisaPortReferenceFallback;

    $rows = $fallback->searchByKeyword($keyword);

    expect($rows)
        ->toHaveCount(1)
        ->and($rows[0]['kodePelabuhan'])
        ->toBe('IDTPE')
        ->and($rows[0]['namaPelabuhan'])
        ->toBe('TANJUNG PERAK')
        ->and($rows[0]['kodeKantor'])
        ->toBe('070100')
        ->and($rows[0]['kodeNegara'])
        ->toBe('ID');
})->with([
    'IDTPE',
    'idtpe',
    'TPE',
    'tanjung perak',
    'perak',
    'surabaya',
]);

test('it returns null payload when local port fallback has no match', function () {
    $fallback = new CeisaPortReferenceFallback;

    expect($fallback->payloadForKeyword('unknown-port'))->toBeNull();
});
