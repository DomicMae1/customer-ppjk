<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaImportirPreset extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    protected $table = 'ceisa_importir_presets';

    protected $fillable = [
        'id_perusahaan',
        'id_customer',
        'kode_jenis_identitas',
        'kode_status',
        'kode_jenis_api',
        'default_kode_cara_bayar',
        'default_kode_jenis_impor',
        'default_kode_tutup_pu',
        'default_signer_name',
        'default_signer_title',
        'default_signer_city',
        'last_nomor_aju',
        'last_submitted_at',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'last_submitted_at' => 'datetime',
        'is_active' => 'boolean',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'id_customer', 'id_customer');
    }
}
