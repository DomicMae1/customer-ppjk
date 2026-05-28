<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaReferenceCache extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    protected $table = 'ceisa_reference_cache';

    protected $fillable = [
        'id_perusahaan',
        'environment',
        'reference_type',
        'lookup_key',
        'request_params',
        'response_payload',
        'fetched_at',
        'expires_at',
    ];

    protected $casts = [
        'request_params' => 'array',
        'response_payload' => 'array',
        'fetched_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
    }
}
