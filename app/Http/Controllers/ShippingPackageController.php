<?php

namespace App\Http\Controllers;

use App\Models\MasterDocumentTrans;
use App\Models\MasterSectionTrans;
use App\Models\Perusahaan;
use App\Models\ShippingPackage;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ShippingPackageController extends Controller
{
    public function index(): Response
    {
        $user = auth('web')->user();
        $this->authorizePackageAccess($user, 'view-shipping-package');

        $isAdmin = $user->hasRole('admin');
        $companies = $isAdmin
            ? Perusahaan::select('id_perusahaan', 'nama_perusahaan')->orderBy('nama_perusahaan')->get()
            : collect();

        $initialData = [
            'packages' => [],
            'sections' => [],
            'documents' => [],
        ];

        if (!$isAdmin && $user->id_perusahaan) {
            $this->initializeTenant((int) $user->id_perusahaan);
            $initialData = $this->buildEditorData();
        }

        return Inertia::render('shipping_packages/page', [
            'companies' => $companies,
            'canSelectCompany' => $isAdmin,
            'initialCompanyId' => $isAdmin ? null : $user->id_perusahaan,
            'initialData' => $initialData,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function companyData(int $idPerusahaan): JsonResponse
    {
        $user = auth('web')->user();
        $this->authorizePackageAccess($user, 'view-shipping-package');
        $this->authorizeCompanyAccess($user, $idPerusahaan);
        $this->initializeTenant($idPerusahaan);

        return response()->json($this->buildEditorData());
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth('web')->user();
        $this->authorizePackageAccess($user, 'create-shipping-package');

        $validated = $this->validatePackagePayload($request);
        $idPerusahaan = $this->resolveTargetCompanyId($request);

        $this->authorizeCompanyAccess($user, $idPerusahaan);
        $this->initializeTenant($idPerusahaan);

        $package = DB::connection('tenant')->transaction(function () use ($validated, $user) {
            $package = ShippingPackage::create([
                'name' => $validated['name'],
                'shipment_type' => $validated['shipment_type'],
                'is_active' => $validated['is_active'],
                'created_by' => $user->id_user ?? $user->id ?? null,
                'updated_by' => $user->id_user ?? $user->id ?? null,
            ]);

            $this->syncPackageRules($package, $validated['sections'] ?? []);

            return $package->fresh(['sections.documents']);
        });

        return response()->json([
            'success' => true,
            'package' => $this->transformPackage($package),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = auth('web')->user();
        $this->authorizePackageAccess($user, 'update-shipping-package');

        $validated = $this->validatePackagePayload($request);
        $idPerusahaan = $this->resolveTargetCompanyId($request);

        $this->authorizeCompanyAccess($user, $idPerusahaan);
        $this->initializeTenant($idPerusahaan);

        $package = DB::connection('tenant')->transaction(function () use ($id, $validated, $user) {
            $package = ShippingPackage::findOrFail($id);

            $package->update([
                'name' => $validated['name'],
                'shipment_type' => $validated['shipment_type'],
                'is_active' => $validated['is_active'],
                'updated_by' => $user->id_user ?? $user->id ?? null,
            ]);

            $package->sections()->delete();
            $this->syncPackageRules($package, $validated['sections'] ?? []);

            return $package->fresh(['sections.documents']);
        });

        return response()->json([
            'success' => true,
            'package' => $this->transformPackage($package),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth('web')->user();
        $this->authorizePackageAccess($user, 'delete-shipping-package');

        $idPerusahaan = $this->resolveTargetCompanyId($request);

        $this->authorizeCompanyAccess($user, $idPerusahaan);
        $this->initializeTenant($idPerusahaan);

        ShippingPackage::findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    private function authorizePackageAccess($user, string $permission): void
    {
        if (!$user || !$user->can($permission)) {
            abort(403, 'Unauthorized access.');
        }
    }

    private function authorizeCompanyAccess($user, int $idPerusahaan): void
    {
        if ($user->hasRole('admin')) {
            return;
        }

        if ((int) $user->id_perusahaan !== $idPerusahaan) {
            abort(403, 'Unauthorized company access.');
        }
    }

    private function resolveTargetCompanyId(Request $request): int
    {
        $user = auth('web')->user();

        if ($user->hasRole('admin')) {
            $idPerusahaan = (int) $request->input('id_perusahaan');
            if (!$idPerusahaan) {
                throw ValidationException::withMessages([
                    'id_perusahaan' => 'Perusahaan wajib dipilih.',
                ]);
            }

            return $idPerusahaan;
        }

        if (!$user->id_perusahaan) {
            throw ValidationException::withMessages([
                'id_perusahaan' => 'User belum terhubung ke perusahaan.',
            ]);
        }

        return (int) $user->id_perusahaan;
    }

    private function initializeTenant(int $idPerusahaan): Tenant
    {
        $tenant = Tenant::where('perusahaan_id', $idPerusahaan)->first();

        if (!$tenant) {
            abort(404, 'Tenant perusahaan tidak ditemukan.');
        }

        tenancy()->initialize($tenant);

        return $tenant;
    }

    private function validatePackagePayload(Request $request): array
    {
        return $request->validate([
            'id_perusahaan' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'shipment_type' => 'required|in:Import,Export',
            'is_active' => 'required|boolean',
            'sections' => 'required|array|min:1',
            'sections.*.id_section' => 'required|integer',
            'sections.*.section_order' => 'nullable|integer|min:0',
            'sections.*.documents' => 'array',
            'sections.*.documents.*' => 'integer',
        ]);
    }

    private function syncPackageRules(ShippingPackage $package, array $sectionsPayload): void
    {
        $sectionIds = collect($sectionsPayload)
            ->pluck('id_section')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $masterSections = MasterSectionTrans::whereIn('id_section', $sectionIds)
            ->get()
            ->keyBy('id_section');

        $documentIds = collect($sectionsPayload)
            ->flatMap(fn ($section) => $section['documents'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $masterDocuments = MasterDocumentTrans::whereIn('id_dokumen', $documentIds)
            ->get()
            ->keyBy('id_dokumen');

        foreach ($sectionsPayload as $index => $sectionPayload) {
            $idSection = (int) $sectionPayload['id_section'];
            $masterSection = $masterSections->get($idSection);

            if (!$masterSection) {
                throw ValidationException::withMessages([
                    'sections' => "Section {$idSection} tidak ditemukan.",
                ]);
            }

            $packageSection = $package->sections()->create([
                'id_section' => $masterSection->id_section,
                'section_name_snapshot' => $masterSection->section_name,
                'section_order' => $sectionPayload['section_order'] ?? $masterSection->section_order ?? ($index + 1),
            ]);

            $docIds = collect($sectionPayload['documents'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            foreach ($docIds as $docIndex => $idDokumen) {
                $masterDocument = $masterDocuments->get($idDokumen);

                if (!$masterDocument) {
                    throw ValidationException::withMessages([
                        'sections' => "Dokumen {$idDokumen} tidak ditemukan.",
                    ]);
                }

                if ((int) $masterDocument->id_section !== $idSection) {
                    throw ValidationException::withMessages([
                        'sections' => "Dokumen {$masterDocument->nama_file} bukan milik section {$masterSection->section_name}.",
                    ]);
                }

                $packageSection->documents()->create([
                    'id_dokumen' => $masterDocument->id_dokumen,
                    'nama_file_snapshot' => $masterDocument->nama_file,
                    'document_order' => $docIndex + 1,
                ]);
            }
        }
    }

    private function buildEditorData(): array
    {
        $packages = ShippingPackage::with('sections.documents')
            ->orderBy('shipment_type')
            ->orderBy('name')
            ->get()
            ->map(fn ($package) => $this->transformPackage($package))
            ->values();

        $sections = MasterSectionTrans::where('is_active', true)
            ->orderBy('section_order')
            ->orderBy('id_section')
            ->get(['id_section', 'section_name', 'section_order'])
            ->map(fn ($section) => [
                'id_section' => $section->id_section,
                'section_name' => $section->section_name,
                'section_order' => $section->section_order,
            ])
            ->values();

        $documents = MasterDocumentTrans::where('is_active', true)
            ->orderBy('id_section')
            ->orderBy('nama_file')
            ->get(['id_dokumen', 'id_section', 'nama_file'])
            ->map(fn ($document) => [
                'id_dokumen' => $document->id_dokumen,
                'id_section' => $document->id_section,
                'nama_file' => $document->nama_file,
            ])
            ->values();

        return [
            'packages' => $packages,
            'sections' => $sections,
            'documents' => $documents,
        ];
    }

    private function transformPackage(ShippingPackage $package): array
    {
        return [
            'id' => $package->id,
            'name' => $package->name,
            'shipment_type' => $package->shipment_type,
            'is_active' => (bool) $package->is_active,
            'sections' => $package->sections
                ->sortBy([
                    ['section_order', 'asc'],
                    ['id', 'asc'],
                ])
                ->map(fn ($section) => [
                    'id' => $section->id,
                    'id_section' => $section->id_section,
                    'section_name_snapshot' => $section->section_name_snapshot,
                    'section_order' => $section->section_order,
                    'documents' => $section->documents
                        ->sortBy([
                            ['document_order', 'asc'],
                            ['id', 'asc'],
                        ])
                        ->map(fn ($document) => [
                            'id' => $document->id,
                            'id_dokumen' => $document->id_dokumen,
                            'nama_file_snapshot' => $document->nama_file_snapshot,
                            'document_order' => $document->document_order,
                        ])
                        ->values(),
                ])
                ->values(),
        ];
    }
}
