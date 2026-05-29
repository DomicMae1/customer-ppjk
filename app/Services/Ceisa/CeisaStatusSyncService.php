<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaResponseDocument;
use App\Models\CeisaStatusLog;
use App\Models\CeisaSubmission;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CeisaStatusSyncService
{
    public function __construct(private readonly CeisaClient $client) {}

    public function syncSubmission(CeisaSubmission $submission, CeisaCompanyConfig $config): CeisaSubmission
    {
        $result = $this->client->getStatusByNomorAju($config, $submission->nomor_aju);

        if (! $result['ok']) {
            $submission->forceFill([
                'last_synced_at' => now(),
                'error_code' => (string) ($result['body_status'] ?? $result['http_status'] ?? ''),
                'error_message' => $result['message'] ?? 'Cek status CEISA gagal.',
            ])->save();

            return $submission->refresh();
        }

        return $this->applyStatusResult($submission, $result);
    }

    public function applyStatusResult(CeisaSubmission $submission, array $result): CeisaSubmission
    {
        $payload = is_array($result['data'] ?? null) ? $result['data'] : [];
        $logs = [];

        foreach ($this->extractRecords($payload, ['dataStatus', 'data.dataStatus', 'item.dataStatus']) as $record) {
            $logs[] = $this->upsertStatusLog($submission, 'status', $record);
        }

        foreach ($this->extractRecords($payload, ['dataRespon', 'data.dataRespon', 'item.dataRespon']) as $record) {
            $logs[] = $this->upsertStatusLog($submission, 'respon', $record);
        }

        $this->storePdfPayloads($submission, $logs, $payload);

        $submission->forceFill([
            'response_payload' => $this->stripPdfBase64($payload),
            'status' => $this->deriveSubmissionStatus($submission, $logs),
            'last_synced_at' => now(),
            'error_code' => null,
            'error_message' => null,
        ])->save();

        return $submission->refresh();
    }

    private function extractRecords(array $payload, array $paths): array
    {
        foreach ($paths as $path) {
            $value = Arr::get($payload, $path);

            if (is_array($value)) {
                return $this->asRecordList($value);
            }
        }

        return [];
    }

    private function asRecordList(array $value): array
    {
        if ($value === []) {
            return [];
        }

        if (array_is_list($value)) {
            return array_values(array_filter($value, 'is_array'));
        }

        return [$value];
    }

    private function upsertStatusLog(CeisaSubmission $submission, string $source, array $record): CeisaStatusLog
    {
        $kodeStatus = $this->firstString($record, ['kodeStatus', 'kode_status', 'status', 'statusDokumen']);
        $kodeRespon = $this->firstString($record, ['kodeRespon', 'kode_respon']);
        $nomorRespon = $this->firstString($record, ['nomorRespon', 'nomor_respon']);

        return CeisaStatusLog::updateOrCreate(
            [
                'ceisa_submission_id' => $submission->id,
                'nomor_aju' => $submission->nomor_aju,
                'source' => $source,
                'kode_status' => $kodeStatus,
                'kode_respon' => $kodeRespon,
                'nomor_respon' => $nomorRespon,
            ],
            [
                'nomor_daftar' => $this->firstString($record, ['nomorDaftar', 'nomor_daftar']),
                'tanggal_daftar' => $this->parseDate($this->firstValue($record, ['tanggalDaftar', 'tanggal_daftar'])),
                'tanggal_respon' => $this->parseDate($this->firstValue($record, ['tanggalRespon', 'tanggal_respon'])),
                'waktu_status' => $this->parseDateTime($this->firstValue($record, ['waktuStatus', 'waktu_status', 'createdAt'])),
                'waktu_respon' => $this->parseDateTime($this->firstValue($record, ['waktuRespon', 'waktu_respon'])),
                'keterangan' => $this->firstString($record, ['keterangan', 'uraian', 'message']),
                'pesan' => $this->firstValue($record, ['pesan', 'dataValidasi', 'errors']),
                'raw_payload' => $this->stripPdfBase64($record),
            ]
        );
    }

    private function storePdfPayloads(CeisaSubmission $submission, array $logs, array $payload): void
    {
        $pdfPayloads = [];
        $this->collectPdfPayloads($payload, $pdfPayloads);
        $latestLog = collect($logs)->filter()->last();

        foreach ($pdfPayloads as $pdfPayload) {
            $this->storePdf($submission, $latestLog instanceof CeisaStatusLog ? $latestLog : null, $pdfPayload);
        }
    }

    private function collectPdfPayloads(array $payload, array &$pdfPayloads, array $context = []): void
    {
        foreach ($payload as $key => $value) {
            if (strtolower((string) $key) === 'pdf' && is_string($value) && trim($value) !== '') {
                $pdfPayloads[] = [
                    'base64' => $value,
                    'context' => $this->stripPdfBase64($context ?: $payload),
                ];

                continue;
            }

            if (is_array($value)) {
                $this->collectPdfPayloads($value, $pdfPayloads, $value);
            }
        }
    }

    private function storePdf(CeisaSubmission $submission, ?CeisaStatusLog $statusLog, array $pdfPayload): ?CeisaResponseDocument
    {
        $base64 = preg_replace('/^data:application\/pdf;base64,/', '', trim((string) $pdfPayload['base64']));
        $bytes = base64_decode((string) $base64, true);

        if ($bytes === false) {
            return null;
        }

        $hash = hash('sha256', $bytes);
        $existing = CeisaResponseDocument::where('ceisa_submission_id', $submission->id)
            ->where('sha256', $hash)
            ->first();

        if ($existing) {
            return $existing;
        }

        $context = is_array($pdfPayload['context'] ?? null) ? $pdfPayload['context'] : [];
        $responseType = $this->firstString($context, ['jenisRespon', 'responseType', 'kodeRespon']) ?: 'response';
        $fileName = $submission->nomor_aju.'-'.Str::slug($responseType).'-'.substr($hash, 0, 12).'.pdf';
        $path = 'ceisa/responses/'.$submission->nomor_aju.'/'.$fileName;

        Storage::disk('local')->put($path, $bytes);

        return CeisaResponseDocument::create([
            'ceisa_submission_id' => $submission->id,
            'ceisa_status_log_id' => $statusLog?->id,
            'response_type' => $responseType,
            'kode_respon' => $this->firstString($context, ['kodeRespon', 'kode_respon']),
            'nomor_respon' => $this->firstString($context, ['nomorRespon', 'nomor_respon']),
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_name' => $fileName,
            'mime_type' => 'application/pdf',
            'sha256' => $hash,
            'size_bytes' => strlen($bytes),
            'raw_base64_available' => true,
        ]);
    }

    private function deriveSubmissionStatus(CeisaSubmission $submission, array $logs): string
    {
        if ($submission->responseDocuments()->exists()) {
            return 'responded';
        }

        if (collect($logs)->contains(fn ($log) => $log instanceof CeisaStatusLog && $log->source === 'respon')) {
            return 'responded';
        }

        return 'synced';
    }

    private function stripPdfBase64(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (strtolower((string) $key) === 'pdf') {
                $payload[$key] = '[base64 omitted]';

                continue;
            }

            if (is_array($value)) {
                $payload[$key] = $this->stripPdfBase64($value);
            }
        }

        return $payload;
    }

    private function firstString(array $data, array $paths): ?string
    {
        $value = $this->firstValue($data, $paths);

        return is_scalar($value) && trim((string) $value) !== '' ? trim((string) $value) : null;
    }

    private function firstValue(array $data, array $paths): mixed
    {
        foreach ($paths as $path) {
            $value = Arr::get($data, $path);

            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function parseDate(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function parseDateTime(mixed $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }
}
