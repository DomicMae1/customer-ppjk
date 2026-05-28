<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CeisaStatusLog extends Model
{
    use HasFactory;

    protected $connection = 'tenant-transaction';

    protected $table = 'ceisa_status_logs';

    protected $fillable = [
        'ceisa_submission_id',
        'nomor_aju',
        'source',
        'kode_status',
        'kode_respon',
        'nomor_daftar',
        'tanggal_daftar',
        'nomor_respon',
        'tanggal_respon',
        'waktu_status',
        'waktu_respon',
        'keterangan',
        'pesan',
        'raw_payload',
    ];

    protected $casts = [
        'tanggal_daftar' => 'date:Y-m-d',
        'tanggal_respon' => 'date:Y-m-d',
        'waktu_status' => 'datetime',
        'waktu_respon' => 'datetime',
        'pesan' => 'array',
        'raw_payload' => 'array',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CeisaSubmission::class, 'ceisa_submission_id');
    }

    public function responseDocuments(): HasMany
    {
        return $this->hasMany(CeisaResponseDocument::class, 'ceisa_status_log_id');
    }
}
