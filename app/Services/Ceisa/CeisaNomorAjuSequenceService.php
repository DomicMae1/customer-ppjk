<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaNomorAjuSequence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class CeisaNomorAjuSequenceService
{
    public function __construct(private readonly CeisaNomorAjuGenerator $generator) {}

    public function next(CeisaCompanyConfig $config, string $documentType, ?CarbonInterface $date = null, ?string $kodeKantorOverride = null): string
    {
        $kodeKantor = trim($kodeKantorOverride ?: (string) $config->default_kode_kantor);
        $companyCode = trim((string) $config->company_code);

        if ($kodeKantor === '' || $companyCode === '') {
            throw new InvalidArgumentException('Kode kantor dan company code CEISA wajib diisi sebelum membuat nomor aju.');
        }

        $sequenceDate = ($date ?? now())->toDateString();
        $normalizedDocumentType = Str::upper(str_replace([' ', '.', '-'], '', trim($documentType)));

        return DB::connection('tako-user')->transaction(function () use ($config, $kodeKantor, $companyCode, $normalizedDocumentType, $sequenceDate, $date) {
            $scope = [
                'id_perusahaan' => (int) $config->id_perusahaan,
                'environment' => $config->environment ?: 'production',
                'kode_kantor' => $kodeKantor,
                'document_type' => $normalizedDocumentType,
                'sequence_date' => $sequenceDate,
            ];

            CeisaNomorAjuSequence::firstOrCreate($scope, ['last_sequence' => 0]);

            $sequence = CeisaNomorAjuSequence::where($scope)
                ->lockForUpdate()
                ->firstOrFail();

            $next = (int) $sequence->last_sequence + 1;

            if ($next > 999999) {
                throw new RuntimeException('Sequence nomor aju harian sudah mencapai batas 999999.');
            }

            $sequence->forceFill(['last_sequence' => $next])->save();

            return $this->generator->generate($kodeKantor, $normalizedDocumentType, $companyCode, $date, $next);
        });
    }
}
