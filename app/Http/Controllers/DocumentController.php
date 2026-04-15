<?php

namespace App\Http\Controllers;

use App\Models\MasterDocument;
use App\Models\MasterSection; // Asumsi ada model ini
use App\Models\MasterDocumentTrans;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentController extends Controller
{
    /**
     * Menampilkan daftar dokumen.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasPermissionTo('view-document')) {
            return redirect('/shipping')->with('error', 'Anda tidak memiliki akses ke halaman tersebut.');
        }

        $documents = [];
        $attributeFilter = $request->get('attribute');
        $sectionFilter = $request->get('section');

        // --- 1. LOGIC MANAGER/SUPERVISOR (TENANT) ---
        if ($user->hasRole(['manager', 'supervisor'])) {
            $tenant = null;
            if ($user->id_perusahaan) {
                $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            }

            if ($tenant) {
                tenancy()->initialize($tenant);

                $query = MasterDocumentTrans::with('section')
                    ->orderBy('id_section', 'asc')
                    ->orderBy('id_dokumen', 'asc');

                if ($attributeFilter === 'mandatory') {
                    $query->where('attribute', true);
                } elseif ($attributeFilter === 'non_mandatory') {
                    $query->where('attribute', false);
                }

                if (!empty($sectionFilter) && $sectionFilter !== 'all') {
                    $query->where('id_section', $sectionFilter);
                }

                $documents = $query
                    ->get()
                    ->map(function ($item) {
                        return [
                            'id_dokumen' => $item->id_dokumen,
                            'id_section' => $item->id_section,
                            'nama_file' => $item->nama_file,
                            'description_file' => $item->description_file,
                            'is_internal' => $item->is_internal,
                            'is_confirmed' => $item->is_confirmed,
                            'attribute' => $item->attribute,
                            'kuota_revisi' => $item->kuota_revisi,
                            'link_path_example_file' => $item->link_path_example_file ? Storage::url($item->link_path_example_file) : null,
                            'link_path_template_file' => $item->link_path_template_file ? Storage::url($item->link_path_template_file) : null,
                            'link_url_video_file' => $item->link_url_video_file,
                            'section' => $item->section,
                            'source' => 'trans',
                        ];
                    });
            }

        // --- 2. LOGIC ADMIN (GLOBAL) ---
        } elseif ($user->hasRole('admin')) {
            $query = MasterDocument::with('section')
                ->orderBy('id_section', 'asc')
                ->orderBy('id_dokumen', 'asc');

            if ($attributeFilter === 'mandatory') {
                $query->where('attribute', true);
            } elseif ($attributeFilter === 'non_mandatory') {
                $query->where('attribute', false);
            }

            if (!empty($sectionFilter) && $sectionFilter !== 'all') {
                $query->where('id_section', $sectionFilter);
            }

            $documents = $query
                ->get()
                ->map(function ($item) {
                    return [
                        'id_dokumen' => $item->id_dokumen,
                        'id_section' => $item->id_section,
                        'nama_file' => $item->nama_file,
                        'description_file' => $item->description_file,
                        'is_internal' => $item->is_internal,
                        'is_confirmed' => $item->is_confirmed,
                        'attribute' => $item->attribute,
                        'kuota_revisi' => $item->kuota_revisi,
                        'link_path_example_file' => $item->link_path_example_file,
                        'link_path_template_file' => $item->link_path_template_file,
                        'link_url_video_file' => $item->link_url_video_file,
                        'section' => $item->section,
                        'source' => 'master',
                    ];
                });
        }

        $sections = [];
        if ($user->hasRole(['manager', 'supervisor'])) {
            $sections = \App\Models\MasterSectionTrans::orderBy('section_order', 'asc')->get();
        } else {
            $sections = MasterSection::on('tako-user')->orderBy('section_order', 'asc')->get();
        }

        return Inertia::render('m_document/page', [
            'documents' => $documents,
            'sections' => $sections,
            'filters' => $request->only(['search', 'attribute', 'section']),
        ]);
    }

    /**
     * Menyimpan dokumen baru.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|numeric', 
            'nama_file' => 'required|string|max:255',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url',
            'kuota_revisi' => 'nullable|integer|min:0',
            
            // PERUBAHAN: Validasi String Path (Bukan File Upload lagi)
            // Karena file sudah diupload via dropzone ke folder temp
            'link_path_example_file' => 'nullable|string', 
            'link_path_template_file' => 'nullable|string',
            
            'is_internal' => 'boolean',
            'is_confirmed' => 'boolean',
            'attribute' => 'boolean',
        ]);

        // Default value boolean
        $validated['is_internal'] = $request->boolean('is_internal', false);
        $validated['is_confirmed'] = $request->boolean('is_confirmed', false);
        $validated['attribute'] = $request->boolean('attribute', false);

        $validated['kuota_revisi'] = $request->filled('kuota_revisi')
        ? (int) $request->kuota_revisi
        : 0;

        // --- Logic Helper: Pindahkan File dari Temp ke Permanen ---
        $moveFileFromTemp = function ($tempPath, $targetFolder) {
            // Jika tidak ada path, kembalikan null
            if (!$tempPath) return null;

            // Pastikan menggunakan disk yang sama ('public' sesuai upload temp anda)
            $disk = Storage::disk('customers_external'); 

            // Cek apakah file ada di temp (hindari error jika path salah/kosong)
            if ($disk->exists($tempPath)) {
                $filename = basename($tempPath);
                $newPath = $targetFolder . '/' . $filename;

                // Pastikan folder tujuan ada
                if (!$disk->exists($targetFolder)) {
                    $disk->makeDirectory($targetFolder);
                }

                // Pindahkan file
                $disk->move($tempPath, $newPath);
                
                return $newPath; // Return path baru untuk disimpan di DB
            }

            return null; // File tidak ditemukan di temp (mungkin sudah dipindah atau invalid)
        };

        // --- Eksekusi Pemindahan File ---
        
        // Pindahkan Contoh File
        if (!empty($validated['link_path_example_file'])) {
            $validated['link_path_example_file'] = $moveFileFromTemp(
                $validated['link_path_example_file'], 
                'documents/examples'
            );
        }

        // Pindahkan Template File
        if (!empty($validated['link_path_template_file'])) {
            $validated['link_path_template_file'] = $moveFileFromTemp(
                $validated['link_path_template_file'], 
                'documents/templates'
            );
        }

        $validated['updated_by'] = $user->id;

        // --- Logic Store Berdasarkan Role ---

        if ($user->hasRole('admin')) {
            // ADMIN -> Master Document (Global)
            $request->validate(['id_section' => 'exists:tako-user.master_sections,id_section']);
            MasterDocument::create($validated);

        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            // MANAGER -> Master Document Trans (Tenant)
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant tidak ditemukan.']);
            }
            tenancy()->initialize($tenant);

            MasterDocumentTrans::create($validated);

        } else {
            abort(403, 'Unauthorized action.');
        }

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan.');
    }

    /**
     * Memperbarui dokumen.
     * Note: Parameter $id merujuk ke 'id_dokumen'
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'id_section' => 'required|numeric',
            'nama_file' => 'required|string|max:255',
            'description_file' => 'nullable|string',
            'is_internal' => 'boolean',
            'is_confirmed' => 'boolean',
            'attribute' => 'boolean',
            'link_url_video_file' => 'nullable|url',

            // path file sementara
            'link_path_example_file' => 'nullable|string',
            'link_path_template_file' => 'nullable|string',
        ]);

        $validated['is_internal'] = $request->boolean('is_internal', false);
        $validated['is_confirmed'] = $request->boolean('is_confirmed', false);
        $validated['attribute'] = $request->boolean('attribute', false);

        $document = null;

        // --- 1. GET DOCUMENT & CHECK PERMISSION ---
        if ($user->hasRole('admin')) {
            $document = MasterDocument::findOrFail($id);
            $request->validate([
                'id_section' => 'exists:tako-user.master_sections,id_section'
            ]);
        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            if ($tenant) {
                tenancy()->initialize($tenant);
            }
            $document = MasterDocumentTrans::findOrFail($id);
        } else {
            abort(403, 'Unauthorized action.');
        }

        // --- 2. HELPER MOVE FILE ---
        $moveFileFromTemp = function ($tempPath, $targetFolder) {
            if (!$tempPath) {
                return null;
            }

            $disk = Storage::disk('customers_external');

            if ($disk->exists($tempPath)) {
                $filename = basename($tempPath);
                $newPath = $targetFolder . '/' . $filename;

                if (!$disk->exists($targetFolder)) {
                    $disk->makeDirectory($targetFolder);
                }

                $disk->move($tempPath, $newPath);

                return $newPath;
            }

            return null;
        };

        // --- 3. SIAPKAN DATA YANG BENAR-BENAR BERUBAH SAJA ---
        $updateData = [
            'id_section' => $validated['id_section'],
            'nama_file' => $validated['nama_file'],
            'description_file' => $validated['description_file'] ?? null,
            'is_internal' => $validated['is_internal'],
            'is_confirmed' => $validated['is_confirmed'],
            'attribute' => $validated['attribute'],
            'link_url_video_file' => $validated['link_url_video_file'] ?? null,
        ];

        $hasRealChange = false;

        foreach ($updateData as $field => $value) {
            if ((string) $document->{$field} !== (string) $value) {
                $hasRealChange = true;
                break;
            }
        }

        // --- 4. HANDLE FILE EXAMPLE ---
        if (!empty($validated['link_path_example_file'])) {
            $newExamplePath = $moveFileFromTemp($validated['link_path_example_file'], 'documents/examples');

            if ($newExamplePath && $newExamplePath !== $document->link_path_example_file) {
                $updateData['link_path_example_file'] = $newExamplePath;
                $hasRealChange = true;
            }
        }

        // --- 5. HANDLE FILE TEMPLATE ---
        if (!empty($validated['link_path_template_file'])) {
            $newTemplatePath = $moveFileFromTemp($validated['link_path_template_file'], 'documents/templates');

            if ($newTemplatePath && $newTemplatePath !== $document->link_path_template_file) {
                $updateData['link_path_template_file'] = $newTemplatePath;
                $hasRealChange = true;
            }
        }

        // --- 6. JIKA TIDAK ADA PERUBAHAN, JANGAN UPDATE DATABASE ---
        if (!$hasRealChange) {
            return redirect()->back()->with('success', 'Tidak ada perubahan data.');
        }

        // updated_by hanya diisi kalau memang ada perubahan
        $updateData['updated_by'] = $user->id;

        // --- 7. HAPUS FILE LAMA HANYA JIKA ADA FILE BARU ---
        if (array_key_exists('link_path_example_file', $updateData)) {
            if (
                $document->link_path_example_file &&
                $document->link_path_example_file !== $updateData['link_path_example_file'] &&
                Storage::disk('customers_external')->exists($document->link_path_example_file)
            ) {
                Storage::disk('customers_external')->delete($document->link_path_example_file);
            }
        }

        if (array_key_exists('link_path_template_file', $updateData)) {
            if (
                $document->link_path_template_file &&
                $document->link_path_template_file !== $updateData['link_path_template_file'] &&
                Storage::disk('customers_external')->exists($document->link_path_template_file)
            ) {
                Storage::disk('customers_external')->delete($document->link_path_template_file);
            }
        }

        // --- 8. SAVE ---
        $document->update($updateData);

        return redirect()->back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    /**
     * Menghapus dokumen.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $document = null;

        // --- 1. Tentukan Model & Context Berdasarkan Role ---

        if ($user->hasRole('admin')) {
            // ADMIN: Hapus dari Master Document (Global/Central)
            // Tidak perlu inisialisasi tenancy karena ada di DB Central
            $document = MasterDocument::findOrFail($id);

        } elseif ($user->hasRole(['manager', 'supervisor'])) {
            // MANAGER: Hapus dari Master Document Trans (Tenant)
            
            // A. Cari Tenant berdasarkan user
            $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            
            if (!$tenant) {
                return redirect()->back()->withErrors(['error' => 'Tenant perusahaan tidak ditemukan.']);
            }

            // B. PENTING: Inisialisasi Tenancy
            // Ini akan mengubah koneksi DB ke DB Tenant dan root path Storage (jika dikonfigurasi)
            tenancy()->initialize($tenant);

            // C. Cari Dokumen di dalam scope Tenant
            $document = MasterDocumentTrans::findOrFail($id);
            
            // (Opsional) Validasi tambahan keamanan jika diperlukan
            // if ($document->created_by !== $user->id) { ... }

        } else {
            abort(403, 'Unauthorized action.');
        }

        // --- 2. Hapus File Fisik (Cleanup) ---
        // Gunakan disk 'public' sama seperti saat store
        $disk = Storage::disk('customers_external');

        // Hapus Example File
        if ($document->link_path_example_file && $disk->exists($document->link_path_example_file)) {
            $disk->delete($document->link_path_example_file);
        }

        // Hapus Template File
        if ($document->link_path_template_file && $disk->exists($document->link_path_template_file)) {
            $disk->delete($document->link_path_template_file);
        }

        // --- 3. Hapus Record Database ---
        $document->delete();

        // Jika menggunakan tenancy, end tenancy (opsional, tergantung middleware Anda)
        // if (function_exists('tenancy') && tenancy()->initialized) {
        //     tenancy()->end(); 
        // }

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus.');
    }

    public function upload(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB (sesuaikan)
            'type' => 'required|string',         // 'template' atau 'example'
            'doc_name' => 'required|string',     // Nama dokumen (misal: "SOP Packaging")
        ]);

        $file = $request->file('file');
        
        // 2. Ambil Input Data
        // Bersihkan nama dokumen agar aman untuk nama file (ganti spasi dengan underscore, hapus karakter aneh)
        $rawDocName = $request->input('doc_name');
        $cleanDocName = preg_replace('/[^A-Za-z0-9_\-]/', '_', strtolower($rawDocName));
        
        // Tentukan suffix berdasarkan tipe (template/example)
        $type = strtolower($request->input('type')); // Hasil: 'template' atau 'example'
        
        $ext = $file->getClientOriginalExtension();
        $uniqueId = uniqid(); // Tetap pakai unique ID agar tidak bentrok jika upload file yg sama berkali-kali
        
        // Format Nama File: sop_packaging_template_65a12b.pdf
        $filename = "{$cleanDocName}_{$type}_{$uniqueId}.{$ext}";

        // 3. Konfigurasi Penyimpanan (Temp)
        // Gunakan disk 'public' agar mudah dipindahkan nanti, atau disk khusus temp Anda
        $disk = Storage::disk('customers_external'); 
        $tempDir = 'documents/temp'; // Folder sementara

        // Buat folder temp jika belum ada
        if (!$disk->exists($tempDir)) {
            $disk->makeDirectory($tempDir);
        }

        // 4. Simpan File
        $tempPath = "{$tempDir}/{$filename}";
        
        // Simpan file
        $disk->put($tempPath, file_get_contents($file->getRealPath()));

        // 5. Return Response JSON
        return response()->json([
            'status'    => 'success',
            'path'      => $tempPath,  // Path ini yang akan dikirim kembali oleh Frontend saat tombol "Simpan" ditekan
            'nama_file' => $filename,
            'is_temp'   => true,
        ]);
    }
}