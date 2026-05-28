<?php

use App\Services\Ceisa\CeisaNomorAjuGenerator;
use Carbon\CarbonImmutable;

test('it generates a valid import nomor aju', function () {
    $generator = new CeisaNomorAjuGenerator;

    $nomorAju = $generator->generate(
        kodeKantor: '040300',
        documentType: 'BC 2.0',
        companyCode: 'ABC123',
        date: CarbonImmutable::create(2026, 5, 28),
        sequence: 42
    );

    expect($nomorAju)
        ->toBe('040320ABC12320260528000042')
        ->and(strlen($nomorAju))
        ->toBe(26)
        ->and($generator->isValid($nomorAju))
        ->toBeTrue();
});

test('it rejects incomplete ceisa company code', function () {
    $generator = new CeisaNomorAjuGenerator;

    $generator->generate('040300', 'import', '123', CarbonImmutable::create(2026, 5, 28), 1);
})->throws(InvalidArgumentException::class);
