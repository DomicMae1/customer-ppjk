<?php

namespace App\Services\Ceisa;

use Carbon\CarbonInterface;
use InvalidArgumentException;

class CeisaNomorAjuGenerator
{
    private const DOCUMENT_CODES = [
        'import' => '20',
        'impor' => '20',
        'pib' => '20',
        'bc20' => '20',
        'bc2.0' => '20',
        'export' => '30',
        'ekspor' => '30',
        'peb' => '30',
        'bc30' => '30',
        'bc3.0' => '30',
    ];

    public function generate(
        string $kodeKantor,
        string $documentType,
        string $companyCode,
        ?CarbonInterface $date = null,
        ?int $sequence = null
    ): string {
        $kantor = CeisaNumberFormatter::kodeKantorForNomorAju($kodeKantor);
        $kodeDokumen = $this->resolveDocumentCode($documentType);
        $company = CeisaNumberFormatter::ceisaCompanyCode($companyCode);

        if (strlen($company) !== 6) {
            throw new InvalidArgumentException('Kode perusahaan CEISA harus 6 karakter.');
        }

        $day = ($date ?? now())->format('Ymd');
        $seq = str_pad((string) (($sequence ?? random_int(1, 999999)) % 1000000), 6, '0', STR_PAD_LEFT);

        $nomorAju = "{$kantor}{$kodeDokumen}{$company}{$day}{$seq}";

        if (! $this->isValid($nomorAju)) {
            throw new InvalidArgumentException('Nomor aju CEISA tidak valid.');
        }

        return $nomorAju;
    }

    public function isValid(?string $nomorAju): bool
    {
        return is_string($nomorAju) && preg_match('/^\d{4}[A-Z0-9]{2}[A-Z0-9]{6}\d{14}$/', $nomorAju) === 1;
    }

    public function resolveDocumentCode(string $documentType): string
    {
        $normalized = strtolower(str_replace([' ', '_', '-'], '', trim($documentType)));

        if (preg_match('/^[A-Z0-9]{2}$/i', $documentType) === 1) {
            return strtoupper($documentType);
        }

        if (! isset(self::DOCUMENT_CODES[$normalized])) {
            throw new InvalidArgumentException('Tipe dokumen CEISA tidak dikenali.');
        }

        return self::DOCUMENT_CODES[$normalized];
    }
}
