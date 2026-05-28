<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaResponseDocument extends Model
{
    use HasFactory;

    protected $connection = 'tenant-transaction';

    protected $table = 'ceisa_response_documents';

    protected $fillable = [
        'ceisa_submission_id',
        'ceisa_status_log_id',
        'response_type',
        'kode_respon',
        'nomor_respon',
        'storage_disk',
        'storage_path',
        'file_name',
        'mime_type',
        'sha256',
        'size_bytes',
        'raw_base64_available',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'raw_base64_available' => 'boolean',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CeisaSubmission::class, 'ceisa_submission_id');
    }

    public function statusLog(): BelongsTo
    {
        return $this->belongsTo(CeisaStatusLog::class, 'ceisa_status_log_id');
    }
}
