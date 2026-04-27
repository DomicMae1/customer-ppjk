<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterDocumentTrans extends Model
{
    use HasFactory;

    // 2. Nama Tabel
    protected $connection = 'tenant';
    protected $table = 'master_documents_trans';

    // 3. Primary Key
    protected $primaryKey = 'id_dokumen';

    // 4. Fillable (Mass Assignment)
    protected $fillable = [
        'id_section',
        'nama_file',
        'is_internal',
        'is_verification',
        'attribute',
        'link_path_example_file',
        'link_path_template_file',
        'link_url_video_file',
        'is_confirmed',
        'description_file',
        'updated_by',
        'kuota_revisi',
        'is_ori',
        'is_print',
        'is_send_email',
        // created_at dan updated_at otomatis dihandle
    ];

    // 5. Casting Tipe Data
    protected $casts = [
        'is_internal' => 'boolean', // Added
        'is_verification' => 'boolean', // New
        'is_confirmed' => 'boolean',
        'attribute' => 'boolean',
        'is_ori' => 'boolean',
        'is_print' => 'boolean',
        'deadline_document' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'is_send_email' => 'boolean',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(MasterSectionTrans::class, 'id_section', 'id_section');
    }
    
    /**
     * Relasi ke User (Updated By) - Opsional jika menggunakan tabel users internal
     */
    public function updater()
    {
        // Sesuaikan nama model User dan Foreign Key di tabel users
        return $this->belongsTo(User::class, 'updated_by', 'id'); 
    }

    public function documentTrans()
    {
        return $this->hasMany(DocumentTrans::class, 'id_dokumen', 'id_dokumen');
    }
}
