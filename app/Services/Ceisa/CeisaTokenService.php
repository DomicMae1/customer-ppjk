<?php

namespace App\Services\Ceisa;

use App\Models\CeisaCompanyConfig;
use App\Models\CeisaTokenCache;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CeisaTokenService
{
    private const LOGIN_PATH = '/nle-oauth/v1/user/login';

    private const REFRESH_PATH = '/nle-oauth/v1/user/update-token';

    private const DEFAULT_TOKEN_TTL_SECONDS = 300;

    private const DEFAULT_REFRESH_TTL_SECONDS = 86400;

    public function getAccessToken(CeisaCompanyConfig $config, bool $forceRefresh = false): string
    {
        $tokenCache = $config->tokenCache()->first();

        if (! $forceRefresh && $this->hasValidAccessToken($tokenCache)) {
            return (string) $tokenCache->access_token;
        }

        if (! $forceRefresh && $this->hasRefreshToken($tokenCache)) {
            try {
                return $this->refresh($config, $tokenCache);
            } catch (Throwable $exception) {
                Log::warning('CEISA refresh token failed; falling back to login.', [
                    'ceisa_company_config_id' => $config->id,
                    'id_perusahaan' => $config->id_perusahaan,
                    'message' => Str::limit($exception->getMessage(), 300),
                ]);
            }
        }

        return $this->login($config);
    }

    public function login(CeisaCompanyConfig $config): string
    {
        $this->assertLoginCredentials($config);

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(30)
            ->post($this->endpoint($config, self::LOGIN_PATH), [
                'username' => $config->username,
                'password' => $config->password,
            ]);

        $payload = $this->decodeResponse($response);

        if (! $response->successful()) {
            $this->storeLastError($config, $payload, $response->status());

            throw new CeisaCredentialException('Login CEISA gagal: '.$this->messageFromPayload($payload, $response->status()));
        }

        $item = $this->tokenItem($payload);
        $accessToken = $this->tokenValue($item, ['access_token', 'accessToken']);

        if (! is_string($accessToken) || trim($accessToken) === '') {
            $this->storeLastError($config, [
                'message' => 'Login CEISA berhasil, tetapi access_token tidak ditemukan pada response.',
                'response_keys' => $this->payloadKeys($payload),
            ], $response->status());

            throw new CeisaCredentialException('Login CEISA tidak mengembalikan access token.');
        }

        $this->saveTokenCache($config, $item);
        $config->forceFill([
            'last_verified_at' => now(),
            'last_error' => null,
        ])->save();

        return $accessToken;
    }

    public function refresh(CeisaCompanyConfig $config, CeisaTokenCache $tokenCache): string
    {
        $refreshToken = (string) $tokenCache->refresh_token;

        if (trim($refreshToken) === '') {
            throw new CeisaCredentialException('Refresh token CEISA belum tersedia.');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->withHeaders([
                'Authorization' => $refreshToken,
            ])
            ->timeout(30)
            ->post($this->endpoint($config, self::REFRESH_PATH));

        $payload = $this->decodeResponse($response);

        if (! $response->successful()) {
            $this->storeTokenError($tokenCache, $payload, $response->status());

            throw new CeisaCredentialException('Refresh token CEISA gagal: '.$this->messageFromPayload($payload, $response->status()));
        }

        $item = $this->tokenItem($payload);
        $accessToken = $this->tokenValue($item, ['access_token', 'accessToken']);

        if (! is_string($accessToken) || trim($accessToken) === '') {
            $this->storeTokenError($tokenCache, [
                'message' => 'Refresh token CEISA berhasil, tetapi access_token tidak ditemukan pada response.',
                'response_keys' => $this->payloadKeys($payload),
            ], $response->status());

            throw new CeisaCredentialException('Refresh token CEISA tidak mengembalikan access token.');
        }

        $item['refresh_token'] = $this->tokenValue($item, ['refresh_token', 'refreshToken']) ?? $refreshToken;
        $this->saveTokenCache($config, $item);

        return $accessToken;
    }

    private function hasValidAccessToken(?CeisaTokenCache $tokenCache): bool
    {
        return $tokenCache?->access_token
            && $tokenCache->expires_at
            && $tokenCache->expires_at->isFuture()
            && $tokenCache->expires_at->greaterThan(now()->addSeconds(30));
    }

    private function hasRefreshToken(?CeisaTokenCache $tokenCache): bool
    {
        if (! $tokenCache?->refresh_token) {
            return false;
        }

        return ! $tokenCache->refresh_expires_at || $tokenCache->refresh_expires_at->greaterThan(now()->addMinute());
    }

    private function assertLoginCredentials(CeisaCompanyConfig $config): void
    {
        if (! $config->is_active) {
            throw new CeisaCredentialException('Konfigurasi CEISA perusahaan tidak aktif.');
        }

        if (! $config->username || ! $config->password) {
            throw new CeisaCredentialException('Username/password CEISA belum lengkap untuk perusahaan ini.');
        }
    }

    private function saveTokenCache(CeisaCompanyConfig $config, array $item): CeisaTokenCache
    {
        return CeisaTokenCache::updateOrCreate(
            ['ceisa_company_config_id' => $config->id],
            [
                'access_token' => $this->tokenValue($item, ['access_token', 'accessToken']),
                'refresh_token' => $this->tokenValue($item, ['refresh_token', 'refreshToken']),
                'token_type' => $this->tokenValue($item, ['token_type', 'tokenType']) ?: 'Bearer',
                'expires_at' => $this->accessTokenExpiry($item),
                'refresh_expires_at' => $this->refreshTokenExpiry($item),
                'last_refreshed_at' => now(),
                'last_error' => null,
            ]
        );
    }

    private function accessTokenExpiry(array $item): CarbonImmutable
    {
        $ttl = (int) Arr::get($item, 'expires_in', Arr::get($item, 'expiresIn', self::DEFAULT_TOKEN_TTL_SECONDS));

        if ($ttl <= 0) {
            $ttl = self::DEFAULT_TOKEN_TTL_SECONDS;
        }

        $ttl = min($ttl, self::DEFAULT_TOKEN_TTL_SECONDS);

        return CarbonImmutable::now()->addSeconds(max(30, $ttl - 30));
    }

    private function refreshTokenExpiry(array $item): CarbonImmutable
    {
        $ttl = (int) Arr::get($item, 'refresh_expires_in', Arr::get($item, 'refreshExpiresIn', self::DEFAULT_REFRESH_TTL_SECONDS));

        if ($ttl <= 0) {
            $ttl = self::DEFAULT_REFRESH_TTL_SECONDS;
        }

        return CarbonImmutable::now()->addSeconds($ttl);
    }

    private function endpoint(CeisaCompanyConfig $config, string $path): string
    {
        return rtrim($config->base_url ?: 'https://apis-gw.beacukai.go.id', '/').'/'.ltrim($path, '/');
    }

    private function decodeResponse(Response $response): array
    {
        $json = $response->json();

        if (is_array($json)) {
            return $json;
        }

        return [
            'raw_text' => Str::limit($response->body(), 2000),
        ];
    }

    private function tokenItem(array $payload): array
    {
        $item = Arr::get($payload, 'item')
            ?? Arr::get($payload, 'data.item')
            ?? Arr::get($payload, 'data')
            ?? Arr::get($payload, 'result')
            ?? $payload;

        if (is_string($item)) {
            $decoded = json_decode($item, true);
            $item = is_array($decoded) ? $decoded : [];
        }

        return is_array($item) ? $item : [];
    }

    private function tokenValue(array $item, array $keys): mixed
    {
        foreach ($keys as $key) {
            $value = Arr::get($item, $key);

            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        foreach ($item as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), array_map('strtolower', $keys), true) && $value !== '') {
                return $value;
            }

            if (is_array($value)) {
                $nestedValue = $this->tokenValue($value, $keys);

                if ($nestedValue !== null && $nestedValue !== '') {
                    return $nestedValue;
                }
            }
        }

        return null;
    }

    private function payloadKeys(array $payload): string
    {
        $keys = array_keys($payload);

        return implode(', ', array_slice(array_map('strval', $keys), 0, 20));
    }

    private function storeLastError(CeisaCompanyConfig $config, array $payload, int $status): void
    {
        $config->forceFill([
            'last_error' => $this->messageFromPayload($payload, $status),
        ])->save();
    }

    private function storeTokenError(CeisaTokenCache $tokenCache, array $payload, int $status): void
    {
        $tokenCache->forceFill([
            'last_error' => $this->messageFromPayload($payload, $status),
        ])->save();
    }

    private function messageFromPayload(array $payload, int $status): string
    {
        $message = Arr::get($payload, 'message')
            ?? Arr::get($payload, 'msg')
            ?? Arr::get($payload, 'error_description')
            ?? Arr::get($payload, 'error')
            ?? Arr::get($payload, 'raw_text')
            ?? "HTTP {$status}";

        if (is_array($message)) {
            $message = json_encode($this->redactTokenPayload($message));
        }

        return Str::limit((string) $message, 1000);
    }

    private function redactTokenPayload(array $payload): array
    {
        foreach ($payload as $key => $value) {
            $normalized = strtolower((string) $key);

            if (in_array($normalized, ['access_token', 'accesstoken', 'refresh_token', 'refreshtoken', 'password'], true)) {
                $payload[$key] = '[redacted]';

                continue;
            }

            if (is_array($value)) {
                $payload[$key] = $this->redactTokenPayload($value);
            }
        }

        return $payload;
    }
}
