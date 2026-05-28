<?php

namespace App\Services\Ceisa;

class CeisaNumberFormatter
{
    public static function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }

    public static function normalizeNpwp(?string $npwp): string
    {
        return self::digits($npwp);
    }

    public static function toNpwp16(?string $npwp): string
    {
        $digits = self::normalizeNpwp($npwp);

        if (strlen($digits) === 15) {
            return '0'.$digits;
        }

        return $digits;
    }

    public static function toNitku(?string $npwp, string $branchCode = '00000'): string
    {
        $npwp16 = self::toNpwp16($npwp);

        if ($npwp16 === '') {
            return '';
        }

        $branch = str_pad(substr(self::digits($branchCode), 0, 5), 5, '0', STR_PAD_RIGHT);

        return $npwp16.$branch;
    }

    public static function ceisaCompanyCode(?string $companyCode): string
    {
        return substr(strtoupper(preg_replace('/[^A-Z0-9]/i', '', (string) $companyCode) ?? ''), 0, 6);
    }

    public static function kodeKantorForNomorAju(?string $kodeKantor): string
    {
        $digits = self::digits($kodeKantor);

        return str_pad(substr($digits, 0, 4), 4, '0', STR_PAD_RIGHT);
    }
}
