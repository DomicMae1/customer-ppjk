<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaSubmission;
use App\Models\Spk;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CeisaSubmissionService
{
    public function __construct(
        private readonly CeisaClient $client,
        private readonly CeisaNomorAjuGenerator $nomorAjuGenerator
    ) {}

    public function submit(
        CeisaCompanyConfig $config,
        Spk $spk,
        array $payload,
        bool $isFinal = false,
        bool $isRevision = false,
        ?int $submittedBy = null,
        ?string $documentType = null
    ): CeisaSubmission {
        $this->assertConfigBelongsToSpk($config, $spk);

        $shipmentType = $this->normalizeShipmentType((string) $spk->shipment_type);
        $documentType = $documentType ?: $this->documentTypeForShipment($shipmentType);
        $payload = $this->ensureNomorAju($config, $payload, $documentType);
        $nomorAju = (string) Arr::get($payload, 'nomorAju');

        $submission = CeisaSubmission::firstOrNew([
            'nomor_aju' => $nomorAju,
        ]);

        $submission->fill([
            'id_spk' => $spk->id,
            'id_perusahaan' => $spk->id_perusahaan,
            'ceisa_company_config_id' => $config->id,
            'shipment_type' => $shipmentType,
            'document_type' => $documentType,
            'mode' => $isFinal ? 'final' : 'draft',
            'is_final' => $isFinal,
            'is_revision' => $isRevision,
            'request_payload' => $payload,
            'status' => 'pending',
            'submitted_by' => $submittedBy,
            'submitted_at' => now(),
        ]);
        $submission->save();

        $result = $this->client->submitDocument($config, $payload, $isFinal, $isRevision);

        $submission->forceFill([
            'id_header' => $result['id_header'] ?? $submission->id_header,
            'response_payload' => $result['data'] ?? null,
            'status' => $this->statusFromResult($result, $isFinal),
            'error_code' => $result['ok'] ? null : (string) ($result['body_status'] ?? $result['http_status'] ?? ''),
            'error_message' => $result['ok'] ? null : ($result['message'] ?? 'CEISA submission gagal.'),
        ])->save();

        return $submission->refresh();
    }

    private function assertConfigBelongsToSpk(CeisaCompanyConfig $config, Spk $spk): void
    {
        if ((int) $config->id_perusahaan !== (int) $spk->id_perusahaan) {
            throw new InvalidArgumentException('Konfigurasi CEISA tidak sesuai dengan perusahaan SPK.');
        }
    }

    private function ensureNomorAju(CeisaCompanyConfig $config, array $payload, string $documentType): array
    {
        $nomorAju = Arr::get($payload, 'nomorAju');

        if (is_string($nomorAju) && $this->nomorAjuGenerator->isValid($nomorAju)) {
            return $payload;
        }

        $kodeKantor = (string) (Arr::get($payload, 'kodeKantor') ?: $config->default_kode_kantor);
        $companyCode = (string) $config->company_code;

        if ($kodeKantor === '' || $companyCode === '') {
            throw new InvalidArgumentException('Kode kantor dan kode perusahaan CEISA wajib ada untuk generate nomor aju.');
        }

        $payload['nomorAju'] = $this->nomorAjuGenerator->generate($kodeKantor, $documentType, $companyCode);

        return $payload;
    }

    private function statusFromResult(array $result, bool $isFinal): string
    {
        if (! $result['ok']) {
            return $isFinal ? 'error' : 'draft_error';
        }

        return $isFinal ? 'submitted' : 'draft';
    }

    private function normalizeShipmentType(string $shipmentType): string
    {
        $normalized = Str::lower(trim($shipmentType));

        return Str::contains($normalized, ['export', 'ekspor']) ? 'export' : 'import';
    }

    private function documentTypeForShipment(string $shipmentType): string
    {
        return $shipmentType === 'export' ? 'BC30' : 'BC20';
    }
}
