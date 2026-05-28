<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaReferenceCache;

class CeisaReferenceService
{
    public function __construct(private readonly CeisaClient $client) {}

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
                return [
                    'ok' => true,
                    'cached' => true,
                    'message' => 'Referensi CEISA diambil dari cache.',
                    'data' => $cached->response_payload,
                ];
            }
        }

        $result = $this->client->getReference($config, $referencePath, $query);

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
}
