<?php

namespace App\Http\Controllers;

use App\Models\CeisaCompanyConfig;
use App\Models\Perusahaan;
use App\Services\AdminCompanyContextService;
use App\Services\Ceisa\CeisaClient;
use App\Services\Ceisa\CeisaNumberFormatter;
use App\Services\Ceisa\CeisaReferenceService;
use App\Services\Ceisa\CeisaTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CeisaSettingController extends Controller
{
    private const REFERENCE_LOOKUPS = [
        'kurs' => ['kode_valuta'],
        'hs_lartas' => ['kode_hs'],
        'tarif_hs' => ['kode_hs', 'tanggal'],
        'pelabuhan_kata' => ['kata'],
        'gudang_tps_kode_kantor' => ['kode_kantor'],
        'pelabuhan_kode_kantor' => ['kode_kantor'],
        'manifes_bc11' => ['nomor_bl', 'tanggal_bl', 'kode_kantor', 'nama_importir'],
    ];

    public function index(): Response
    {
        $user = auth('web')->user();
        $this->authorizeAdmin($user);

        $companies = Perusahaan::select('id_perusahaan', 'nama_perusahaan')
            ->orderBy('nama_perusahaan')
            ->get();

        return Inertia::render('ceisa_settings/page', [
            'companies' => $companies,
            'selectedCompanyId' => app(AdminCompanyContextService::class)->selectedCompanyIdForUser($user),
        ]);
    }

    public function show(Request $request, int $idPerusahaan): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $environment = $request->query('environment', 'production');
        $config = CeisaCompanyConfig::where('id_perusahaan', $idPerusahaan)
            ->where('environment', $environment)
            ->first();

        return response()->json([
            'config' => $config ? $this->serializeConfig($config) : null,
        ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeAdmin($user);

        $validated = $request->validate([
            'id_perusahaan' => ['required', 'integer', 'exists:perusahaan,id_perusahaan'],
            'environment' => ['required', Rule::in(['development', 'production'])],
            'base_url' => ['nullable', 'url', 'max:255'],
            'origin_url' => ['nullable', 'url', 'max:255'],
            'id_platform' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:5000'],
            'app_id' => ['nullable', 'string', 'max:5000'],
            'username' => ['nullable', 'string', 'max:5000'],
            'password' => ['nullable', 'string', 'max:5000'],
            'company_code' => ['nullable', 'string', 'max:6'],
            'id_pengguna' => ['nullable', 'string', 'max:255'],
            'npwp' => ['nullable', 'string', 'max:32'],
            'npwp_16' => ['nullable', 'string', 'max:32'],
            'nib' => ['nullable', 'string', 'max:32'],
            'ppjk_name' => ['nullable', 'string', 'max:255'],
            'ppjk_address' => ['nullable', 'string'],
            'ppjk_npwp' => ['nullable', 'string', 'max:32'],
            'ppjk_npwp_16' => ['nullable', 'string', 'max:32'],
            'ppjk_nib' => ['nullable', 'string', 'max:32'],
            'default_kode_kantor' => ['nullable', 'string', 'max:10'],
            'default_kode_tps' => ['nullable', 'string', 'max:50'],
            'default_signer_name' => ['nullable', 'string', 'max:255'],
            'default_signer_title' => ['nullable', 'string', 'max:255'],
            'default_signer_city' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);

        $config = CeisaCompanyConfig::firstOrNew([
            'id_perusahaan' => $validated['id_perusahaan'],
            'environment' => $validated['environment'],
        ]);

        $plainFields = Arr::except($validated, ['api_key', 'app_id', 'username', 'password']);
        $plainFields['base_url'] = $plainFields['base_url'] ?: $this->defaultBaseUrl($validated['environment']);
        $plainFields['company_code'] = $this->nullableUpperAlnum($plainFields['company_code'] ?? null);
        $plainFields['npwp'] = CeisaNumberFormatter::normalizeNpwp($plainFields['npwp'] ?? null) ?: null;
        $plainFields['npwp_16'] = CeisaNumberFormatter::toNpwp16($plainFields['npwp_16'] ?? $plainFields['npwp'] ?? null) ?: null;
        $plainFields['ppjk_npwp'] = CeisaNumberFormatter::normalizeNpwp($plainFields['ppjk_npwp'] ?? null) ?: null;
        $plainFields['ppjk_npwp_16'] = CeisaNumberFormatter::toNpwp16($plainFields['ppjk_npwp_16'] ?? $plainFields['ppjk_npwp'] ?? null) ?: null;
        $plainFields['updated_by'] = $user->getKey();

        if (! $config->exists) {
            $plainFields['created_by'] = $user->getKey();
        }

        $config->fill($plainFields);

        foreach (['api_key', 'app_id', 'username', 'password'] as $secretField) {
            if (filled($validated[$secretField] ?? null)) {
                $config->{$secretField} = $validated[$secretField];
            }
        }

        $config->save();

        return response()->json([
            'success' => true,
            'config' => $this->serializeConfig($config->refresh()),
        ]);
    }

    public function test(Request $request, CeisaTokenService $tokenService): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $validated = $request->validate([
            'id_perusahaan' => ['required', 'integer', 'exists:perusahaan,id_perusahaan'],
            'environment' => ['required', Rule::in(['development', 'production'])],
        ]);

        $config = CeisaCompanyConfig::where('id_perusahaan', $validated['id_perusahaan'])
            ->where('environment', $validated['environment'])
            ->firstOrFail();

        try {
            $tokenService->getAccessToken($config, true);

            return response()->json([
                'success' => true,
                'message' => 'OAuth CEISA berhasil. Token sudah tersimpan terenkripsi.',
                'config' => $this->serializeConfig($config->refresh()),
            ]);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => Str::limit($exception->getMessage(), 500),
                'config' => $this->serializeConfig($config->refresh()),
            ], 422);
        }
    }

    public function reference(Request $request, CeisaReferenceService $referenceService): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $validated = $request->validate([
            'id_perusahaan' => ['required', 'integer', 'exists:perusahaan,id_perusahaan'],
            'environment' => ['required', Rule::in(['development', 'production'])],
            'lookup_type' => ['required', Rule::in(array_keys(self::REFERENCE_LOOKUPS))],
            'params' => ['nullable', 'array'],
            'params.*' => ['nullable', 'string', 'max:255'],
            'force_refresh' => ['nullable', 'boolean'],
        ]);

        $config = $this->findConfig((int) $validated['id_perusahaan'], $validated['environment']);
        [$path, $query] = $this->buildReferenceRequest($validated['lookup_type'], $validated['params'] ?? []);

        try {
            $result = $referenceService->get(
                $config,
                $path,
                $query,
                1440,
                (bool) ($validated['force_refresh'] ?? false)
            );

            return response()->json([
                'success' => (bool) ($result['ok'] ?? false),
                'message' => $result['message'] ?? 'Referensi CEISA selesai dicek.',
                'result' => $result,
            ], ($result['ok'] ?? false) ? 200 : 422);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => Str::limit($exception->getMessage(), 500),
            ], 422);
        }
    }

    public function status(Request $request, CeisaClient $client): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $validated = $request->validate([
            'id_perusahaan' => ['required', 'integer', 'exists:perusahaan,id_perusahaan'],
            'environment' => ['required', Rule::in(['development', 'production'])],
            'status_type' => ['required', Rule::in(['nomor_aju', 'company'])],
            'nomor_aju' => ['nullable', 'string', 'max:32'],
            'id_perusahaan_ceisa' => ['nullable', 'string', 'max:32'],
        ]);

        if ($validated['status_type'] === 'nomor_aju' && blank($validated['nomor_aju'] ?? null)) {
            throw ValidationException::withMessages([
                'nomor_aju' => 'Nomor aju wajib diisi untuk cek status nomor aju.',
            ]);
        }

        $config = $this->findConfig((int) $validated['id_perusahaan'], $validated['environment']);

        try {
            $result = $validated['status_type'] === 'nomor_aju'
                ? $client->getStatusByNomorAju($config, (string) $validated['nomor_aju'])
                : $client->getStatusByCompany($config, $validated['id_perusahaan_ceisa'] ?? null);

            return response()->json([
                'success' => (bool) ($result['ok'] ?? false),
                'message' => $result['message'] ?? 'Status CEISA selesai dicek.',
                'result' => $result,
            ], ($result['ok'] ?? false) ? 200 : 422);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => Str::limit($exception->getMessage(), 500),
            ], 422);
        }
    }

    private function authorizeAdmin($user): void
    {
        if (! $user || ! $user->hasRole('admin')) {
            abort(403, 'Unauthorized access. Only admin can access this page.');
        }
    }

    private function serializeConfig(CeisaCompanyConfig $config): array
    {
        return [
            'id' => $config->id,
            'id_perusahaan' => $config->id_perusahaan,
            'environment' => $config->environment,
            'base_url' => $config->base_url,
            'origin_url' => $config->origin_url,
            'id_platform' => $config->id_platform,
            'has_api_key' => filled($config->api_key),
            'has_app_id' => filled($config->app_id),
            'has_username' => filled($config->username),
            'has_password' => filled($config->password),
            'company_code' => $config->company_code,
            'id_pengguna' => $config->id_pengguna,
            'npwp' => $config->npwp,
            'npwp_16' => $config->npwp_16,
            'nib' => $config->nib,
            'ppjk_name' => $config->ppjk_name,
            'ppjk_address' => $config->ppjk_address,
            'ppjk_npwp' => $config->ppjk_npwp,
            'ppjk_npwp_16' => $config->ppjk_npwp_16,
            'ppjk_nib' => $config->ppjk_nib,
            'default_kode_kantor' => $config->default_kode_kantor,
            'default_kode_tps' => $config->default_kode_tps,
            'default_signer_name' => $config->default_signer_name,
            'default_signer_title' => $config->default_signer_title,
            'default_signer_city' => $config->default_signer_city,
            'is_active' => (bool) $config->is_active,
            'last_verified_at' => $config->last_verified_at?->toIso8601String(),
            'last_error' => $config->last_error,
            'updated_at' => $config->updated_at?->toIso8601String(),
        ];
    }

    private function defaultBaseUrl(string $environment): string
    {
        return $environment === 'development'
            ? 'https://apisdev-gw.beacukai.go.id'
            : 'https://apis-gw.beacukai.go.id';
    }

    private function nullableUpperAlnum(?string $value): ?string
    {
        $normalized = CeisaNumberFormatter::ceisaCompanyCode($value);

        return $normalized === '' ? null : $normalized;
    }

    private function findConfig(int $idPerusahaan, string $environment): CeisaCompanyConfig
    {
        return CeisaCompanyConfig::where('id_perusahaan', $idPerusahaan)
            ->where('environment', $environment)
            ->firstOrFail();
    }

    private function buildReferenceRequest(string $lookupType, array $params): array
    {
        $requiredFields = self::REFERENCE_LOOKUPS[$lookupType] ?? [];

        foreach ($requiredFields as $field) {
            if (blank($params[$field] ?? null)) {
                throw ValidationException::withMessages([
                    "params.{$field}" => 'Parameter ini wajib diisi.',
                ]);
            }
        }

        return match ($lookupType) {
            'kurs' => [
                '/openapi/kurs/'.rawurlencode((string) $params['kode_valuta']),
                array_filter([
                    'tanggal' => $params['tanggal'] ?? null,
                ], fn ($value) => filled($value)),
            ],
            'hs_lartas' => [
                '/openapi/hs-lartas',
                ['kodeHs' => $params['kode_hs']],
            ],
            'tarif_hs' => [
                '/openapi/tarif-hs',
                array_filter([
                    'kodeHs' => $params['kode_hs'],
                    'tanggal' => $params['tanggal'] ?? null,
                ], fn ($value) => filled($value)),
            ],
            'pelabuhan_kata' => [
                '/openapi/pelabuhan/kata/'.rawurlencode((string) $params['kata']),
                [],
            ],
            'gudang_tps_kode_kantor' => [
                '/openapi/gudangTPS/kodeKantor/'.rawurlencode((string) $params['kode_kantor']),
                [],
            ],
            'pelabuhan_kode_kantor' => [
                '/openapi/pelabuhan/kodeKantor/'.rawurlencode((string) $params['kode_kantor']),
                [],
            ],
            'manifes_bc11' => [
                '/openapi/manifes-bc11',
                [
                    'noHostBl' => $params['nomor_bl'],
                    'tglHostBl' => $params['tanggal_bl'],
                    'kodeKantor' => $params['kode_kantor'],
                    'nama' => $params['nama_importir'],
                ],
            ],
            default => throw ValidationException::withMessages([
                'lookup_type' => 'Tipe referensi CEISA tidak dikenali.',
            ]),
        };
    }
}
