<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CeisaClient
{
    public function __construct(private readonly CeisaTokenService $tokens) {}

    public function submitDocument(
        CeisaCompanyConfig $config,
        array $payload,
        bool $isFinal = false,
        bool $isRevision = false
    ): array {
        $query = [
            'isFinal' => $isFinal ? 'true' : 'false',
        ];

        if ($isRevision) {
            $query['isRevision'] = 'true';
        }

        $response = $this->authorizedRequest($config)
            ->post($this->endpoint($config, '/openapi/document').'?'.http_build_query($query), $payload);

        return $this->normalizeResponse($response, [
            'nomor_aju' => Arr::get($payload, 'nomorAju'),
        ]);
    }

    public function getStatusByNomorAju(CeisaCompanyConfig $config, string $nomorAju): array
    {
        $response = $this->authorizedRequest($config)
            ->get($this->endpoint($config, '/openapi/status/'.rawurlencode($nomorAju)));

        return $this->normalizeResponse($response);
    }

    public function getStatusByCompany(CeisaCompanyConfig $config, ?string $idPerusahaan = null): array
    {
        $companyIdentifier = $idPerusahaan ?: ($config->npwp_16 ?: $config->npwp);

        if (! $companyIdentifier) {
            throw new CeisaCredentialException('NPWP/idPerusahaan CEISA belum diisi untuk cek status.');
        }

        $response = $this->authorizedRequest($config)
            ->get($this->endpoint($config, '/openapi/status'), [
                'idPerusahaan' => $companyIdentifier,
            ]);

        return $this->normalizeResponse($response);
    }

    public function getReference(CeisaCompanyConfig $config, string $referencePath, array $query = []): array
    {
        $path = str_starts_with($referencePath, '/')
            ? $referencePath
            : '/openapi/referensi/'.ltrim($referencePath, '/');

        $response = $this->authorizedRequest($config)
            ->get($this->endpoint($config, $path), $query);

        return $this->normalizeResponse($response);
    }

    private function authorizedRequest(CeisaCompanyConfig $config): PendingRequest
    {
        $this->assertGatewayCredentials($config);

        $headers = [
            'Authorization' => 'Bearer '.$this->tokens->getAccessToken($config),
            'Content-Type' => 'application/json',
        ];

        if ($config->api_key) {
            $headers['nle-api-key'] = $config->api_key;
        }

        if ($config->app_id) {
            $headers['nle-app-id'] = $config->app_id;
        }

        if ($config->origin_url) {
            $headers['Origin'] = $config->origin_url;
        }

        if ($config->id_platform) {
            $headers['id_platform'] = $config->id_platform;
        }

        return Http::acceptJson()
            ->asJson()
            ->withHeaders($headers)
            ->timeout(60);
    }

    private function assertGatewayCredentials(CeisaCompanyConfig $config): void
    {
        if (! $config->is_active) {
            throw new CeisaCredentialException('Konfigurasi CEISA perusahaan tidak aktif.');
        }

        if (! $config->api_key) {
            throw new CeisaCredentialException('API key CEISA belum diisi untuk perusahaan ini.');
        }
    }

    private function endpoint(CeisaCompanyConfig $config, string $path): string
    {
        return rtrim($config->base_url ?: 'https://apis-gw.beacukai.go.id', '/').'/'.ltrim($path, '/');
    }

    private function normalizeResponse(Response $response, array $extra = []): array
    {
        $data = $this->decodeResponse($response);
        $bodyStatus = Arr::get($data, 'status', Arr::get($data, 'code', Arr::get($data, 'responseCode')));
        $bodyError = $this->bodyIndicatesError($bodyStatus, $data);
        $ok = $response->successful() && ! $bodyError;

        return [
            'ok' => $ok,
            'http_status' => $response->status(),
            'body_status' => $bodyStatus,
            'message' => $this->messageFromPayload($data, $response->status(), $ok),
            'id_header' => $this->firstString($data, ['idHeader', 'id_header', 'data.idHeader', 'item.idHeader']),
            'nomor_aju' => $extra['nomor_aju'] ?? $this->firstString($data, ['nomorAju', 'nomor_aju', 'nopen', 'data.nomorAju', 'item.nomorAju']),
            'data' => $this->redactSensitivePayload($data),
        ];
    }

    private function decodeResponse(Response $response): array
    {
        $json = $response->json();

        if (is_array($json)) {
            return $json;
        }

        return [
            'raw_text' => Str::limit($response->body(), 4000),
        ];
    }

    private function bodyIndicatesError(mixed $bodyStatus, array $data): bool
    {
        if ($this->hasNonEmptyValue($data, 'errors') || $this->hasNonEmptyValue($data, 'error')) {
            return true;
        }

        if ($bodyStatus === null || $bodyStatus === '') {
            return false;
        }

        if (is_bool($bodyStatus)) {
            return ! $bodyStatus;
        }

        $normalized = strtoupper(trim((string) $bodyStatus));

        return ! in_array($normalized, ['OK', '200', 'SUCCESS', 'SUKSES', 'TRUE', 'BERHASIL'], true);
    }

    private function hasNonEmptyValue(array $data, string $path): bool
    {
        $value = Arr::get($data, $path);

        return ! ($value === null || $value === '' || $value === []);
    }

    private function messageFromPayload(array $data, int $status, bool $ok): string
    {
        $message = $this->firstValue($data, [
            'message',
            'msg',
            'keterangan',
            'error_description',
            'errors.0.message',
            'error',
            'raw_text',
        ]);

        if ($message === null) {
            return $ok ? 'CEISA request berhasil.' : "CEISA request gagal (HTTP {$status}).";
        }

        if (is_array($message)) {
            $message = json_encode($this->redactSensitivePayload($message));
        }

        return Str::limit((string) $message, 1000);
    }

    private function firstString(array $data, array $paths): ?string
    {
        $value = $this->firstValue($data, $paths);

        return is_scalar($value) && (string) $value !== '' ? (string) $value : null;
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

    private function redactSensitivePayload(array $payload): array
    {
        foreach ($payload as $key => $value) {
            $normalized = strtolower(str_replace(['-', '_'], '', (string) $key));

            if (in_array($normalized, ['authorization', 'nleapikey', 'nleappid', 'apikey', 'appid', 'password', 'accesstoken', 'refreshtoken'], true)) {
                $payload[$key] = '[redacted]';

                continue;
            }

            if (is_array($value)) {
                $payload[$key] = $this->redactSensitivePayload($value);
            }
        }

        return $payload;
    }
}
