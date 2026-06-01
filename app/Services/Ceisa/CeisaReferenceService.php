<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaReferenceCache;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class CeisaReferenceService
{
    public function __construct(
        private readonly CeisaClient $client,
        private readonly CeisaPortReferenceFallback $portFallback
    ) {}

    public function get(
        CeisaCompanyConfig $config,
        string $referencePath,
        array $query = [],
        int $ttlMinutes = 1440,
        bool $forceRefresh = false
    ): array {
        $lookupKey = hash('sha256', $referencePath.'|'.json_encode($query));

        if (! $forceRefresh) {
            $cached = CeisaReferenceCache::query()
                ->where('id_perusahaan', $config->id_perusahaan)
                ->where('environment', $config->environment)
                ->where('reference_type', $referencePath)
                ->where('lookup_key', $lookupKey)
                ->where(function ($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->first();

            if ($cached) {
                $result = [
                    'ok' => true,
                    'cached' => true,
                    'message' => 'Referensi CEISA diambil dari cache.',
                    'data' => $cached->response_payload,
                ];

                return $this->withPortKeywordFallback($referencePath, $result);
            }
        }

        $result = $this->client->getReference($config, $referencePath, $query);

        $result = $this->withPortKeywordFallback($referencePath, $result);

        if ($result['ok']) {
            CeisaReferenceCache::updateOrCreate(
                [
                    'id_perusahaan' => $config->id_perusahaan,
                    'environment' => $config->environment,
                    'reference_type' => $referencePath,
                    'lookup_key' => $lookupKey,
                ],
                [
                    'request_params' => $query,
                    'response_payload' => $result['data'],
                    'fetched_at' => now(),
                    'expires_at' => $ttlMinutes > 0 ? now()->addMinutes($ttlMinutes) : null,
                ]
            );
        }

        return $result + ['cached' => false];
    }

    private function withPortKeywordFallback(string $referencePath, array $result): array
    {
        if (! $this->shouldApplyPortKeywordFallback($referencePath, $result)) {
            return $result;
        }

        $fallback = $this->portFallback->payloadForKeyword($this->portKeywordFromPath($referencePath));

        if (! $fallback) {
            return $result;
        }

        $result['data'] = $fallback;
        $result['message'] = 'success (local port fallback)';

        return $result;
    }

    private function shouldApplyPortKeywordFallback(string $referencePath, array $result): bool
    {
        if (! ($result['ok'] ?? false) || ! Str::startsWith($referencePath, '/openapi/pelabuhan/kata/')) {
            return false;
        }

        $payload = Arr::get($result, 'data');
        $rows = is_array($payload) && array_is_list($payload)
            ? $payload
            : Arr::get($result, 'data.data');

        return is_array($rows) && count($rows) === 0;
    }

    private function portKeywordFromPath(string $referencePath): string
    {
        return rawurldecode(Str::after($referencePath, '/openapi/pelabuhan/kata/'));
    }
}
