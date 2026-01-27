<?php

namespace App\Http\Controllers;

use App\Models\MasterDocument;
use App\Models\MasterSection; // Asumsi ada model ini
use App\Models\MasterDocumentTrans;
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
        $documents = [];

        // --- LOGIC PEMISAHAN DATA BERDASARKAN ROLE ---
        
        if ($user->hasRole(['manager', 'supervisor'])) {
            // 1. INISIALISASI TENANT TERLEBIH DAHULU
            // Kita harus "masuk" ke database perusahaan user agar bisa baca tabel 'master_documents_trans'
            
            $tenant = null;
            if ($user->id_perusahaan) {
                // Pastikan Anda mengimport model Tenant di atas: use App\Models\Tenant;
                $tenant = \App\Models\Tenant::where('perusahaan_id', $user->id_perusahaan)->first();
            }

            if ($tenant) {
                // Aktifkan koneksi ke Database Tenant
                tenancy()->initialize($tenant);

                // 2. Query Data dari Database Tenant yang aktif
                $documents = MasterDocumentTrans::with('section')
                    // HAPUS filter 'id_perusahaan' karena database sudah terisolasi per tenant
                    // ->where('id_perusahaan', $user->id_perusahaan) 
                    ->get()
                    ->map(function($item) {
                        return [
                            'id_dokumen' => $item->id_dokumen, // Pastikan sesuai PK model (id_dokumen)
                            'id_section' => $item->id_section,
                            'nama_file' => $item->nama_file,
                            'description_file' => $item->description_file, // Pastikan nama kolom sesuai DB
                            'section' => $item->section,
                            'source' => 'trans'
                        ];
                    });
                    
                // Optional: Jika ingin kembali ke central context (biasanya otomatis handle, tapi untuk aman)
                // tenancy()->end(); 
            }

        } elseif ($user->hasRole('admin')) {
            // 2. Jika Admin: Ambil dari table master_document (Default - Koneksi 'tako-user')
            // Karena model MasterDocument punya property $connection = 'tako-user', dia aman walau tenancy aktif/tidak
            $documents = MasterDocument::with('section')
                ->get()
                ->map(function($item) {
                    return [
                        'id_dokumen' => $item->id_dokumen,
                        'id_section' => $item->id_section,
                        'nama_file' => $item->nama_file,
                        'description_file' => $item->description_file,
                        'section' => $item->section,
                        'source' => 'master'
                    ];
                });
        }

        // Ambil data section untuk dropdown
        // Asumsi MasterSection ada di database 'tako-user' (Global)
        $sections = MasterSection::orderBy('section_order', 'asc')->get();

        return Inertia::render('m_document/page', [
            'documents' => $documents,
            'sections' => $sections,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Menyimpan dokumen baru.
     */
    public function store(Request $request)
    {
        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|exists:tako-user.master_sections,id_section', // Pastikan koneksi & nama tabel benar
            'nama_file' => 'required|string|max:255',
            'attribute' => 'boolean',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url', // Validasi format URL untuk video
            
            // Validasi File Upload (Opsional)
            'file_example' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:5120', // Max 5MB
            'file_template' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:5120',
        ]);

        // 2. Handle Upload File Example
        if ($request->hasFile('file_example')) {
            // Simpan ke storage/app/public/documents/examples
            $pathExample = $request->file('file_example')->store('documents/examples', 'public');
            $validated['link_path_example_file'] = $pathExample;
        }

        // 3. Handle Upload File Template
        if ($request->hasFile('file_template')) {
            $pathTemplate = $request->file('file_template')->store('documents/templates', 'public');
            $validated['link_path_template_file'] = $pathTemplate;
        }

        // 4. Tambahkan Updated By
        $validated['updated_by'] = Auth::id();

        // 5. Simpan ke Database
        MasterDocument::create($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil ditambahkan.');
    }

    /**
     * Memperbarui dokumen.
     * Note: Parameter $id merujuk ke 'id_dokumen'
     */
    public function update(Request $request, $id)
    {
        $document = MasterDocument::findOrFail($id);

        // 1. Validasi Input
        $validated = $request->validate([
            'id_section' => 'required|exists:tako-user.master_sections,id_section',
            'nama_file' => 'required|string|max:255',
            'attribute' => 'boolean',
            'description_file' => 'nullable|string',
            'link_url_video_file' => 'nullable|url',
            
            // File bersifat nullable saat update (jika tidak diganti)
            'file_example' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,png|max:5120',
            'file_template' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:5120',
        ]);

        // 2. Handle Update File Example
        if ($request->hasFile('file_example')) {
            // Hapus file lama jika ada
            if ($document->link_path_example_file && Storage::disk('public')->exists($document->link_path_example_file)) {
                Storage::disk('public')->delete($document->link_path_example_file);
            }
            // Upload baru
            $validated['link_path_example_file'] = $request->file('file_example')->store('documents/examples', 'public');
        }

        // 3. Handle Update File Template
        if ($request->hasFile('file_template')) {
            // Hapus file lama jika ada
            if ($document->link_path_template_file && Storage::disk('public')->exists($document->link_path_template_file)) {
                Storage::disk('public')->delete($document->link_path_template_file);
            }
            // Upload baru
            $validated['link_path_template_file'] = $request->file('file_template')->store('documents/templates', 'public');
        }

        // 4. Update User
        $validated['updated_by'] = Auth::id();

        // 5. Update Database
        $document->update($validated);

        return redirect()->back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    /**
     * Menghapus dokumen.
     */
    public function destroy($id)
    {
        $document = MasterDocument::findOrFail($id);

        // 1. Hapus File Fisik (Cleanup)
        if ($document->link_path_example_file && Storage::disk('public')->exists($document->link_path_example_file)) {
            Storage::disk('public')->delete($document->link_path_example_file);
        }

        if ($document->link_path_template_file && Storage::disk('public')->exists($document->link_path_template_file)) {
            Storage::disk('public')->delete($document->link_path_template_file);
        }

        // 2. Hapus Record Database
        $document->delete();

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus.');
    }
}