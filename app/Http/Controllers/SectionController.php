<?php

namespace App\Http\Controllers;

use App\Models\MasterSection;
use App\Models\MasterSectionTrans;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AdminCompanyContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SectionController extends Controller
{
    /**
     * Display a listing of master sections.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->can('view-section')) {
            abort(403);
        }

        $sections = [];

        // --- 1. LOGIC COMPANY CONTEXT (TENANT-SPECIFIC) ---
        if ($user->hasRole(['admin', 'manager', 'supervisor'])) {
            $tenant = $this->tenantForUser($user);
            if ($tenant) {
                tenancy()->initialize($tenant);
                
                $sections = MasterSectionTrans::orderBy('section_order', 'asc')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'id' => $item->id_section,
                            'id_section' => $item->id_section,
                            'section_name' => $item->section_name,
                            'section_order' => $item->section_order,
                            'is_penjaluran' => (bool) $item->is_penjaluran,
                            'is_checklist' => (bool) $item->is_checklist,
                            'attribute_section' => is_null($item->attribute_section)
                                ? null
                                : ($item->attribute_section ? 'mandatory' : 'non_mandatory'),
                            'source' => 'trans',
                        ];
                    });
            }

        // --- 2. LEGACY FALLBACK (GLOBAL/BLUEPRINT) ---
        } elseif ($user->hasRole('admin')) {
            $sections = MasterSection::on('tako-user')
                ->orderBy('section_order', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id_section' => $item->id_section,
                        'section_name' => $item->section_name,
                        'section_order' => $item->section_order,
                        'is_penjaluran' => (bool) $item->is_penjaluran,
                        'is_checklist' => (bool) ($item->is_checklist ?? false),
                        'attribute_section' => is_null($item->attribute_section)
                            ? null
                            : ($item->attribute_section ? 'mandatory' : 'non_mandatory'),
                        'source' => 'master',
                    ];
                });
        }

        return Inertia::render('m_section/page', [
            'sections' => $sections,
            'trans_sec' => trans('section'),
        ]);
    }

    /**
     * Store a newly created master section.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        
        if(!$user->can('create-section')){
            return back()->with('error', 'Anda tidak memiliki akses untuk melakukan operasi ini.');
        }

        $validated = $request->validate([
            'section_name' => 'required|string|max:255',
            'is_penjaluran' => 'nullable|boolean',
            'is_checklist' => 'nullable|boolean',
            'attribute_section' => 'nullable|string|in:mandatory,non_mandatory',
        ]);

        $validated['is_penjaluran'] = $request->boolean('is_penjaluran', false);
        $validated['is_checklist'] = $request->boolean('is_checklist', false);

        if ($request->filled('attribute_section')) {
            $validated['attribute_section'] = $request->attribute_section === 'mandatory';
        } else {
            $validated['attribute_section'] = null;
        }

        if ($user->hasRole(['admin', 'manager', 'supervisor'])) {
            $tenant = $this->tenantForUser($user);
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant perusahaan tidak ditemukan.']);
            }

            tenancy()->initialize($tenant);

            $lastOrder = MasterSectionTrans::max('section_order');
            $nextOrder = ($lastOrder ?? 0) + 1;

            $validated['section_order'] = $nextOrder;

            MasterSectionTrans::create($validated);
        }

        return redirect()->back()->with('success', 'Section berhasil ditambahkan.');
    }

    /**
     * Update the specified master section.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'section_name' => 'required|string|max:255',
            'section_order' => 'required|integer|min:1',
            'is_penjaluran' => 'nullable|boolean',
            'is_checklist' => 'nullable|boolean',
            'attribute_section' => 'nullable|string|in:mandatory,non_mandatory',
        ]);

        $validated['is_penjaluran'] = $request->boolean('is_penjaluran', false);
        $validated['is_checklist'] = $request->boolean('is_checklist', false);

        if ($request->filled('attribute_section')) {
            $validated['attribute_section'] = $request->attribute_section === 'mandatory';
        } else {
            $validated['attribute_section'] = null;
        }

        if ($user->hasRole(['admin', 'manager', 'supervisor'])) {
            $tenant = $this->tenantForUser($user);
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant perusahaan tidak ditemukan.']);
            }

            tenancy()->initialize($tenant);
            $section = MasterSectionTrans::findOrFail($id);
            $section->update($validated);
        }

        return redirect()->back()->with('success', 'Section berhasil diperbarui.');
    }

    /**
     * Remove the specified master section.
     */
    public function destroy($id)
    {
        $user = Auth::user();

        if ($user->hasRole(['admin', 'manager', 'supervisor'])) {
            $tenant = $this->tenantForUser($user);
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant perusahaan tidak ditemukan.']);
            }

            tenancy()->initialize($tenant);
            $section = MasterSectionTrans::findOrFail($id);
            $section->delete();
        }

        return redirect()->back()->with('success', 'Section berhasil dihapus.');
    }

    private function tenantForUser(User $user): ?Tenant
    {
        $companyId = $user->hasRole('admin')
            ? app(AdminCompanyContextService::class)->selectedCompanyIdForUser($user)
            : ($user->id_perusahaan ? (int) $user->id_perusahaan : null);

        if (!$companyId) {
            return null;
        }

        return Tenant::where('perusahaan_id', $companyId)->first();
    }
}
