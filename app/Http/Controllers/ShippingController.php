<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\DocumentTrans;
use App\Models\HsCode;
use App\Models\MasterDocument;
use App\Models\MasterDocumentTrans;
use App\Models\Spk;
use App\Models\Perusahaan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\MasterSection;
use App\Models\MasterSectionTrans;
use App\Models\SectionTrans;
use App\Models\DocumentStatus;
use App\Events\ShippingDataUpdated;
use App\Models\SpkStatus;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Clegginabox\PDFMerger\PDFMerger;
use Illuminate\Support\Str;
use Spatie\Browsershot\Browsershot;
use Symfony\Component\Process\Process;
use App\Services\SectionReminderService;
use App\Services\NotificationService;
use App\Jobs\GhostscriptCompressionJob;
use App\Jobs\SendShippingComposeEmailJob;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class ShippingController extends Controller
{
    private function resolveTenantAndPerusahaanId($user): array
    {
        $tenant = null;
        $idPerusahaan = null;

        if ($user && $user->id_perusahaan) {
            $idPerusahaan = (int) $user->id_perusahaan;
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user && $user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $idPerusahaan = (int) $customer->ownership;
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        return [$tenant, $idPerusahaan];
    }

    // buildShippingPdf has been moved to App\Services\ShippingPdfService

    public function index()
    {
        $user = auth('web')->user();
        $externalCustomers = [];

        // LOGIC 1: Jika User Adalah EKSTERNAL
        if ($user->role === 'eksternal') {
            // Ambil data perusahaan milik user tersebut berdasarkan id_customer di tabel users
            // Hasilnya hanya 1 data (Perusahaan dia sendiri)
            $externalCustomers = Customer::where('id_customer', $user->id_customer)
                ->select('id_customer', 'nama_perusahaan as nama') // Alias 'nama' agar frontend konsisten
                ->get();
        } else {
            // Ambil daftar user yang role-nya 'eksternal'
            // Ambil 'name' dari tabel users, tapi value-nya tetap id_customer
            $externalCustomers = User::where('role', 'eksternal')
                ->whereNotNull('users.id_customer')
                ->where('users.id_perusahaan', $user->id_perusahaan)
                ->join('customers', 'customers.id_customer', '=', 'users.id_customer')
                ->select(
                    'customers.id_customer',
                    'customers.nama_perusahaan as nama'
                )
                ->distinct()
                ->get();

            // Opsional: Jika ingin menghilangkan duplikasi (misal ada 2 user dari PT yang sama)
            // $externalCustomers = $externalCustomers->unique('id_customer')->values();
        }

        if (!$user->can('view-master-shipping')) {
            abort(403);
        }

        $tenant = null;

        if ($user->id_perusahaan) {
            // Jika User Internal, ambil tenant dari id_perusahaan user
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            // Jika User Eksternal, cari customer dulu, baru ambil tenant dari ownership
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        $spkData = [];

        // --- 3. JIKA TENANT KETEMU, BARU QUERY DATA ---
        if ($tenant) {
            // Pindah koneksi ke Database Tenant
            tenancy()->initialize($tenant);

            // Query ke tabel SPK (di database tenant)
            $query = Spk::with([
                'customer',
                'creator',
                'latestStatus',
                'parties', 
                'sections' => function ($q) {
                    // 1. Urutkan section agar rapi
                    $q->orderBy('section_order', 'asc');

                    // 2. Pilih kolom spesifik (Opsional, tapi bagus untuk performa)
                    // PENTING: Sertakan 'id_section' agar relasi 'documents' bisa jalan (local key)
                    $q->select('id', 'id_spk', 'id_section', 'section_name', 'section_order', 'deadline', 'deadline_date');

                    // 3. Relasi 'documents' untuk hitung progress
                    $q->with(['documents' => function ($docQ) {
                        $docQ->select('id', 'id_spk', 'id_section', 'id_dokumen', 'verify');
                    }]);
                }
            ]);

            // Jika user eksternal, filter hanya data miliknya
            if ($user->role === 'eksternal' && $user->id_customer) {
                $query->where('id_customer', $user->id_customer);
            }

            // Ambil data SPK tenant
            $spkItems = $query->latest()->get();

            // Ambil semua ID user internal yang mungkin jadi handler:
            // - validated_by => PIC hasil assign supervisor / auto-assign staff
            // - created_by   => fallback kalau validated_by kosong
            $internalUserIds = $spkItems
                ->flatMap(function ($item) {
                    return array_filter([
                        $item->validated_by ?? null,
                        $item->created_by ?? null,
                    ]);
                })
                ->unique()
                ->values()
                ->toArray();

            // Ambil user pusat dari DB tako-user
            $internalUsers = collect();
            if (!empty($internalUserIds)) {
                $internalUsers = User::on('tako-user')
                    ->whereIn('id_user', $internalUserIds)
                    ->select('id_user', 'name', 'role_internal')
                    ->get()
                    ->keyBy('id_user');
            }

            // Mapping data agar sesuai dengan kolom Frontend
            $spkData = $spkItems->map(function ($item) use ($internalUsers) {
                $minDeadline = $item->sections->pluck('deadline_date')->filter()->min();

                // --- PROGRESS CALCULATION ---
                $totalDocs = 0;
                $verifiedDocs = 0;

                // Ambil semua dokumen dari semua section yang benar-benar milik SPK ini
                // Meskipun relasi model menggunakan id_section, kita filter manual di sini agar aman
                $allDocs = $item->sections->flatMap(function ($section) use ($item) {
                    return $section->documents->where('id_spk', $item->id);
                });

                if ($allDocs->count() > 0) {
                    // Group by id_dokumen (Kategori Dokumen)
                    // Cari yang paling baru (ID terbesar) dari setiap grup
                    $latestDocs = $allDocs->groupBy('id_dokumen')->map(function ($group) {
                        return $group->sortByDesc('id')->first();
                    });

                    $totalDocs = $latestDocs->count();
                    $verifiedDocs = $latestDocs->where('verify', true)->count();
                }

                $progress = $totalDocs === 0 ? 0 : (int) round(($verifiedDocs / $totalDocs) * 100);

                // Ambil log terbaru dari document_statuses untuk kumpulan dokumen SPK ini (Cara yang sama seperti di show)
                $latestDocLog = null;
                if ($allDocs->isNotEmpty()) {
                    $latestDocLog = \App\Models\DocumentStatus::whereIn('id_dokumen_trans', $allDocs->pluck('id'))
                        ->latest()
                        ->first();
                }

                // Tentukan handler internal:
                // 1. validated_by (kalau supervisor assign ke staff, ini yang dipakai)
                // 2. created_by (fallback)
                $handlerUser = null;

                if (!empty($item->validated_by) && $internalUsers->has($item->validated_by)) {
                    $handlerUser = $internalUsers->get($item->validated_by);
                } elseif (!empty($item->created_by) && $internalUsers->has($item->created_by)) {
                    $handlerUser = $internalUsers->get($item->created_by);
                }

                return [
                    'id'                    => $item->id,
                    'spk_code'              => $item->spk_code,
                    'nama_customer'         => $item->customer->nama_perusahaan ?? '-',
                    'tanggal_status'        => $latestDocLog ? $latestDocLog->created_at : $item->created_at,
                    'status_label'          => $item->latestStatus->status ?? 'Draft/Pending',
                    'nama_user'             => $latestDocLog->by ?? $item->creator->name ?? 'System',

                    // FIELD UNTUK FILTER HANDLED BY
                    'internal_handler_name' => $handlerUser->name ?? '',
                    'assigned_pic_name'     => $handlerUser->name ?? null,
                    'handler_role_internal' => $handlerUser->role_internal ?? null,
                    'validated_by'          => $item->validated_by ?? null,
                    'created_by'            => $item->created_by ?? null,
                    'drafter'               => !empty($item->validated_by) && $internalUsers->has($item->validated_by)
                        ? $internalUsers->get($item->validated_by)->name
                        : '-',
                    'eta_date'              => $item->eta_date ?? null,

                    'jalur'                 => $item->penjaluran,
                    'jalur_filter'          => $item->penjaluran,
                    'deadline_date'         => $minDeadline,
                    'progress'              => $progress,
                    'vessel'                => $item->vessel,
                    'origin'                => $item->origin,
                    'port'                  => $item->port,
                    'comodity'              => $item->comodity,
                    'party_summary' => $item->parties->map(function ($p) {
                        if ($p->party_type === 'LCL') {
                            return "{$p->party_qty} {$p->party_size} (LCL)";
                        }

                        if ($p->party_type === 'FCL') {
                            $cleanCategory = $p->party_category 
                                ? preg_replace('/^\d+\s*-\s*/', '', $p->party_category)
                                : '';

                            // ❌ HAPUS DASH
                            $category = $cleanCategory ? " {$cleanCategory}" : '';

                            return "{$p->party_qty} x {$p->party_size}{$category} (FCL)";
                        }

                        return null;
                    })->filter()->implode(', '),
                ];
            });

            // NEW: Fetch sections that are marked as checklist (optional sections for SPK)
            $checklistSections = MasterSectionTrans::where('is_checklist', true)
                ->where('id_section', '!=', 6)
                ->orderBy('section_order', 'asc')
                ->select('id_section', 'section_name')
                ->get();
        }

        // NEW: Fetch Internal Staff for Supervisor Assignment
        $internalStaff = [];
        if ($user->role === 'internal') {
            $internalStaff = User::on('tako-user')
                ->where('role', 'internal')
                ->where('role_internal', 'staff')
                ->where('id_perusahaan', $user->id_perusahaan)
                ->select('id_user', 'name')
                ->get();
        }

        return Inertia::render('m_shipping/page', [
            'customers' => $spkData,
            'externalCustomers' => $externalCustomers,
            'internalStaff' => $internalStaff, // Pass staff list
            'company' => [
                'id' => session('company_id'),
                'name' => session('company_name'),
                'logo' => session('company_logo'),
            ],
            'checklistSections' => $checklistSections ?? [], // Pass to frontend
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = auth('web')->user();

        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        return Inertia::render('m_shipping/table/add-data-form', [
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Share the form to customer
     */
    public function share($id)
    {
        $user = auth('web')->user();

        $tenant = null;

        if ($user->id_perusahaan) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            abort(404, 'Tenant tidak ditemukan');
        }

        tenancy()->initialize($tenant);

        $spk = \App\Models\Spk::with('parties')->findOrFail($id);

        $documents = \App\Models\DocumentTrans::query()
            ->leftJoin('section_trans', function ($join) {
                $join->on('document_trans.id_section', '=', 'section_trans.id_section')
                    ->on('document_trans.id_spk', '=', 'section_trans.id_spk');
            })
            ->where('document_trans.id_spk', $id)
            ->select([
                'document_trans.id',
                'document_trans.id_spk',
                'document_trans.id_section',
                'document_trans.id_dokumen',
                'document_trans.nama_file',
                'document_trans.url_path_file',
                'document_trans.updated_at',
                'document_trans.verify',
                'document_trans.upload_date',
                'document_trans.verified_date',
                'document_trans.ori_date',
                'section_trans.section_name',
            ])
            ->orderBy('document_trans.id_section', 'asc')
            ->orderByRaw("
                CASE 
                    WHEN document_trans.url_path_file IS NOT NULL AND document_trans.url_path_file <> '' THEN 0
                    ELSE 1
                END ASC
            ")
            ->orderBy('document_trans.updated_at', 'desc')
            ->orderBy('document_trans.nama_file', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'id_dokumen' => $item->id_dokumen,
                    'id_spk' => $item->id_spk,
                    'id_section' => $item->id_section,
                    'section_name' => $item->section_name,
                    'nama_file' => $item->nama_file,
                    'url_path_file' => $item->url_path_file,
                    'verify' => $item->verify,
                    'is_updated' => !empty($item->url_path_file),

                    'updated_at' => optional($item->updated_at)->format('d M Y'),
                    'updated_at_full' => optional($item->updated_at)->format('d-m-Y H:i:s'),

                    'upload_date' => optional($item->upload_date)->format('d M Y'),
                    'upload_date_full' => optional($item->upload_date)->format('d-m-Y H:i:s'),

                    'verified_date' => optional($item->verified_date)->format('d M Y'),
                    'verified_date_full' => optional($item->verified_date)->format('d-m-Y H:i:s'),

                    'ori_date' => optional($item->ori_date)->format('d M Y'),
                    'ori_date_full' => optional($item->ori_date)->format('d-m-Y H:i:s'),
                ];
            });

        return Inertia::render('m_shipping/table/view-data-shipping', [
            'spk' => [
                'id' => $spk->id,
                'spk_code' => $spk->spk_code,
                'shipment_type' => $spk->shipment_type,
                'internal_can_upload' => $spk->internal_can_upload,
                'penjaluran' => $spk->penjaluran,
                'register_number' => $spk->register_number,
                'register_date' => $spk->register_date,

                // field tambahan baru
                'shipper' => $spk->shipper,
                'consignee' => $spk->consignee,
                'vessel' => $spk->vessel,
                'origin' => $spk->origin,
                'port' => $spk->port,
                'comodity' => $spk->comodity,
                'parties' => $spk->parties,
                'party_summary' => $spk->parties->map(function ($p) {
                    if ($p->party_type === 'LCL') {
                        return "{$p->party_qty} {$p->party_size} (LCL)";
                    }

                    if ($p->party_type === 'FCL') {
                        $cleanCategory = $p->party_category 
                            ? preg_replace('/^\d+\s*-\s*/', '', $p->party_category)
                            : '';

                        // ❌ HAPUS DASH
                        $category = $cleanCategory ? " {$cleanCategory}" : '';

                        return "{$p->party_qty} x {$p->party_size}{$category} (FCL)";
                    }

                    return null;
                })->filter()->implode(', '),
                'parties' => $spk->parties,
                'aju' => $spk->aju,
                'j_o' => $spk->j_o,
            ],
            'documents' => $documents,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function downloadPdf(Request $request, $id)
    {
        $user = auth('web')->user();

        $tenant = null;
        $idPerusahaan = null;

        if ($user->id_perusahaan) {
            $idPerusahaan = $user->id_perusahaan;
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $idPerusahaan = $customer->ownership;
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            abort(404, 'Tenant tidak ditemukan');
        }

        tenancy()->initialize($tenant);

        $spk = Spk::findOrFail($id);
        $template = $request->boolean('template', false);
        $karantina = $request->boolean('karantina', false);

        $pdfService = new \App\Services\ShippingPdfService();
        [$pdf, $filename] = $pdfService->build($spk, $tenant, $user, $idPerusahaan, $template, $karantina);

        return $pdf->download($filename);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = auth('web')->user();

        $userId = $user->id_user;
        $userName = $user->name;

        if (!$user->hasPermissionTo('create-master-shipping')) {
            throw UnauthorizedException::forPermissions(['create-master-shipping']);
        }

        $validated = $request->validate([
            'tanggal_dokumen' => 'required|date',
            'shipment_type'   => 'required|in:Import,Export',
            'bl_number'       => 'required|string',
            'id_customer'     => 'required|exists:customers,id_customer',
            'hs_codes'        => 'required|array|min:1',
            'hs_codes.*.code' => 'required|string',
            'hs_codes.*.link' => 'nullable|string',
            'hs_codes.*.file' => 'nullable|file|image|mimes:jpeg,png,jpg|max:5120',
            'assigned_pic'    => 'nullable|integer|exists:users,id_user', // Validasi Assigned PIC
            'vessel'          => 'nullable|string',
            'origin'          => 'nullable|string',
            'port'            => 'nullable|string',
            'comodity'        => 'nullable|string',
        ]);

        // --- Logic Tenant ---
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return redirect()->back()->withErrors(['error' => 'Gagal menentukan Tenant.']);
        }

        tenancy()->initialize($tenant);

        DB::beginTransaction();

        try {
            // 1. CREATE SPK (Hanya Sekali)
            $spk = Spk::create([
                'spk_code'          => $validated['bl_number'],
                'shipment_type'     => $validated['shipment_type'],
                'tanggal_dokumen'   => $validated['tanggal_dokumen'],
                'id_perusahaan_int' => $tenant->perusahaan_id ?? $user->id_perusahaan,
                'id_customer'       => $validated['id_customer'],
                'created_by'        => $userId,
                'penjaluran'        => null,
                'vessel'            => $validated['vessel'] ?? null,
                'origin'            => $validated['origin'] ?? null,
                'port'              => $validated['port'] ?? null,
                'comodity'          => $validated['comodity'] ?? null,
            ]);

            $statusId = 6;
            $statusPriority = 'Created';

            SpkStatus::create([
                'id_spk'    => $spk->id,
                'id_status' => $statusId,
                'status'  => "SPK $statusPriority",
            ]);

            // 2. LOOP CREATE HS CODES
            foreach ($validated['hs_codes'] as $index => $hsData) {
                $filePath = null;
                $fileNameToSave = null;

                if (isset($hsData['file']) && $hsData['file'] instanceof \Illuminate\Http\UploadedFile) {
                    $extension = $hsData['file']->getClientOriginalExtension();
                    $fileNameToSave = $spk->spk_code . '_' . $hsData['code'] . '_' . uniqid() . '.' . $extension;

                    $path = $hsData['file']->storeAs(
                        'documents/hs_codes',
                        $fileNameToSave,
                        'customers_external'
                    );
                    $filePath = $path;
                }

                $newHsCode = HsCode::create([
                    'id_spk'         => $spk->id,
                    'hs_code'        => $hsData['code'],
                    'link_insw'      => $fileNameToSave ?? ($hsData['link'] ?? null),
                    'path_link_insw' => $filePath,
                    'created_by'     => $userId,
                    'updated_by'     => $userId,
                    'logs'           => json_encode(['action' => 'created', 'by' => $userName, 'at' => now()]),
                ]);
            }

            // --- 3. GENERATE SECTION TRANSAKSI ---
            // Simpan yang Core Mandatory (is_checklist false & attribute_section true)
            // PLUS yang dicentang user di modal (selected_sections)
            $selectedChecklistIds = $request->input('selected_sections', []); // Array of id_section

            $masterSections = MasterSectionTrans::where(function ($q) use ($selectedChecklistIds) {
                $q->where(function ($sq) {
                    $sq->where('is_checklist', false)
                        ->where('id_section', '!=', 6)
                        ->where('attribute_section', true);
                })
                    ->orWhereIn('id_section', $selectedChecklistIds);
            })
                ->where('id_section', '!=', 6)
                ->orderBy('section_order', 'asc')
                ->get();

            foreach ($masterSections as $masterSec) {
                SectionTrans::create([
                    'id_section'    => $masterSec->id_section,
                    'id_spk'        => $spk->id,
                    'section_name'  => $masterSec->section_name,
                    'section_order' => $masterSec->section_order,
                    'deadline'      => false,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            // --- 4. GENERATE DOKUMEN TRANSAKSI (MANDATORY ONLY) ---
            // Hanya dokumen dengan attribute = true yang otomatis ditambahkan saat SPK/Section dibuat.
            $allowedSectionIds = $masterSections->pluck('id_section')->toArray();

            $finalDocs = MasterDocumentTrans::where('is_active', true)
                ->where('attribute', true)
                ->whereIn('id_section', $allowedSectionIds)
                ->orderBy('id_dokumen', 'asc')
                ->get()
                ->unique(function ($doc) {
                    return $doc->id_section . '|' . \Illuminate\Support\Str::lower(trim($doc->nama_file));
                })
                ->sortBy([
                    ['id_section', 'asc'],
                    ['id_dokumen', 'asc'],
                ])
                ->values();

            foreach ($finalDocs as $doc) {
                $section = MasterSectionTrans::where('id_section', $doc->id_section)
                    ->first();

                $sectionName = $section ? $section->section_name : 'Unknown Section';
                $logMessage = "Document {$sectionName} requested " . now()->format('d-m-Y H:i') . " WIB";

                $newDocTrans = DocumentTrans::create([
                    'id_spk'                => $spk->id,
                    'id_dokumen'            => $doc->id_dokumen,
                    'id_section'            => $doc->id_section,
                    'nama_file'             => $doc->nama_file,
                    'is_internal'           => $doc->is_internal ?? false,
                    'is_verification'       => $doc->is_verification ?? true,
                    'url_path_file'         => null,
                    'verify'                => false,
                    'correction_attachment' => false,
                    'kuota_revisi'          => $doc->kuota_revisi ?: 3,
                    'updated_by'            => $userId,
                    'logs'                  => $logMessage,
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                DocumentStatus::create([
                    'id_dokumen_trans' => $newDocTrans->id,
                    'status'           => $logMessage,
                    'by'               => $userName,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }

            if ($user->role === 'internal') {
                if ($user->can('assign_staff-master-shipping') && !empty($validated['assigned_pic'])) {
                    // SUPERVISOR: Assign to Selected Staff
                    $spk->update(['validated_by' => $validated['assigned_pic']]);

                    // Optional: Notification Logic to Assigned Staff can be added here
                    /* NotificationService::send([...]); */
                } elseif (in_array($user->role_internal, ['staff', 'marketing'])) {
                    // STAFF & Marketing: Auto-assign to Self
                    $spk->update(['validated_by' => $userId]);
                }
            }

            DB::commit();

            // --- 5. NOTIFICATION LOGIC (MOVED AFTER COMMIT) ---
            // Move here to prevent Race Condition (Queue Worker checking DB before Commit)
            try {
                if ($user->role === 'eksternal') {
                    $internalUsers = \App\Models\User::on('tako-user')
                        ->where('role', 'internal')
                        ->whereIn('role_internal', ['staff', 'marketing', 'supervisor'])
                        ->where('id_perusahaan', $tenant->perusahaan_id)
                        ->distinct()
                        ->get();

                    // Ensure unique by ID (collection level)
                    $internalUsers = $internalUsers->unique('id_user')->values();

                    foreach ($internalUsers as $internalUser) {
                        // 1. Send Email
                        try {
                            SectionReminderService::sendSpkCreated($internalUser, $spk, $user);
                        } catch (\Exception $e) {
                            Log::error("Failed to send SPK Created Email to {$internalUser->email}: " . $e->getMessage());
                        }

                        // 2. Send In-App Notification
                        try {
                            NotificationService::send([
                                'send_to' => $internalUser->id_user,
                                'created_by' => $userId,
                                'role' => 'internal', // Context
                                'id_spk' => $spk->id,
                                'data' => [
                                    'type' => 'spk_created',
                                    'title' => 'New SPK Created',
                                    'message' => "New SPK {$spk->spk_code} created by {$user->name}",
                                    'url' => "/shipping/{$spk->id}",
                                    'spk_code' => $spk->spk_code
                                ]
                            ]);
                        } catch (\Exception $e) {
                            Log::error("Failed to send SPK Created Notification to {$internalUser->id_user}: " . $e->getMessage());
                        }
                    }
                } elseif ($user->role === 'internal') {
                    // Fetch Customer Name for Notification Context
                    $customerName = 'Unknown Customer';
                    $customerObj = Customer::find($validated['id_customer']);
                    if ($customerObj) {
                        $customerName = $customerObj->nama_cust ?? $customerObj->nama_perusahaan ?? $customerName;
                    }

                    // 1. If Supervisor & Assigned Staff -> Notify the Staff
                    if ($user->can('assign_staff-master-shipping') && !empty($validated['assigned_pic'])) {
                        $assignedStaff = \App\Models\User::on('tako-user')->find($validated['assigned_pic']);
                        if ($assignedStaff) {
                            // 1. Email for Assigned Staff
                            try {
                                SectionReminderService::sendSpkCreated($assignedStaff, $spk, $user);
                            } catch (\Exception $e) {
                            }

                            // 2. In-App Notification for Assigned Staff
                            try {
                                NotificationService::send([
                                    'send_to' => $assignedStaff->id_user,
                                    'created_by' => $userId,
                                    'role' => 'internal',
                                    'id_spk' => $spk->id,
                                    'data' => [
                                        'type' => 'spk_created',
                                        'title' => 'SPK Baru Ditugaskan',
                                        'message' => "Anda telah ditugaskan sebagai PIC untuk SPK {$spk->spk_code} oleh Supervisor {$user->name}",
                                        'url' => "/shipping/{$spk->id}",
                                        'spk_code' => $spk->spk_code
                                    ]
                                ]);
                            } catch (\Exception $e) {
                            }
                        }
                    }

                    // NOTIFY ALL SUPERVISORS (Global Monitoring)
                    if (true) { // Ensuring all supervisors get monitoring notif
                        $supervisors = \App\Models\User::on('tako-user')
                            ->where('role', 'internal')
                            ->where('role_internal', 'supervisor')
                            ->where('id_perusahaan', $user->id_perusahaan ?? (tenancy()->tenant->perusahaan_id ?? null))
                            ->get();

                        foreach ($supervisors as $supervisor) {
                            if ($supervisor->id_user == $userId) continue;
                            try {
                                NotificationService::send([
                                    'send_to' => $supervisor->id_user,
                                    'created_by' => $userId,
                                    'role' => 'internal',
                                    'id_spk' => $spk->id,
                                    'data' => [
                                        'type' => 'spk_created',
                                        'title' => 'SPK Baru Dibuat (Monitoring)',
                                        'message' => "SPK {$spk->spk_code} baru saja dibuat oleh {$user->name}",
                                        'url' => "/shipping/{$spk->id}",
                                        'spk_code' => $spk->spk_code
                                    ]
                                ]);
                            } catch (\Exception $e) {
                            }
                        }
                    }

                    //    2. Notify External Customer (For both Staff and Supervisor)
                    //    We query the central user table for users of this customer
                    $externalUsers = \App\Models\User::on('tako-user')
                        ->where('id_customer', $spk->id_customer)
                        ->where('role', 'eksternal')
                        ->get();

                    foreach ($externalUsers as $extUser) {
                        // Email
                        try {
                            SectionReminderService::sendSpkCreated($extUser, $spk, $user);
                        } catch (\Exception $e) {
                            Log::error("Failed to send SPK Email to External {$extUser->email}: " . $e->getMessage());
                        }

                        // Notification
                        try {
                            NotificationService::send([
                                'send_to' => $extUser->id_user,
                                'created_by' => $userId,
                                'role' => 'eksternal',
                                'id_spk' => $spk->id,
                                'data' => [
                                    'type' => 'spk_created',
                                    'title' => 'SPK Baru Dibuat',
                                    'message' => "SPK Baru {$spk->spk_code} telah dibuat oleh {$user->name}",
                                    'url' => "/shipping/{$spk->id}",
                                    'spk_code' => $spk->spk_code
                                ]
                            ]);
                        } catch (\Exception $e) {
                            Log::error("Failed to send SPK Notification to External {$extUser->id_user}: " . $e->getMessage());
                        }
                    }
                }

                // REALTIME UPDATE (Backup for other lists)
                try {
                    ShippingDataUpdated::dispatch($spk->id, 'create');
                } catch (\Exception $e) {
                    Log::error('Realtime update failed: ' . $e->getMessage());
                }
            } catch (\Exception $e) {
                Log::error("Post-commit notification failed: " . $e->getMessage());
            }

            return Inertia::location(route('shipping.show', $spk->id));
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Gagal: ' . $th->getMessage()]);
        }
    }

    public function updateHsCodes(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $validated = $request->validate([
            'hs_codes'        => 'required|array|min:1',
            // id opsional karena data baru belum punya ID
            'hs_codes.*.id'   => 'nullable',
            'hs_codes.*.code' => 'required|string',
            // Link lama (string) atau file baru (binary)
            'hs_codes.*.file' => 'nullable',
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) abort(404, 'Tenant not found');
        tenancy()->initialize($tenant);

        // 3. Mulai Transaksi Database
        DB::beginTransaction();

        try {
            $spk = Spk::findOrFail($idSpk);

            $receivedIds = [];

            foreach ($validated['hs_codes'] as $item) {
                $filePath = null;
                $fileNameToSave = null;
                if (isset($item['file']) && $item['file'] instanceof \Illuminate\Http\UploadedFile) {
                    $extension = $item['file']->getClientOriginalExtension();

                    $safeSpkCode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $spk->spk_code);
                    $safeHsCode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $item['code']);

                    $fileNameToSave = $safeSpkCode . '_' . $safeHsCode . '_' . uniqid()  . '.' . $extension;

                    $path = $item['file']->storeAs(
                        'documents/hs_codes',
                        $fileNameToSave,
                        'customers_external'
                    );

                    $filePath = $path;
                }

                if (!empty($item['id']) && is_numeric($item['id'])) {
                    $hsCode = HsCode::find($item['id']);
                    if ($hsCode) {
                        $updateData = [
                            'hs_code'    => $item['code'],
                            'updated_by' => $user->id,
                            'updated_at' => now(),
                        ];

                        // Hanya update file jika ada file baru
                        if ($filePath) {
                            $updateData['link_insw'] = $fileNameToSave;
                            $updateData['path_link_insw'] = $filePath;
                        }

                        $hsCode->update($updateData);
                        $receivedIds[] = $hsCode->id_hscode;
                    }
                } else {
                    $newHsCode = HsCode::create([
                        'id_spk'         => $spk->id,
                        'hs_code'        => $item['code'],
                        'link_insw'      => $fileNameToSave,
                        'path_link_insw' => $filePath,
                        'created_by'     => $user->id,
                        'updated_by'     => $user->id,
                        'logs'           => json_encode(['action' => 'added_via_edit', 'by' => $user->name, 'at' => now()]),
                    ]);
                    $receivedIds[] = $newHsCode->id_hscode;
                }
            }
            HsCode::where('id_spk', $spk->id)
                ->whereNotIn('id_hscode', $receivedIds)
                ->delete();

            if (!empty($receivedIds)) {
                $spk->update(['id_hscode' => $receivedIds[0]]);
            } else {
                $spk->update(['id_hscode' => null]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'HS Codes updated successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to update: ' . $th->getMessage()]);
        }
    }

    public function upload(Request $request)
    {
        $user = auth('web')->user();

        // --- PERMISSION CHECK ---
        if (!$user->can('upload-document')) {
            return response()->json(['error' => 'Anda tidak memiliki izin untuk mengunggah dokumen.'], 403);
        }

        // Validasi File
        $file = $request->file('pdf') ?? $request->file('file');
        if (!$file) {
            return response()->json(['error' => 'File tidak ditemukan'], 400);
        }

        $spk        = $request->input('spk_code');
        $type        = strtolower($request->input('type'));

        $ext         = $file->getClientOriginalExtension();
        $uniqueId = uniqid();
        $filename    = "{$spk}-{$type}-{$uniqueId}.{$ext}";

        $disk        = Storage::disk('customers_external');
        $tempDir     = 'temp';

        // Buat folder temp jika belum ada
        if (!$disk->exists($tempDir)) {
            $disk->makeDirectory($tempDir);
        }

        // Simpan File RAW langsung ke Temp (Tanpa Kompresi)
        $tempRel = "{$tempDir}/{$filename}";

        // Gunakan stream untuk efisiensi memori saat save
        $disk->put($tempRel, file_get_contents($file->getRealPath()));

        return response()->json([
            'status'    => 'success',
            'path'      => $tempRel,        // Path ini akan dikirim balik saat submit
            'nama_file' => $filename,
            'is_temp'   => true,
            'info'      => 'File uploaded to temp (uncompressed)'
        ]);
    }

    public function submit(Request $request)
    {
        return back()->with('success', 'Data berhasil disubmit.');
    }


    /**
     * Helper to resize image (Private)
     */
    private function resizeImage($path, $maxWidth, $quality = 75)
    {
        if (!file_exists($path)) return false;

        $info = @getimagesize($path);
        if (!$info) return false;

        $mime = $info['mime'];
        $width = $info[0];
        $height = $info[1];

        if ($width <= $maxWidth) return true;

        $newWidth = $maxWidth;
        $newHeight = floor($height * ($maxWidth / $width));

        $image = null;
        if ($mime == 'image/jpeg' || $mime == 'image/jpg') {
            $image = @imagecreatefromjpeg($path);
        } elseif ($mime == 'image/png') {
            $image = @imagecreatefrompng($path);
        }

        if (!$image) return false;

        $newImage = imagecreatetruecolor($newWidth, $newHeight);

        if ($mime == 'image/png') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
        }

        imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        if ($mime == 'image/jpeg' || $mime == 'image/jpg') {
            imagejpeg($newImage, $path, $quality);
        } elseif ($mime == 'image/png') {
            imagepng($newImage, $path, floor($quality / 10));
        }

        imagedestroy($image);
        imagedestroy($newImage);

        return true;
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = auth('web')->user();

        if (!$user->can('update-master-shipping')) {
            abort(403);
        }
        // NEW: Fetch Internal Staff for Supervisor Assignment (Consistent with index)
        // Moved here to ensure we query the CENTRAL database (tako-user) before tenancy context is switched.
        $internalStaff = [];
        if ($user->role === 'internal') {
            $internalStaff = \App\Models\User::on('tako-user')
                ->where('role', 'internal')
                ->where('id_perusahaan', $user->id_perusahaan)
                ->where('role_internal', 'staff')
                ->select('id_user', 'name', 'role_internal', 'id_perusahaan')
                ->get();
        }

        // 2. LOGIKA MENCARI TENANT (Copy dari function store)
        // Kita harus tahu dulu user ini milik tenant mana agar bisa buka databasenya
        $tenant = null;

        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        if (!$tenant) {
            abort(404, 'Tenant tidak ditemukan untuk user ini.');
        }

        // 3. INISIALISASI TENANCY (PENTING!)
        // Ini yang memindahkan koneksi dari 'tako-user' ke 'tako_tenant_xxx'
        tenancy()->initialize($tenant);

        // 4. Baru sekarang aman untuk Query ke tabel SPK
        // Karena koneksi sudah pindah ke tenant
        $spk = Spk::with(['creator', 'hsCodes', 'customer', 'parties'])->findOrFail($id);
        
        // --- FIRST CLICK VALIDATION ASSIGNMENT ---
        if ($user->role === 'internal' && $user->role_internal === 'staff') {
            if (is_null($spk->validated_by)) {

                $notificationsToRemove = collect([]);

                DB::transaction(function () use ($spk, $user, &$notificationsToRemove) {
                    // 1. Assign Validator
                    $spk->update(['validated_by' => $user->id_user]);
                     $spk->refresh();

                    // 2. Handle Notifications
                    // A. Update Current User's Notification (Mark as Read, KEEP it)
                    \App\Models\Notification::where('id_spk', $spk->id)
                        ->where('send_to', $user->id_user)
                        ->update(['read_at' => now()]);

                    // B. Identify Notifications ONLY for OTHER staff (to be deleted)
                    // We exclude Supervisors from this deletion so they keep their history.
                    $staffIdsToCleanup = \App\Models\User::on('tako-user')
                        ->where('role', 'internal')
                        ->where('id_perusahaan', $user->id_perusahaan ?? $tenant->perusahaan_id)
                        ->where('role_internal', 'staff')
                        ->where('id_user', '!=', $user->id_user)
                        ->pluck('id_user');

                    $othersNotifications = \App\Models\Notification::where('id_spk', $spk->id)
                        ->whereIn('send_to', $staffIdsToCleanup)
                        ->get();

                    // Capture for broadcasting after commit
                    $notificationsToRemove = $othersNotifications;

                    // C. Delete Notifications only for staff
                    if ($othersNotifications->isNotEmpty()) {
                        \App\Models\Notification::whereIn('id_notification', $othersNotifications->pluck('id_notification'))
                            ->delete();
                    }
                });

                // 3. Broadcast Removal Events (AFTER COMMIT - ensuring API calls see clean DB)
                foreach ($notificationsToRemove as $notif) {
                    if ($notif->send_to) {
                        try {
                            // Helper to ensure 'id_spk' is sent in payload
                            broadcast(new \App\Events\NotificationRemoved($notif->send_to, $spk->id));
                        } catch (\Exception $e) {
                            Log::error("Failed to broadcast NotificationRemoved: " . $e->getMessage());
                        }
                    }
                }
            }
        }

        // 1. Fetch ALL statuses with Master Relation
        // 1. Fetch ALL statuses with Master Relation
        $spkStatuses = SpkStatus::with('masterStatus')->where('id_spk', $spk->id)->get();

        // 2. Determine Priority Status based on Index (Lower index = Higher Priority)

        // Logic: Only consider "Rejected" (ID 4) status IF there are ACTUAL active rejected documents.
        // We use fresh query and collection filtering to ensure Casts (boolean) are respected.
        $allDocs = DocumentTrans::where('id_spk', $spk->id)->get();

        // Check for Active Rejections (correction_attachment is TRUE)
        // FIX: Only check the LATEST version of each document type (id_dokumen).
        // Since we create new rows on re-upload, we must group by 'id_dokumen' and take the one with Max ID.
        $latestDocs = $allDocs->sortByDesc('id')->unique('id_dokumen');

        $hasActiveRejections = $latestDocs->contains(function ($doc) {
            return $doc->correction_attachment == true;
        });

        // Check for Pending Review (Uploaded but not Verified & Not Rejected)
        // verify != true captures both 'false' (0) and 'null' (Pending) safely.
        $hasPendingReview = $latestDocs->contains(function ($doc) {
            return $doc->verify != true
                && $doc->correction_attachment == false
                && !empty($doc->url_path_file);
        });

        // Check for Empty Documents (Not Uploaded)
        $hasEmptyDocs = $latestDocs->contains(function ($doc) {
            return empty($doc->url_path_file);
        });

        $activeStatuses = $spkStatuses->filter(function ($status) use ($hasActiveRejections, $hasPendingReview, $hasEmptyDocs) {
            $id = $status->id_status;

            // 1. Rejected (ID 4): Hide if no active rejections
            if ($id == 4 && !$hasActiveRejections) return false;

            // 2. Uploaded (ID 1) & Reuploaded (ID 3): Hide if no Pending Reviews
            if (in_array($id, [1, 3]) && !$hasPendingReview) return false;

            // 3. Requested (ID 2): Hide if no Empty Docs (Meaning all are uploaded)
            // This is CRITICAL because Requested (Index 1) overrides Verified (Index 2) if not hidden.
            if ($id == 2 && !$hasEmptyDocs) return false;

            return true;
        });

        // Sort by Index ASC (Primary), then Created At DESC (Secondary)
        $priorityStatus = $activeStatuses->sortBy([
            fn($a, $b) => ($a->masterStatus->index ?? 999) <=> ($b->masterStatus->index ?? 999),
            fn($a, $b) => $b->created_at <=> $a->created_at,
        ])->first();

        // 3. Format Data sesuai kebutuhan Frontend (shipmentData)
        $latestLog = \App\Models\DocumentStatus::whereIn('id_dokumen_trans', $allDocs->pluck('id'))
            ->latest()
            ->first();
        $shipmentData = [
            'id_spk'    => $spk->id,
            'spkDate'   => $priorityStatus ? $priorityStatus->created_at->format('d/m/y H.i') . ' WIB' : '-',
            'status'    => $priorityStatus ? $priorityStatus->status : 'UNKNOWN',
            'updated_by_name' => $latestLog->by ?? null, // Added to show who uploaded
            'shipmentType' => $spk->shipment_type,
            'type'      => $spk->shipment_type,
            'spkNumber'  => $spk->spk_code, // Mapping spk_code ke siNumber
            'id_customer' => $spk->id_customer,
            'penjaluran' => $spk->penjaluran,
            'internal_can_upload' => $spk->internal_can_upload,
            'is_created_by_internal' => $spk->is_created_by_internal,
            'validated_by' => $spk->validated_by, // Send to frontend
            'register_number' => $spk->register_number,
            'register_date' => $spk->register_date,
            'eta_date' => $spk->eta_date ? $spk->eta_date->toDateString() : null,
            'shipper' => $spk->shipper,
            'consignee' => $spk->consignee,
            'vessel' => $spk->vessel,
            'origin' => $spk->origin,
            'port' => $spk->port,
            'comodity' => $spk->comodity,
            'party_qty' => $spk->party_qty,
            'party_size' => $spk->party_size,
            'parties' => $spk->parties,
            'aju' => $spk->aju,
            'j_o' => $spk->j_o,
            'job_date' => $spk->job_date ? $spk->job_date->toDateString() : null,
            'inspection_date' => $spk->inspection_date ? $spk->inspection_date->toDateString() : null,
            'is_npd' => $spk->is_npd,
            'npd_date' => $spk->npd_date ? \Carbon\Carbon::parse($spk->npd_date)->toDateString() : null,
        ];

        // 3. Mapping HS Code
        // Catatan: Karena struktur DB saat ini one-to-one (spk belongsTo hsCode),
        // maka array ini hanya akan berisi 1 item.
        foreach ($spk->hsCodes as $hs) {
            $shipmentData['hsCodes'][] = [
                'id'   => $hs->id_hscode,
                'code' => $hs->hs_code,
                'link' => $hs->path_link_insw,
            ];
        }

        $sectionsTrans = SectionTrans::where('id_spk', $spk->id) // <--- TAMBAHKAN INI
            ->with(['documents' => function ($q) use ($spk) {
                // Filter dokumen juga (Double check agar aman)
                $q->where('id_spk', $spk->id)
                    ->orderBy('id', 'asc')
                    ->with('masterDocument'); // Load data master untuk keperluan Help/Video
            }])
            ->orderBy('section_order', 'asc')
            ->get();

        return Inertia::render('m_shipping/table/view-data-form', [
            'customer' => $spk->customer,
            'shipmentDataProp' => $shipmentData,
            'sectionsTransProp' => $sectionsTrans,
            'internalStaff' => $internalStaff, // Pass staff list
        ]);
    }

    /**
     * Assign Staff manually (Supervisor Only)
     */
    public function assignStaff(Request $request, $id)
    {
        $user = auth('web')->user();

        // 1. Authorization Check
        if (!$user->can('assign_staff-master-shipping')) {
            return back()->with('error', 'Unauthorized action.');
        }

        $validated = $request->validate([
            'assigned_pic' => 'required|integer|exists:users,id_user'
        ]);

        // 2. Resolve Tenant
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        }

        if (!$tenant) {
            return redirect()->back()->withErrors(['error' => 'Tenant not found']);
        }

        tenancy()->initialize($tenant);

        // 3. Update SPK & Handle Notification (Centralized)
        // We use NotificationService that handles transaction, SPK update, and Notification Cleanup
        try {
            // Re-fetch SPK to ensure fresh state
            $spk = Spk::findOrFail($id);

            if ($spk->validated_by == $validated['assigned_pic']) {
                return redirect()->back()->withErrors(['assigned_pic' => 'User is already assigned.']);
            }

            $assignedUser = User::on('tako-user')->find($validated['assigned_pic']);

            if ($assignedUser) {
                // 1. Update SPK assignment
                $spk->update(['validated_by' => $validated['assigned_pic']]);

                // 2. Send notification to newly assigned staff
                try {
                    // Internal Database Notification
                    NotificationService::send([
                        'send_to'    => $assignedUser->id_user,
                        'created_by' => $user->id_user,
                        'role'       => 'internal',
                        'id_spk'     => $spk->id,
                        'data'       => [
                            'type'     => 'spk_assigned',
                            'title'    => 'Penunjukan PIC SPK',
                            'message'  => "Anda ditunjuk sebagai PIC untuk SPK {$spk->spk_code} oleh {$user->name}",
                            'url'      => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code,
                        ]
                    ]);

                    // Email Notification
                    SectionReminderService::sendStaffAssigned($spk, $user, $assignedUser);
                } catch (\Exception $e) {
                    Log::error("Failed to send assignment notification: " . $e->getMessage());
                }

                // 3. Broadcast realtime update
                try {
                    ShippingDataUpdated::dispatch($spk->id, 'staff_assigned');
                } catch (\Exception $e) {
                    Log::error('Realtime update failed: ' . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            Log::error("Failed to assign staff: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to assign staff']);
        }

        return redirect()->back()->with('success', 'Staff has been assigned successfully.');
    }

    /**
     * Helper to send batch rejection notifications
     */
    private function sendBatchRejectionNotification($spk, $sectionName, $rejector, $count, $reason)
    {
        if ($rejector->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal')
                ->get();

            foreach ($customers as $cust) {
                // Email
                SectionReminderService::sendBatchDocumentRejected($spk, $sectionName, $rejector, $cust, $reason, $count);

                // Notification
                try {
                    NotificationService::sendBatchRejectionNotification([
                        'id_spk' => $spk->id,
                        'send_to' => $cust->id_user,
                        'created_by' => $rejector->id,
                        'role'   => 'eksternal',
                        'section_name' => $sectionName,
                        'reason' => $reason,
                        'count' => $count,
                        'spk_code' => $spk->spk_code
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 2. Notify Staff PIC (ONLY if rejected by CUSTOMER)
        if ($rejector->role === 'eksternal' && $spk->validated_by) {
            $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
            if ($staff && $staff->id_user != $rejector->id) {
                SectionReminderService::sendBatchDocumentRejected($spk, $sectionName, $rejector, $staff, $reason, $count);
                try {
                    NotificationService::sendBatchRejectionNotification([
                        'id_spk' => $spk->id,
                        'send_to' => $staff->id_user,
                        'created_by' => $rejector->id,
                        'role'   => 'internal',
                        'section_name' => $sectionName,
                        'reason' => $reason,
                        'count' => $count,
                        'spk_code' => $spk->spk_code
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 3. Notify Supervisors (Monitoring ALL actions)
        $supervisors = \App\Models\User::on('tako-user')
            ->where('role', 'internal')
            ->where('role_internal', 'supervisor')
            ->where('id_perusahaan', tenancy()->tenant->perusahaan_id ?? null)

            ->get();

        foreach ($supervisors as $supervisor) {
            if ($supervisor->id_user == $rejector->id) continue;
            // 1. Email for Supervisor
            try {
                SectionReminderService::sendBatchDocumentRejected($spk, $sectionName, $rejector, $supervisor, $reason, $count);
            } catch (\Exception $e) {
            }

            // 2. Notification for Supervisor
            try {
                NotificationService::sendBatchRejectionNotification([
                    'id_spk' => $spk->id,
                    'send_to' => $supervisor->id_user,
                    'created_by' => $rejector->id,
                    'role'   => 'internal',
                    'section_name' => $sectionName,
                    'reason' => $reason,
                    'count' => $count,
                    'spk_code' => $spk->spk_code
                ]);
            } catch (\Exception $e) {
            }
        }
    }

    /**
     * Helper to send batch verification notifications
     */
    private function sendBatchVerificationNotification($spk, $sectionName, $verifier, $count)
    {
        // 1. Verifier is Internal -> Notify Customer
        if ($verifier->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal')
                ->get();

            foreach ($customers as $cust) {
                // Email
                try {
                    SectionReminderService::sendDocumentVerified($spk, $sectionName, $verifier, $cust);
                } catch (\Exception $e) {
                }

                // Notification
                try {
                    NotificationService::send([
                        'id_spk' => $spk->id,
                        'send_to' => $cust->id_user,
                        'created_by' => $verifier->id,
                        'role'   => 'eksternal',
                        'data'   => [
                            'type'    => 'document_verified',
                            'title'   => 'Dokumen Diverifikasi',
                            'message' => "{$count} dokumen pada section {$sectionName} telah diverifikasi oleh {$verifier->name}.",
                            'url'     => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code,
                        ]
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 2. Notify Staff PIC (ONLY if verified by CUSTOMER)
        if ($verifier->role === 'eksternal' && $spk->validated_by) {
            $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
            if ($staff && $staff->id_user != $verifier->id) {
                try {
                    SectionReminderService::sendDocumentVerified($spk, $sectionName, $verifier, $staff);
                } catch (\Exception $e) {
                }
                try {
                    NotificationService::send([
                        'id_spk' => $spk->id,
                        'send_to' => $staff->id_user,
                        'created_by' => $verifier->id,
                        'role'   => 'internal',
                        'data'   => [
                            'type'    => 'document_verified',
                            'title'   => 'Dokumen Diverifikasi',
                            'message' => "{$count} dokumen pada section {$sectionName} telah diverifikasi oleh Customer {$verifier->name}",
                            'url'     => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code,
                        ]
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 3. Notify Supervisors (Monitoring ALL actions)
        $supervisors = \App\Models\User::on('tako-user')
            ->where('role', 'internal')
            ->where('role_internal', 'supervisor')
            ->where('id_perusahaan', tenancy()->tenant->perusahaan_id ?? null)

            ->get();

        foreach ($supervisors as $supervisor) {
            if ($supervisor->id_user == $verifier->id) continue;
            // 1. Email for Supervisor
            try {
                SectionReminderService::sendDocumentVerified($spk, $sectionName, $verifier, $supervisor);
            } catch (\Exception $e) {
            }

            // 2. Notification for Supervisor
            try {
                NotificationService::send([
                    'id_spk' => $spk->id,
                    'send_to' => $supervisor->id_user,
                    'created_by' => $verifier->id,
                    'role'   => 'internal',
                    'data'   => [
                        'type'    => 'document_verified',
                        'title'   => 'Dokumen Diverifikasi (Monitoring)',
                        'message' => "{$count} dokumen pada section {$sectionName} telah diverifikasi oleh " . ($verifier->role == 'internal' ? "Staff {$verifier->name}" : "Customer {$verifier->name}"),
                        'url'     => "/shipping/{$spk->id}",
                        'spk_code' => $spk->spk_code,
                    ]
                ]);
            } catch (\Exception $e) {
            }
        }
    }

    /**
     * Helper to send batch upload notifications
     */
    private function sendBatchUploadNotification($spk, $sectionName, $uploader, $count)
    {
        // A. Internal Uploader -> Notify Customer
        if ($uploader->role === 'internal') {
            $customers = \App\Models\User::on('tako-user')
                ->where('id_customer', $spk->id_customer)
                ->where('role', 'eksternal') // Or matching logic
                ->get();

            foreach ($customers as $cust) {
                // Email using Service
                SectionReminderService::sendDocumentUploaded($spk, $sectionName, $uploader, $cust);

                // Notification
                try {
                    NotificationService::send([
                        'send_to' => $cust->id_user,
                        'created_by' => $uploader->id,
                        'role' => 'eksternal',
                        'id_spk' => $spk->id,
                        'data' => [
                            'type' => 'document_uploaded',
                            'title' => 'Dokumen Baru Diupload',
                            'message' => "Staff {$uploader->name} mengupload {$count} dokumen pada section {$sectionName}.",
                            'url' => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code
                        ]
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 2. Notify Staff PIC (ONLY if uploaded by CUSTOMER)
        if ($uploader->role === 'eksternal' && $spk->validated_by) {
            $staff = \App\Models\User::on('tako-user')->find($spk->validated_by);
            if ($staff && $staff->id_user != $uploader->id) {
                SectionReminderService::sendDocumentUploaded($spk, $sectionName, $uploader, $staff);
                try {
                    NotificationService::send([
                        'send_to' => $staff->id_user,
                        'created_by' => $uploader->id,
                        'role' => 'internal',
                        'id_spk' => $spk->id,
                        'data' => [
                            'type' => 'document_uploaded',
                            'title' => 'Dokumen Baru Diupload',
                            'message' => "Customer {$uploader->name} mengupload {$count} dokumen pada section {$sectionName}.",
                            'url' => "/shipping/{$spk->id}",
                            'spk_code' => $spk->spk_code
                        ]
                    ]);
                } catch (\Exception $e) {
                }
            }
        }

        // 3. Notify Supervisors (Monitoring ALL actions)
        $supervisors = \App\Models\User::on('tako-user')
            ->where('role', 'internal')
            ->where('role_internal', 'supervisor')
            ->where('id_perusahaan', tenancy()->tenant->perusahaan_id ?? null)

            ->get();

        foreach ($supervisors as $supervisor) {
            if ($supervisor->id_user == $uploader->id) continue;
            // 1. Email for Supervisor
            try {
                SectionReminderService::sendDocumentUploaded($spk, $sectionName, $uploader, $supervisor);
            } catch (\Exception $e) {
            }

            // 2. Notification for Supervisor
            try {
                NotificationService::send([
                    'send_to' => $supervisor->id_user,
                    'created_by' => $uploader->id,
                    'role' => 'internal',
                    'id_spk' => $spk->id,
                    'data' => [
                        'type' => 'document_uploaded',
                        'title' => 'Dokumen Baru Diupload (Monitoring)',
                        'message' => ($uploader->role == 'internal' ? "Staff {$uploader->name}" : "Customer {$uploader->name}") . " mengupload {$count} dokumen pada section {$sectionName}.",
                        'url' => "/shipping/{$spk->id}",
                        'spk_code' => $spk->spk_code
                    ]
                ]);
            } catch (\Exception $e) {
            }
        }
    }


    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Spk $customer)
    {
        $user = auth('web')->user();

        $customer->load('attachments');

        return Inertia::render('m_shipping/table/edit-data-form', [
            'customer' => $customer->load('attachments'),
        ]);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Spk $customer)
    {
        $user = auth('web')->user();

        $createdDate = \Carbon\Carbon::parse($customer->created_at)->toDateString();
        $today = now()->toDateString();

        $canEditToday = $createdDate === $today;

        $validated = $request->validate([
            'kategori_usaha' => 'required|string',
            'nama_perusahaan' => 'required|string',
            'bentuk_badan_usaha' => 'required|string',
            'alamat_lengkap' => 'required|string',
            'kota' => 'required|string',
            'no_telp' => 'nullable|string',
            'no_fax' => 'nullable|string',
            'alamat_penagihan' => 'required|string',
            'email' => 'required|email',
            'website' => 'nullable|string',
            'top' => 'nullable|string',
            'status_perpajakan' => 'nullable|string',
            'no_npwp' => 'nullable|string',
            'no_npwp_16' => 'nullable|string',
            'nama_pj' => 'nullable|string',
            'no_ktp_pj' => 'nullable|string',
            'no_telp_pj' => 'nullable|string',
            'nama_personal' => 'nullable|string',
            'jabatan_personal' => 'nullable|string',
            'no_telp_personal' => 'nullable|string',
            'email_personal' => 'nullable|email',
            'keterangan_reject' => 'nullable|string',
            'user_id' => 'required|exists:users,id',
            'approved_1_by' => 'nullable|integer',
            'approved_2_by' => 'nullable|integer',
            'rejected_1_by' => 'nullable|integer',
            'rejected_2_by' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'tgl_approval_1' => 'nullable|date',
            'tgl_approval_2' => 'nullable|date',
            'tgl_customer' => 'nullable|date',

            'attachments' => 'required|array',
            'attachments.*.nama_file' => 'required|string',
            'attachments.*.path' => 'required|string',
            'attachments.*.type' => 'required|in:npwp,sppkp,ktp,nib',
        ]);

        try {
            DB::beginTransaction();

            $customer->update($validated);

            DB::commit();
            return redirect()->route('shipping.index')->with('success', 'Data Shipping berhasil diperbarui!');
        } catch (\Throwable $th) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Terjadi kesalahan: ' . $th->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Spk $customer)
    {

        try {
            DB::beginTransaction();

            $customer->delete();

            DB::commit();

            return redirect()->route('shipping.index')
                ->with('success', 'Data Shipping berhasil dihapus (soft delete)!');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('shipping.index')
                ->with('error', 'Gagal menghapus Data Shipping: ' . $e->getMessage());
        }
    }

    public function generatePdf($id)
    {
        Log::info("📄 Mulai generate PDF untuk Shipping ID: {$id}");

        $customer = Spk::with(['attachments', 'perusahaan'])->findOrFail($id);
        $user = auth('web')->user();

        $tempDir = storage_path("app/temp");
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
            Log::info("📁 Folder temp dibuat: {$tempDir}");
        }

        $mainPdfPath = "{$tempDir}/customer_{$customer->id}_main.pdf";
        $mainPdf = Pdf::loadView('pdf.customer', [
            'customer' => $customer,
            'generated_by' => $user?->name ?? 'Guest',
        ])->setPaper('a4');
        file_put_contents($mainPdfPath, $mainPdf->output());

        $attachmentPdfPaths = [];

        foreach ($customer->attachments as $attachment) {
            if (!in_array($attachment->type, ['npwp', 'nib', 'ktp'])) continue;

            $parsedPath = parse_url($attachment->path, PHP_URL_PATH);
            $relativePath = str_replace('/storage/', '', $parsedPath);
            $localPath = storage_path("app/public/{$relativePath}");

            if (!file_exists($localPath)) continue;

            if (Str::endsWith(strtolower($localPath), '.pdf')) {
                $attachmentPdfPaths[] = $localPath;
            } else {
                $convertedPdfPath = "{$tempDir}/converted_" . $attachment->type . "_{$customer->id}.pdf";
                $html = view('pdf.attachment-wrapper', [
                    'title' => strtoupper($attachment->type),
                    'filePath' => $localPath,
                    'extension' => pathinfo($localPath, PATHINFO_EXTENSION),
                ])->render();

                $converted = Pdf::loadHTML($html)->setPaper('a4');
                file_put_contents($convertedPdfPath, $converted->output());

                $attachmentPdfPaths[] = $convertedPdfPath;
            }
        }

        $mergedPath = "{$tempDir}/customer_{$customer->id}.pdf";
        try {
            $this->mergePdfsWithGhostscript(array_merge([$mainPdfPath], $attachmentPdfPaths), $mergedPath);

            if (!file_exists($mergedPath) || filesize($mergedPath) < 1000) {
                Log::error("❌ Merge gagal atau file terlalu kecil: {$mergedPath}");
                throw new \Exception('Merge PDF gagal.');
            }

            $finalPath = $mergedPath;
        } catch (\Throwable $e) {
            Log::error("⚠️ Ghostscript gagal, fallback ke main PDF. Error: " . $e->getMessage());
            $finalPath = $mainPdfPath;
        }

        Log::info("✅ Proses selesai, kirim file ke user.");

        return response()->download($finalPath, "customer_{$customer->id}.pdf", [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="customer_' . $customer->id . '.pdf"',
        ])->deleteFileAfterSend(true);
    }

    private function mergePdfsWithGhostscript(array $inputPaths, string $outputPath)
    {
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $gsCmd = $isWindows ? 'gswin64c' : 'gs';

        $inputFiles = implode(' ', array_map(function ($path) {
            return '"' . str_replace('\\', '/', $path) . '"';
        }, $inputPaths));

        $outputFile = '"' . str_replace('\\', '/', $outputPath) . '"';
        $cmd = "{$gsCmd} -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile={$outputFile} {$inputFiles}";

        exec($cmd . ' 2>&1', $output, $returnVar);

        if ($returnVar !== 0) {
            throw new \Exception("Ghostscript gagal menggabungkan PDF. Kode: {$returnVar}");
        }
    }


    /**
     * Get available documents from master_documents_trans where id_section is null or 0
     * These are documents that haven't been assigned to any section yet
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAvailableDocuments(Request $request)
    {
        $user = auth('web')->user();
        // Initialize tenant context FIRST
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant not found'
            ], 404);
        }

        tenancy()->initialize($tenant);

        // Validate AFTER tenant is initialized
        $request->validate([
            'id_spk' => 'integer|exists:tenant-transaction.spk,id',
            'id_section' => 'nullable|integer',
        ]);

        try {
            $existingDocs = DocumentTrans::where('id_spk', $request->id_spk)
                ->pluck('id_dokumen')
                ->filter()
                ->unique()
                ->toArray();
            $availableDocuments = MasterDocumentTrans::where(function ($query) use ($request) {

                // Global / Unassigned docs
                $query->whereNull('id_section')
                    ->orWhere('id_section', 0)
                    ->orWhere('id_section', 6);

                // Section-specific addable docs
                if ($request->id_section) {
                    $query->orWhere(function ($sub) use ($request) {
                        $sub->where('id_section', $request->id_section)
                            ->where('attribute', 0);
                    });
                }
            })
            ->where('is_active', 1) // jangan lupa ini kalau memang ada kolomnya
            ->when(!empty($existingDocs), function ($q) use ($existingDocs) {
                $q->whereNotIn('id_dokumen', $existingDocs);
            })
            ->select([
                'id_dokumen',
                'nama_file',
                'description_file',
                'is_internal',
                'is_verification',
                'attribute',
                'link_path_example_file',
                'link_path_template_file',
                'link_url_video_file'
            ])
            ->orderBy('nama_file', 'asc')
            ->get();

            return response()->json([
                'success' => true,
                'documents' => $availableDocuments
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to fetch available documents', [
                'error' => $e->getMessage(),
                'user_id' => $user->id_user,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add multiple documents to a section (Batch)
     */
    public function addDocumentsToSection(Request $request)
    {
        $user = auth('web')->user();
        // 1. Initialize Tenant Context
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        tenancy()->initialize($tenant);

        $request->validate([
            'id_spk' => 'required|integer|exists:tenant-transaction.spk,id',
            'id_section' => 'required|integer',
            'document_ids' => 'required|array',
            'document_ids.*' => 'integer|exists:master_documents_trans,id_dokumen'
        ]);

        try {
            DB::beginTransaction();

            $spkId = $request->id_spk;
            $masterSectionId = $request->id_section;
            $documentIds = $request->document_ids;

            $addedCount = 0;
            $skippedCount = 0;
            foreach ($documentIds as $masterDocTransId) {
                // Get master doc trans info
                $masterDocTrans = MasterDocumentTrans::find($masterDocTransId);

                if ($masterDocTrans) {
                    // Check if already exists in this SPK to prevent duplicates
                    $exists = DocumentTrans::where('id_spk', $spkId)
                        ->where('id_dokumen', $masterDocTrans->id_dokumen)
                        ->exists();

                    if (!$exists) {
                        DocumentTrans::create([
                            'id_spk' => $spkId,
                            'id_section' => $masterSectionId, // Use Master ID for correct grouping
                            'id_dokumen' => $masterDocTrans->id_dokumen,
                            'nama_file' => $masterDocTrans->nama_file,
                            'url_path_file' => null,
                            'verify' => null,
                            'correction_attachment' => false,
                            'kuota_revisi' => 3, // Default quota
                            'is_internal' => $masterDocTrans->is_internal,
                            'is_verification' => $masterDocTrans->is_verification,
                            'mapping_insw' => $masterDocTrans->mapping_insw,
                        ]);
                        $addedCount++;
                    } else {
                        $skippedCount++;
                    }
                }
            }

            DB::commit();

            if ($addedCount > 0) {
                try {
                    ShippingDataUpdated::dispatch($spkId, 'add_document');
                } catch (\Exception $e) {
                }

                // NOTIFICATION & EMAIL TO CUSTOMER
                try {
                    $spk = Spk::find($spkId);
                    if ($spk && $spk->id_customer) {
                        $section = MasterSectionTrans::find($masterSectionId);
                        $sectionName = $section ? $section->section_name : 'Section';

                        $customerUsers = \App\Models\User::on('tako-user')
                            ->where('role', 'eksternal')
                            ->where('id_customer', $spk->id_customer)
                            ->get();

                        foreach ($customerUsers as $extUser) {
                            // 1. Send Email
                            try {
                                SectionReminderService::sendDocumentAdded($spk, $sectionName, $user, $extUser, $addedCount);
                            } catch (\Exception $e) {
                                Log::error("Failed to send Document Added Email: " . $e->getMessage());
                            }

                            // 2. WebSocket Notification
                            try {
                                NotificationService::send([
                                    'send_to' => $extUser->id_user,
                                    'created_by' => $user->id_user,
                                    'role' => 'eksternal',
                                    'id_section' => $masterSectionId,
                                    'id_spk' => $spk->id,
                                    'data' => [
                                        'type' => 'document_requested',
                                        'title' => 'Dokumen Tambahan',
                                        'message' => "Ada Dokumen tambahan yang perlu anda cek pada section {$sectionName} di SPK {$spk->spk_code}",
                                        'url' => "/shipping/{$spk->id}#section-{$masterSectionId}",
                                        'spk_code' => $spk->spk_code
                                    ]
                                ]);
                            } catch (\Exception $e) {
                                Log::error("Failed to send Document Added Notification: " . $e->getMessage());
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to process document added notifications: " . $e->getMessage());
                }
            }

            // Build informative message
            if ($addedCount > 0 && $skippedCount > 0) {
                $message = "Berhasil menambah {$addedCount} dokumen. {$skippedCount} dokumen lainnya sudah ada (duplikat) sehingga dilewati.";
            } elseif ($addedCount > 0) {
                $message = "Berhasil menambah {$addedCount} dokumen.";
            } else {
                $message = "Tidak ada dokumen yang ditambahkan. Semua dokumen yang dipilih sudah ada di SPK ini.";
            }

            return response()->json([
                'success' => $addedCount > 0,
                'message' => $message,
                'added_count' => $addedCount,
                'skipped_count' => $skippedCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to add documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unified Batch Save: Upload, Verify, Reject, and Deadline in one request.
     */
    public function unifiedBatchSave(Request $request)
    {
        $user = auth('web')->user();
        $userId = $user->id_user ?? $user->id;

        // --- PERMISSION CHECK ---
        // 1. Check for Upload Permission
        if ($request->has('attachments') && is_array($request->attachments) && count($request->attachments) > 0) {
            if (!$user->can('upload-document')) {
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['message' => 'Anda tidak memiliki izin untuk mengunggah dokumen.']);
                }
                return response()->json(['success' => false, 'message' => 'Anda tidak memiliki izin untuk mengunggah dokumen.'], 403);
            }
        }

        // 2. Check for Verify/Reject Permission
        $hasVerify = ($request->has('verified_ids') && is_array($request->verified_ids) && count($request->verified_ids) > 0);
        $hasReject = ($request->has('rejections') && is_array($request->rejections) && count($request->rejections) > 0);

        if ($hasVerify || $hasReject) {
            if (!$user->can('verify-document')) {
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['message' => 'Anda tidak memiliki izin untuk memverifikasi atau menolak dokumen.']);
                }
                return response()->json(['success' => false, 'message' => 'Anda tidak memiliki izin untuk memverifikasi atau menolak dokumen.'], 403);
            }
        }

        $request->validate([
            'spk_id' => 'required',
            'section_id' => 'required',
            'section_name' => 'nullable|string',
            'attachments' => 'nullable|array',
            'verified_ids' => 'nullable|array',
            'rejections' => 'nullable|array',
            'deadline' => 'nullable|string',
        ]);

        $spkId = $request->spk_id;
        $sectionId = $request->section_id;
        $sectionName = $request->section_name ?? 'Document';

        // 1. Initialize Tenancy
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }
        if (!$tenant) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => 'Tenant not found']);
            }
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }
        tenancy()->initialize($tenant);

        $spk = Spk::findOrFail($spkId);
        $metrics = ['uploads' => 0, 'verifications' => 0, 'rejections' => 0, 'deadline' => false];

        DB::beginTransaction();
        DB::connection('tenant-transaction')->beginTransaction();
        try {
            // --- A. PROCESS ATTACHMENTS ---
            if ($request->has('attachments') && is_array($request->attachments)) {
                $uniqueSections = [];
                $hasAnyReupload = false;

                foreach ($request->attachments as $att) {
                    $tempPath = $att['path'];
                    if (!Storage::disk('customers_external')->exists($tempPath)) {
                        $tempPath = ltrim($tempPath, '/');
                        if (!Storage::disk('customers_external')->exists($tempPath)) continue;
                    }

                    $targetDoc = DocumentTrans::with('sectionTrans')->find($att['document_id']);
                    if (!$targetDoc) continue;

                    if ($targetDoc->sectionTrans) {
                        $uniqueSections[$targetDoc->sectionTrans->id] = $targetDoc->sectionTrans->section_name;
                    }

                    // Re-upload logic: only replicate if it already has a file OR is marked as correction.
                    // IMPORTANT: If url_path_file is empty, we just update the existing record to avoid "empty v1" duplicates.
                    $isReupload = ($targetDoc->correction_attachment && !empty($targetDoc->url_path_file)) || !empty($targetDoc->url_path_file);
                    if ($isReupload) $hasAnyReupload = true;

                    // Processing
                    $fileContent = Storage::disk('customers_external')->get($tempPath);
                    $ext = strtolower(pathinfo($tempPath, PATHINFO_EXTENSION));
                    $shippingFolder = "shipping/" . date('Y/m') . "/{$spk->spk_code}";

                    if (!Storage::disk('customers_external')->exists($shippingFolder)) Storage::disk('customers_external')->makeDirectory($shippingFolder);

                    $cleanType = preg_replace('/[^A-Za-z0-9]/', '_', $att['type']);
                    $cleanSpkCode = preg_replace('/[^A-Za-z0-9]/', '_', $spk->spk_code);

                    $fileName = "{$cleanType}_{$cleanSpkCode}";
                    $finalRelPath = "{$shippingFolder}/{$fileName}.{$ext}";
                    $absPath = Storage::disk('customers_external')->path($finalRelPath);

                    Storage::disk('customers_external')->put($finalRelPath, $fileContent);

                    // Optimized GS -> Now Asynchronous via Job
                    if ($ext === 'pdf' && filesize($absPath) > 2 * 1024 * 1024) {
                        GhostscriptCompressionJob::dispatch($absPath, $finalRelPath);
                    } elseif (in_array($ext, ['jpg', 'jpeg', 'png'])) {
                        $this->resizeImage($absPath, 800, 75);
                    }

                    Storage::disk('customers_external')->delete($tempPath);

                    if ($isReupload) {
                        $isAutoVerified = $spk->internal_can_upload || ($targetDoc->is_verification === false);
                        $newDoc = $targetDoc->replicate();
                        $newDoc->url_path_file = $finalRelPath;
                        $newDoc->verify = $isAutoVerified ? true : null;
                        $newDoc->correction_attachment = false;
                        $newDoc->kuota_revisi = max(0, $targetDoc->kuota_revisi - 1);
                        $newDoc->upload_date = now();
                        if ($isAutoVerified) {
                            $newDoc->verified_date = now();
                        }
                        $newDoc->save();
                        $logId = $newDoc->id;
                    } else {
                        $isAutoVerified = $spk->internal_can_upload || ($targetDoc->is_verification === false);
                        $updateData = [
                            'url_path_file' => $finalRelPath,
                            'verify' => $isAutoVerified ? true : null,
                            'correction_attachment' => false,
                            'kuota_revisi' => max(0, $targetDoc->kuota_revisi - 1),
                            'upload_date' => now(),
                        ];
                        if ($isAutoVerified) {
                            $updateData['verified_date'] = now();
                        }
                        $targetDoc->update($updateData);
                        $logId = $targetDoc->id;
                    }

                    DocumentStatus::create(['id_dokumen_trans' => $logId, 'status' => 'Uploaded', 'by' => $user->name]);
                    $metrics['uploads']++;
                }

                if ($metrics['uploads'] > 0) {
                    $notifSec = count($uniqueSections) > 0 ? implode(' dan ', $uniqueSections) : $sectionName;
                    $this->sendBatchUploadNotification($spk, $notifSec, $user, $metrics['uploads']);

                    // Update Status
                    $statusId = $hasAnyReupload ? 3 : 1;
                    $statusTxt = "{$notifSec} " . ($hasAnyReupload ? 'Reuploaded' : 'Uploaded');
                    SpkStatus::create(['id_spk' => $spk->id, 'id_status' => $statusId, 'status' => $statusTxt]);
                }
            }

            // --- B. VERIFICATIONS ---
            if ($request->has('verified_ids') && is_array($request->verified_ids)) {
                $ids = $request->verified_ids;
                DocumentTrans::whereIn('id', $ids)->update(['verify' => true, 'correction_attachment' => false, 'verified_date' => now(), 'updated_at' => now()]);
                foreach ($ids as $id) {
                    DocumentStatus::create(['id_dokumen_trans' => $id, 'status' => 'Verified', 'by' => $user->name]);
                }
                SpkStatus::create(['id_spk' => $spk->id, 'id_status' => 2, 'status' => "{$sectionName} Verified"]);
                $this->sendBatchVerificationNotification($spk, $sectionName, $user, count($ids));
                $metrics['verifications'] = count($ids);
            }

            // --- C. REJECTIONS ---
            if ($request->has('rejections') && is_array($request->rejections)) {
                $rejSecs = [];
                foreach ($request->rejections as $index => $rej) {
                    $doc = DocumentTrans::with('sectionTrans')->findOrFail($rej['doc_id']);
                    if ($doc->sectionTrans) $rejSecs[$doc->sectionTrans->id] = $doc->sectionTrans->section_name;

                    $rejPath = null; // Reset — don't carry over file from previous rejection
                    $file = $request->file("rejections.$index.file");
                    if ($file) $rejPath = $file->store('corrections', 'customers_external');

                    $doc->update(['verify' => false, 'correction_attachment' => true, 'correction_description' => $rej['note'], 'correction_attachment_file' => $rejPath]);
                    DocumentStatus::create(['id_dokumen_trans' => $doc->id, 'status' => 'Rejected', 'by' => $user->name]);
                    $metrics['rejections']++;
                }
                if ($metrics['rejections'] > 0) {
                    $rejSecName = implode(' dan ', $rejSecs);
                    SpkStatus::create(['id_spk' => $spk->id, 'id_status' => 4, 'status' => "{$rejSecName} Rejected"]);
                    $this->sendBatchRejectionNotification($spk, $rejSecName, $user, $metrics['rejections'], $request->rejections[0]['note']);
                }
            }

            // --- D. DEADLINE ---
            if ($request->deadline) {
                // $sectionId is the primary key (id) of SectionTrans, NOT id_section.
                // id_section = master section reference, id = unique transactional row PK.
                $st = SectionTrans::find($sectionId);
                if ($st && $st->id_spk == $spk->id) {
                    $st->update([
                        'deadline' => true,
                        'deadline_date' => $request->deadline,
                    ]);
                    $metrics['deadline'] = true;
                }
            }

            DB::connection('tenant-transaction')->commit();
            DB::commit();

            try {
                broadcast(new ShippingDataUpdated($spk->id, 'unified_save'))->toOthers();
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return redirect()->route('shipping.show', $spk->id);
        } catch (\Throwable $e) {
            DB::connection('tenant-transaction')->rollBack();
            DB::rollBack();
            Log::error("Unified Save Fail: " . $e->getMessage());

            return redirect()->back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    /**
     * Update deadline (Global or Per-Section)
     */
    public function updateDeadline(Request $request)
    {
        $user = auth('web')->user();

        // 1. Initialize Tenancy
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        $request->validate([
            'spk_id' => 'required',
            'unified' => 'required|boolean',
            'global_deadline' => 'nullable|string',
            'section_deadlines' => 'nullable|array',
        ]);

        try {
            DB::connection('tenant-transaction')->beginTransaction();

            if ($request->unified) {
                // Update all sections for this SPK
                SectionTrans::where('id_spk', $request->spk_id)->update([
                    'deadline' => true,
                    'deadline_date' => $request->global_deadline
                ]);
            } else {
                // Update specific sections
                if ($request->has('section_deadlines')) {
                    foreach ($request->section_deadlines as $sectionId => $date) {
                        SectionTrans::where(['id_spk' => $request->spk_id, 'id' => $sectionId])->update([
                            'deadline' => true,
                            'deadline_date' => $date
                        ]);
                    }
                }
            }

            DB::connection('tenant-transaction')->commit();

            try {
                broadcast(new ShippingDataUpdated($request->spk_id, 'deadline_update'))->toOthers();
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json(['success' => true, 'message' => 'Deadline updated successfully']);
        } catch (\Exception $e) {
            DB::connection('tenant-transaction')->rollBack();
            Log::error('Failed to update deadline: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update deadline: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update internal_can_upload toggle for SPK (Supervisor only)
     */
    public function updateInternalCanUpload(Request $request)
    {
        $user = auth('web')->user();

        // Supervisor-only guard
        if (!$user->can('assign_staff-master-shipping')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Initialize tenant context FIRST
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        $validated = $request->validate([
            'id_spk'              => 'required|integer',
            'internal_can_upload' => 'required|boolean',
        ]);

        try {
            $spk = Spk::findOrFail($validated['id_spk']);
            $spk->update(['internal_can_upload' => $validated['internal_can_upload']]);

            Log::info('internal_can_upload updated', [
                'spk_id'              => $spk->id,
                'internal_can_upload' => $validated['internal_can_upload'],
                'by'                  => $user->id_user,
            ]);

            try {
                ShippingDataUpdated::dispatch($spk->id, 'internal_can_upload_update');
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success'             => true,
                'message'             => 'Upload mode updated',
                'internal_can_upload' => $validated['internal_can_upload'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to update internal_can_upload: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update upload mode'], 500);
        }
    }

    /**
     * Update penjaluran (jalur merah/biru) for SPK
     */
    public function updatePenjaluran(Request $request)
    {
        $user = auth('web')->user();

        // Initialize tenant context FIRST
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        $validated = $request->validate([
            'id_spk'          => 'required|integer',
            'penjaluran'      => 'required|string|in:merah,hijau',
            'register_number' => 'required|string|max:50',
            'register_date'   => 'required|date',
        ]);

        try {
            $spk = Spk::findOrFail($validated['id_spk']);
            $spk->update([
                'penjaluran'      => $validated['penjaluran'],
                'register_number' => $validated['register_number'],
                'register_date'   => $validated['register_date'],
            ]);

            Log::info('Penjaluran updated', ['spk_id' => $spk->id, 'penjaluran' => $validated['penjaluran']]);

            try {
                ShippingDataUpdated::dispatch($spk->id, 'penjaluran_update');
            } catch (\Exception $e) {
                Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json(['success' => true, 'message' => 'Penjaluran updated', 'penjaluran' => $validated['penjaluran']]);
        } catch (\Throwable $e) {
            Log::error('Failed to update penjaluran: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to update penjaluran'], 500);
        }
    }

    /**
     * Download semua dokumen terbaru dari SPK sebagai ZIP
     * Hanya ambil versi terbaru per id_dokumen (bukan semua histori upload)
     */
    public function downloadZip($id)
    {
        $user = auth('web')->user();

        // Resolve tenant
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        $spk = Spk::findOrFail($id);

        // Ambil semua dokumen yang sudah punya file (url_path_file tidak kosong)
        $allDocs = DocumentTrans::where('id_spk', $spk->id)
            ->whereNotNull('url_path_file')
            ->where('url_path_file', '!=', '')
            ->orderBy('id', 'asc')
            ->get();

        // Hanya ambil versi TERBARU per id_dokumen (id terbesar = paling baru)
        $latestDocs = $allDocs
            ->groupBy('id_dokumen')
            ->map(fn($group) => $group->sortByDesc('id')->first())
            ->values()
            ->filter(fn($doc) => !empty($doc->url_path_file));

        if ($latestDocs->isEmpty()) {
            return response()->json(['error' => 'Tidak ada dokumen yang tersedia untuk diunduh.'], 404);
        }

        $disk = Storage::disk('customers_external');
        $spkCode = Str::slug($spk->spk_code, '_');
        $zipFileName = "dokumen_{$spkCode}.zip";

        // Gunakan sys_get_temp_dir() untuk temporary file
        $tempZipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $zipFileName;

        $zip = new \ZipArchive();
        if ($zip->open($tempZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json(['error' => 'Gagal membuat file ZIP.'], 500);
        }

        $addedCount = 0;
        $usedNames = []; // Untuk handle collision nama file

        foreach ($latestDocs as $doc) {
            $filePath = $disk->path($doc->url_path_file);

            if (!file_exists($filePath)) {
                Log::warning("downloadZip: file tidak ditemukan: {$filePath}");
                continue;
            }

            // Buat nama file yang aman dan unik di dalam ZIP
            $originalName = $doc->nama_file ?? basename($doc->url_path_file);
            $ext = pathinfo($doc->url_path_file, PATHINFO_EXTENSION);
            $safeBaseName = Str::slug($originalName, '_');
            if ($ext && !Str::endsWith($safeBaseName, ".{$ext}")) {
                $safeBaseName .= ".{$ext}";
            }

            // Handle duplikat nama
            $finalName = $safeBaseName;
            $counter = 1;
            while (isset($usedNames[$finalName])) {
                $nameWithoutExt = pathinfo($safeBaseName, PATHINFO_FILENAME);
                $finalName = "{$nameWithoutExt}_{$counter}.{$ext}";
                $counter++;
            }
            $usedNames[$finalName] = true;

            $zip->addFile($filePath, $finalName);
            $addedCount++;
        }

        $zip->close();

        if ($addedCount === 0) {
            @unlink($tempZipPath);
            return response()->json(['error' => 'Tidak ada file fisik yang ditemukan.'], 404);
        }

        return response()->download($tempZipPath, $zipFileName, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    public function availableSections(Request $request)
    {
        $user = auth('web')->user();

        $request->validate([
            'id_spk' => 'required|integer',
        ]);

        // Tentukan tenant
        $tenant = null;

        if ($user->id_perusahaan) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant tidak ditemukan.',
            ], 404);
        }

        tenancy()->initialize($tenant);

        $idSpk = $request->id_spk;

        // Pastikan SPK ada di tenant
        $spk = \App\Models\Spk::find($idSpk);
        if (!$spk) {
            return response()->json([
                'success' => false,
                'message' => 'SPK tidak ditemukan.',
            ], 404);
        }

        // Ambil id_section yang sudah ada di section_trans
        $existingSectionIds = SectionTrans::where('id_spk', $idSpk)
            ->pluck('id_section')
            ->filter()
            ->values()
            ->toArray();

        // Ambil master section yang belum dipakai (dari DB Tenant)
        $sections = MasterSectionTrans::when(!empty($existingSectionIds), function ($query) use ($existingSectionIds) {
            $query->whereNotIn('id_section', $existingSectionIds);
        })
            ->where('id_section', '!=', 6)
            ->orderBy('section_order', 'asc')
            ->get([
                'id_section',
                'section_name',
                'section_order',
                'is_penjaluran',
                'attribute_section',
                'is_checklist',
            ]);

        return response()->json([
            'success' => true,
            'sections' => $sections,
        ]);
    }

    public function addSectionsToSpk(Request $request)
    {
        $user = auth('web')->user();

        $request->validate([
            'id_spk' => 'required|integer',
            'section_ids' => 'required|array|min:1',
            'section_ids.*' => 'required|integer',
        ]);

        // Tentukan tenant
        $tenant = null;

        if ($user->id_perusahaan) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant tidak ditemukan.',
            ], 404);
        }

        tenancy()->initialize($tenant);

        $idSpk = $request->id_spk;
        $sectionIds = collect($request->section_ids)->unique()->values()->toArray();

        $spk = \App\Models\Spk::find($idSpk);
        if (!$spk) {
            return response()->json([
                'success' => false,
                'message' => 'SPK tidak ditemukan.',
            ], 404);
        }

        \Illuminate\Support\Facades\DB::beginTransaction();

        try {
            // Ambil section yang sudah ada di tenant untuk SPK ini
            $existingSectionIds = SectionTrans::where('id_spk', $idSpk)
                ->pluck('id_section')
                ->filter()
                ->values()
                ->toArray();

            // Filter supaya hanya section yang belum ada
            $newSectionIds = array_values(array_diff($sectionIds, $existingSectionIds));

            if (empty($newSectionIds)) {
                \Illuminate\Support\Facades\DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Semua section yang dipilih sudah ada.',
                ], 422);
            }

            // Ambil master section dari DB Tenant
            $masterSections = MasterSectionTrans::whereIn('id_section', $newSectionIds)
                ->where('id_section', '!=', 6)
                ->orderBy('section_order', 'asc')
                ->get();

            foreach ($masterSections as $masterSec) {
                SectionTrans::create([
                    'id_section' => $masterSec->id_section,
                    'id_spk' => $idSpk,
                    'section_name' => $masterSec->section_name,
                    'section_order' => $masterSec->section_order,
                    'deadline' => false,
                    'deadline_date' => null,
                ]);

                // NEW: Generate Dokumen Mandatory untuk section yang baru ditambahkan ini
                // Mengambil template dokumen terbaru dari MasterDocumentTrans
                $masterDocs = MasterDocumentTrans::where('id_section', $masterSec->id_section)
                    ->where('is_active', true)
                    ->where('attribute', true) // Hanya yang mandatory
                    ->get();

                foreach ($masterDocs as $mDoc) {
                    $logMessage = "Document {$masterSec->section_name} requested " . now()->format('d-m-Y H:i') . " WIB";

                    $newDoc = DocumentTrans::create([
                        'id_spk'          => $idSpk,
                        'id_dokumen'      => $mDoc->id_dokumen,
                        'id_section'      => $mDoc->id_section,
                        'nama_file'       => $mDoc->nama_file,
                        'is_internal'     => $mDoc->is_internal ?? false,
                        'is_verification' => $mDoc->is_verification ?? true,
                        'verify'          => false,
                        'kuota_revisi'    => $mDoc->kuota_revisi ?: 3,
                        'updated_by'      => $user->id_user,
                        'logs'            => $logMessage,
                    ]);

                    DocumentStatus::create([
                        'id_dokumen_trans' => $newDoc->id,
                        'status'           => $logMessage,
                        'by'               => $user->name,
                    ]);
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            // REALTIME UPDATE
            try {
                \App\Events\ShippingDataUpdated::dispatch($idSpk, 'update');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Realtime update failed in addSectionsToSpk: ' . $e->getMessage());
            }

            // NOTIFICATION & EMAIL TO CUSTOMER
            try {
                if ($spk && $spk->id_customer) {
                    $sectionNames = $masterSections->pluck('section_name')->implode(', ');
                    $sectionCount = $masterSections->count();

                    $customerUsers = \App\Models\User::on('tako-user')
                        ->where('role', 'eksternal')
                        ->where('id_customer', $spk->id_customer)
                        ->get();

                    foreach ($customerUsers as $extUser) {
                        try {
                            SectionReminderService::sendSectionAdded($spk, $sectionNames, $user, $extUser, $sectionCount);
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::error("Failed to send Section Added Email: " . $e->getMessage());
                        }

                        try {
                            NotificationService::send([
                                'send_to' => $extUser->id_user,
                                'created_by' => $user->id_user,
                                'role' => 'eksternal',
                                'id_spk' => $spk->id,
                                'data' => [
                                    'type' => 'section_added',
                                    'title' => 'Section Tambahan',
                                    'message' => "Ada section tambahan yang perlu anda cek pada SPK {$spk->spk_code} ({$sectionNames})",
                                    'url' => "/shipping/{$spk->id}",
                                    'spk_code' => $spk->spk_code
                                ]
                            ]);
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::error("Failed to send Section Added Notification: " . $e->getMessage());
                        }
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Failed to process section added notifications: " . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Section berhasil ditambahkan ke SPK.',
            ]);
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan section.',
                'error' => $th->getMessage(),
            ], 500);
        }
    }
    public function removeSectionFromSpk(Request $request)
    {
        $user = auth('web')->user();

        // Security check: Only internal supervisors can remove sections
        if (!$user->can('assign_staff-master-shipping')) {
            return response()->json(['success' => false, 'message' => 'Hanya Supervisor yang diperbolehkan menghapus section.'], 403);
        }

        $request->validate([
            'id_spk' => 'required|integer',
            'id' => 'required|integer', // This is the PK of SectionTrans
        ]);

        // Resolve Tenant
        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = \App\Models\Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found.'], 404);
        }

        tenancy()->initialize($tenant);

        try {
            DB::beginTransaction();
            DB::connection('tenant-transaction')->beginTransaction();

            $section = SectionTrans::where('id', $request->id)
                ->where('id_spk', $request->id_spk)
                ->first();

            if (!$section) {
                return response()->json(['success' => false, 'message' => 'Section not found.'], 404);
            }

            // ONLY allow if id_section > 6
            if ($section->id_section <= 6) {
                return response()->json(['success' => false, 'message' => 'Cannot delete mandatory sections.'], 403);
            }

            // Delete associated documents first to be safe (though maybe cascaded)
            DocumentTrans::where('id_spk', $request->id_spk)
                ->where('id_section', $section->id_section)
                ->delete();

            $section->delete();

            DB::connection('tenant-transaction')->commit();
            DB::commit();

            try {
                ShippingDataUpdated::dispatch($request->id_spk, 'section_removed');
            } catch (\Exception $e) {
            }

            return response()->json(['success' => true, 'message' => 'Section removed successfully.']);
        } catch (\Throwable $th) {
            DB::connection('tenant-transaction')->rollBack();
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to remove section.', 'error' => $th->getMessage()], 500);
        }
    }

    public function updateEtaDate(Request $request, $idSpk)
    {
        $user = auth('web')->user();
        if ($user->role === 'eksternal') {
            abort(403);
        }

        $validated = $request->validate([
            'eta_date' => 'required|date',
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        }

        if (!$tenant) {
            abort(404, 'Tenant not found');
        }

        tenancy()->initialize($tenant);

        try {
            $spk = Spk::findOrFail($idSpk);

            // Format to start of day to avoid timezone shifting during storage
            $date = \Carbon\Carbon::parse($validated['eta_date'])->startOfDay();

            $spk->update([
                'eta_date' => $date,
            ]);

            // Dispatch event for real-time updates across browsers
            try {
                \App\Events\ShippingDataUpdated::dispatch($spk->id, 'update');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'eta_date' => $date->toDateString() // Send back YYYY-MM-DD
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateJobDate(Request $request, $idSpk)
    {
        $user = auth('web')->user();
        if ($user->role === 'eksternal') {
            abort(403);
        }

        $validated = $request->validate([
            'job_date' => 'required|date',
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        }

        if (!$tenant) {
            abort(404, 'Tenant not found');
        }

        tenancy()->initialize($tenant);

        try {
            $spk = Spk::findOrFail($idSpk);
            $date = \Carbon\Carbon::parse($validated['job_date'])->startOfDay();

            $spk->update([
                'job_date' => $date,
            ]);

            try {
                \App\Events\ShippingDataUpdated::dispatch($spk->id, 'update');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'job_date' => $date->toDateString()
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateInspectionDate(Request $request, $idSpk)
    {
        $user = auth('web')->user();
        if ($user->role === 'eksternal') {
            abort(403);
        }

        $validated = $request->validate([
            'inspection_date' => 'required|date',
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        }

        if (!$tenant) {
            abort(404, 'Tenant not found');
        }

        tenancy()->initialize($tenant);

        try {
            $spk = Spk::findOrFail($idSpk);
            $date = \Carbon\Carbon::parse($validated['inspection_date'])->startOfDay();

            $spk->update([
                'inspection_date' => $date,
            ]);

            try {
                \App\Events\ShippingDataUpdated::dispatch($spk->id, 'update');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Realtime update failed: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'inspection_date' => $date->toDateString()
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Auto save form fields for SPK
     */
    public function updateFormFields(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        try {
            $spk = Spk::findOrFail($idSpk);

            $data = $request->only([
                'shipper',
                'consignee',
                'vessel',
                'origin',
                'port',
                'comodity',
                'party_qty',
                'party_size',
                'aju',
                'j_o'
            ]);

            $spk->update($data);

            // Update Parties
            if ($request->has('parties')) {
                $parties = $request->input('parties', []);
                $spk->parties()->delete();
                foreach ($parties as $p) {
                    $spk->parties()->create([
                        'party_type' => $p['party_type'] ?? ($p['type'] ?? ''),
                        'party_category' => $p['party_category'] ?? ($p['category'] ?? null),
                        'party_qty' => $p['party_qty'] ?? ($p['qty'] ?? ''),
                        'party_size' => $p['party_size'] ?? ($p['size'] ?? ''),
                    ]);
                }
            }

            return response()->json(['success' => true, 'message' => 'Form fields auto-saved successfully']);
        } catch (\Throwable $th) {
            Log::error("Failed to update form fields: " . $th->getMessage());
            return response()->json(['success' => false, 'error' => $th->getMessage()], 500);
        }
    }

    /**
     * Update ori_date for multiple documents
     */
    public function updateOriDates(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        try {
            $spk = Spk::findOrFail($idSpk);
            $documents = $request->input('documents', []);

            foreach ($documents as $item) {
                $doc = DocumentTrans::where('id', $item['doc_id'])
                    ->where('id_spk', $spk->id)
                    ->first();

                if ($doc) {
                    $doc->update([
                        'ori_date' => $item['ori_date'] ?? null,
                    ]);
                }
            }

            return response()->json(['success' => true, 'message' => 'ORI dates updated successfully']);
        } catch (\Throwable $th) {
            Log::error("Failed to update ORI dates: " . $th->getMessage());
            return response()->json(['success' => false, 'error' => $th->getMessage()], 500);
        }
    }

    public function getNpdInfo(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        // Find NPD section (contains 'npd' case insensitive)
        $npdSection = MasterSectionTrans::whereRaw('LOWER(section_name) LIKE ?', ['%npd%'])->first();

        if (!$npdSection) {
            return response()->json(['success' => false, 'message' => 'NPD section not found in MasterSectionTrans'], 404);
        }

        // Get mandatory documents for this section
        $mandatoryDocs = MasterDocumentTrans::where('id_section', $npdSection->id_section)
            ->where('is_active', true)
            ->where('attribute', true)
            ->get();

        $existingDocs = DocumentTrans::where('id_spk', $idSpk)
            ->pluck('id_dokumen')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        $sections = array_unique([
            $npdSection->id_section,
            6
        ]);

        $additionalDocs = MasterDocumentTrans::whereIn('id_section', $sections)
            ->where('is_active', 1)
            ->where('attribute', 0)
            ->when(!empty($existingDocs), function ($q) use ($existingDocs) {
                $q->whereNotIn('id_dokumen', $existingDocs);
            })
            ->get();

        return response()->json([
            'success' => true,
            'id_section' => $npdSection->id_section,
            'section_name' => $npdSection->section_name,
            'mandatory_docs' => $mandatoryDocs,
            'additional_docs' => $additionalDocs,
        ]);
    }

    public function updateNpd(Request $request, $idSpk)
    {
        $user = auth('web')->user();

        $request->validate([
            'is_npd' => 'required|boolean',
            'npd_date' => 'nullable|date',
            'id_section' => 'nullable|integer',
            'attachments' => 'nullable|array',
            'additional_documents' => 'nullable|array',
        ]);

        $tenant = null;
        if ($user->id_perusahaan) {
            $tenant = Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
        } elseif ($user->id_customer) {
            $customer = Customer::find($user->id_customer);
            if ($customer && $customer->ownership) {
                $tenant = Tenant::where('perusahaan_id', $customer->ownership)->first();
            }
        }

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);
        }

        tenancy()->initialize($tenant);

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            $spk = Spk::findOrFail($idSpk);

            // Format to start of day to avoid timezone shifting during storage
            $npdDate = $request->npd_date ? \Carbon\Carbon::parse($request->npd_date)->startOfDay() : null;

            $spk->update([
                'is_npd' => $request->is_npd,
                'npd_date' => $npdDate,
            ]);

            if (!$request->is_npd) {
                // Ambil semua section yang mengandung 'npd'
                $npdSections = MasterSectionTrans::whereRaw('LOWER(section_name) LIKE ?', ['%npd%'])
                    ->pluck('id_section')
                    ->toArray();

                if (!empty($npdSections)) {

                    // Hapus semua document_trans terkait NPD sections
                    DocumentTrans::where('id_spk', $idSpk)
                        ->whereIn('id_section', $npdSections)
                        ->delete();

                    // Hapus semua section_trans terkait NPD sections
                    SectionTrans::where('id_spk', $idSpk)
                        ->whereIn('id_section', $npdSections)
                        ->delete();
                }
            }

            // If checked and section ID provided, automatically assign section and upload attachments
            if ($request->is_npd && $request->id_section) {
                $existingSection = SectionTrans::where('id_spk', $idSpk)->where('id_section', $request->id_section)->first();
                if (!$existingSection) {
                    $masterSec = MasterSectionTrans::where('id_section', $request->id_section)->first();
                    if ($masterSec) {
                        $existingSection = SectionTrans::create([
                            'id_section' => $masterSec->id_section,
                            'id_spk' => $idSpk,
                            'section_name' => $masterSec->section_name,
                            'section_order' => $masterSec->section_order,
                            'deadline' => false,
                            'deadline_date' => null,
                        ]);
                    }
                }

                if ($existingSection) {
                    // Generate mandatory docs + selected additional docs
                    $masterDocs = MasterDocumentTrans::where('id_section', $request->id_section)
                        ->where('is_active', true)
                        ->where(function ($query) use ($request) {
                            $query->where('attribute', true);
                            if (!empty($request->additional_documents) && is_array($request->additional_documents)) {
                                $query->orWhereIn('id_dokumen', $request->additional_documents);
                            }
                        })
                        ->get();

                    $existingDocIds = DocumentTrans::where('id_spk', $idSpk)
                        ->where('id_section', $request->id_section)
                        ->pluck('id_dokumen')
                        ->toArray();

                    foreach ($masterDocs as $mDoc) {
                        if (!in_array($mDoc->id_dokumen, $existingDocIds)) {
                            $logMessage = "Document {$existingSection->section_name} requested " . now()->format('d-m-Y H:i') . " WIB";

                            $newDoc = DocumentTrans::create([
                                'id_spk'          => $idSpk,
                                'id_dokumen'      => $mDoc->id_dokumen,
                                'id_section'      => $mDoc->id_section,
                                'nama_file'       => $mDoc->nama_file,
                                'url_path_file'   => $request->attachments[$mDoc->id_dokumen] ?? null,
                                'is_internal'     => $mDoc->is_internal ?? false,
                                'is_verification' => $mDoc->is_verification ?? true,
                                'verify'          => null,
                                'kuota_revisi'    => $mDoc->kuota_revisi ?: 3,
                                'updated_by'      => $user->id_user,
                                'logs'            => (!empty($request->attachments) && isset($request->attachments[$mDoc->id_dokumen])) ? "Berhasil Mengubah data Document" : $logMessage,
                            ]);

                            DocumentStatus::create([
                                'id_dokumen_trans' => $newDoc->id,
                                'status'           => $logMessage,
                                'by'               => $user->name,
                            ]);

                            if (!empty($request->attachments) && isset($request->attachments[$mDoc->id_dokumen])) {
                                DocumentStatus::create([
                                    'id_dokumen_trans' => $newDoc->id,
                                    'status'           => 'File Uploaded',
                                    'by'               => collect(explode(' ', trim($user->name)))->take(2)->implode(' '),
                                ]);
                            }
                        }
                    }
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            try {
                \App\Events\ShippingDataUpdated::dispatch($idSpk, 'update');
            } catch (\Exception $e) {
                // Ignore Event Error
            }

            return response()->json(['success' => true, 'message' => 'NPD info updated successfully']);
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\DB::rollBack();
            Log::error("Failed to update NPD: " . $th->getMessage());
            return response()->json(['success' => false, 'error' => $th->getMessage()], 500);
        }
    }

    public function sendEmail(Request $request, $id)
    {
        $user = auth('web')->user();

        [$tenant, $idPerusahaan] = $this->resolveTenantAndPerusahaanId($user);

        if (!$tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan'], 404);
        }

        tenancy()->initialize($tenant);

        $data = $request->validate([
            'email_to' => ['required', 'array', 'min:1'],
            'email_to.*' => ['required', 'email'],
            'email_cc' => ['nullable', 'array'],
            'email_cc.*' => ['nullable', 'email'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'document_ids' => ['nullable', 'array'],
            'document_ids.*' => ['integer'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:20480'],
            'attach_spk_overview_pdf' => ['nullable', 'boolean'],
            'attach_spk_karantina_pdf' => ['nullable', 'boolean'],
            'attach_spk_non_karantina_pdf' => ['nullable', 'boolean'],
        ]);

        $spk = Spk::findOrFail($id);

        $attachOverviewPdf = $request->boolean('attach_spk_overview_pdf', false);
        $attachKarantinaPdf = $request->boolean('attach_spk_karantina_pdf', false);
        $attachNonKarantinaPdf = $request->boolean('attach_spk_non_karantina_pdf', false);

        $body = (string) $data['body'];
        $body = preg_replace('/<script\\b[^>]*>(.*?)<\\/script>/is', '', $body);
        $body = preg_replace('/on\\w+\\s*=\\s*(\"[^\"]*\"|\\\'[^\\\']*\\\'|[^\\s>]+)/i', '', $body);
        $body = strip_tags($body, '<p><br><strong><b><em><i><u><s><strike><a><ol><ul><li><blockquote><h1><h2><h3><span><div>');

        $latestDocs = DocumentTrans::with('masterDocument')
            ->where('id_spk', $id)
            ->orderByDesc('id')
            ->get()
            ->groupBy('id_dokumen')
            ->map(function ($items) {
                return $items->first();
            });

        $missingRequired = $latestDocs->filter(function ($doc) {
            return $doc && $doc->masterDocument && $doc->masterDocument->is_send_email && empty($doc->url_path_file);
        });

        if ($missingRequired->count() > 0) {
            return response()->json(['message' => 'Dokumen wajib email belum lengkap di SPK ini'], 422);
        }

        $requiredIds = $latestDocs->filter(function ($doc) {
            return $doc && $doc->masterDocument && $doc->masterDocument->is_send_email;
        })->keys();

        $selectedIds = collect($data['document_ids'] ?? [])->map(function ($v) {
            return (int) $v;
        })->filter()->unique();

        $attachIds = $selectedIds->merge($requiredIds)->unique();

        $hasAnyAttachment = $attachIds->count() > 0
            || !empty($request->file('files'))
            || $attachOverviewPdf
            || $attachKarantinaPdf
            || $attachNonKarantinaPdf;

        if (!$hasAnyAttachment) {
            return response()->json(['message' => 'Attachment wajib ada'], 422);
        }

        $missingSelected = $attachIds->filter(function ($idDokumen) use ($latestDocs) {
            $doc = $latestDocs->get($idDokumen);
            return !$doc || empty($doc->url_path_file);
        });

        if ($missingSelected->count() > 0) {
            return response()->json(['message' => 'Ada dokumen attachment yang tidak ditemukan / belum diupload'], 422);
        }

        $disk = Storage::disk('customers_external');
        $maxBytes = (int) env('MAIL_MAX_SIZE_BYTES', 24 * 1024 * 1024);
        $totalBytes = 0;
        foreach ($attachIds as $idDokumen) {
            $doc = $latestDocs->get($idDokumen);
            if (!$doc || !$doc->url_path_file) continue;
            if (!$disk->exists($doc->url_path_file)) {
                return response()->json(['message' => 'Attachment dokumen tidak ditemukan di server'], 422);
            }
            try {
                $totalBytes += (int) $disk->size($doc->url_path_file);
            } catch (\Throwable $e) {
                // ignore size calculation failures; mailer will validate at send time
            }
        }

        $tempFiles = [];
        $cleanupTempFiles = function () use (&$tempFiles, $disk) {
            foreach ($tempFiles as $temp) {
                $path = $temp['path'] ?? null;
                if ($path) {
                    $disk->delete($path);
                }
            }
        };

        // Add estimated size for PDFs that will be generated in background (approx 2MB each)
        $estimatedPdfSize = ($attachOverviewPdf ? 2 : 0) + ($attachKarantinaPdf ? 2 : 0) + ($attachNonKarantinaPdf ? 2 : 0);
        $totalBytes += ($estimatedPdfSize * 1024 * 1024);

        foreach (($request->file('files') ?? []) as $file) {
            if (!$file) continue;

            $fileSize = 0;
            try {
                $fileSize = (int) $file->getSize();
            } catch (\Throwable $e) {
                $fileSize = 0;
            }

            if (($totalBytes + $fileSize) > $maxBytes) {
                $cleanupTempFiles();
                $mb = round(($totalBytes + $fileSize) / 1024 / 1024, 1);
                $limitMb = round($maxBytes / 1024 / 1024, 0);
                return response()->json(['message' => "Total attachment terlalu besar ({$mb} MB). Maksimum {$limitMb} MB."], 422);
            }

            $storedName = Str::uuid()->toString() . '-' . $file->getClientOriginalName();
            $storedPath = $file->storeAs('email-attachments/spk-' . $id, $storedName, 'customers_external');
            $tempFiles[] = ['path' => $storedPath, 'name' => $file->getClientOriginalName()];
            $totalBytes += $fileSize;
        }

        $to = $data['email_to'];
        $cc = $data['email_cc'] ?? [];
        $senderPerusahaanId = $idPerusahaan ?: ($user?->id_perusahaan ? (int) $user->id_perusahaan : null);
        $perusahaan = $senderPerusahaanId ? Perusahaan::where('id_perusahaan', $senderPerusahaanId)->value('nama_perusahaan') : null;
        $senderName = $perusahaan ?? config('mail.from.name');

        SendShippingComposeEmailJob::dispatch(
            (string) $tenant->id,
            (int) $spk->id,
            $to,
            $cc,
            $data['subject'],
            $body,
            $attachIds->values()->all(),
            $tempFiles,
            $senderName,
            $attachOverviewPdf,
            $attachKarantinaPdf,
            $attachNonKarantinaPdf,
            $senderPerusahaanId,
            $user->name
        );

        return response()->json(['success' => true, 'queued' => true]);
    }
}
