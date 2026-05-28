<?php

use App\Services\Ceisa\CeisaNumberFormatter;

test('it normalizes npwp to sixteen digits and nitku', function () {
    expect(CeisaNumberFormatter::toNpwp16('12.345.678.9-012.345'))
        ->toBe('0123456789012345')
        ->and(CeisaNumberFormatter::toNitku('12.345.678.9-012.345'))
        ->toBe('012345678901234500000');
});

test('it normalizes ceisa company and kantor codes', function () {
    expect(CeisaNumberFormatter::ceisaCompanyCode(' ab-12_3x '))
        ->toBe('AB123X')
        ->and(CeisaNumberFormatter::kodeKantorForNomorAju('040300'))
        ->toBe('0403');
});
