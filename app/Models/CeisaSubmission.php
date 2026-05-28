<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CeisaSubmission extends Model
{
    use HasFactory;

    protected $connection = 'tenant-transaction';

    protected $table = 'ceisa_submissions';

    protected $fillable = [
        'id_spk',
        'id_perusahaan',
        'ceisa_company_config_id',
        'shipment_type',
        'document_type',
        'mode',
        'is_final',
        'is_revision',
        'nomor_aju',
        'id_header',
        'request_payload',
        'response_payload',
        'status',
        'error_code',
        'error_message',
        'submitted_by',
        'submitted_at',
        'last_synced_at',
    ];

    protected $casts = [
        'is_final' => 'boolean',
        'is_revision' => 'boolean',
        'request_payload' => 'array',
        'response_payload' => 'array',
        'submitted_by' => 'integer',
        'submitted_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    public function config(): BelongsTo
    {
        return $this->belongsTo(CeisaCompanyConfig::class, 'ceisa_company_config_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(CeisaStatusLog::class, 'ceisa_submission_id');
    }

    public function responseDocuments(): HasMany
    {
        return $this->hasMany(CeisaResponseDocument::class, 'ceisa_submission_id');
    }
}
