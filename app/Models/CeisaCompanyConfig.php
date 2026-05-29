<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CeisaCompanyConfig extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'tako-user';

    protected $table = 'ceisa_company_configs';

    protected $fillable = [
        'id_perusahaan',
        'environment',
        'base_url',
        'origin_url',
        'id_platform',
        'api_key',
        'app_id',
        'username',
        'password',
        'company_code',
        'id_pengguna',
        'npwp',
        'npwp_16',
        'nib',
        'ppjk_name',
        'ppjk_address',
        'ppjk_npwp',
        'ppjk_npwp_16',
        'ppjk_nib',
        'default_kode_kantor',
        'default_kode_tps',
        'default_signer_name',
        'default_signer_title',
        'default_signer_city',
        'is_active',
        'last_verified_at',
        'last_error',
        'created_by',
        'updated_by',
    ];

    protected $hidden = [
        'api_key',
        'app_id',
        'username',
        'password',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'app_id' => 'encrypted',
        'username' => 'encrypted',
        'password' => 'encrypted',
        'is_active' => 'boolean',
        'last_verified_at' => 'datetime',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function tokenCache(): HasOne
    {
        return $this->hasOne(CeisaTokenCache::class, 'ceisa_company_config_id');
    }

    public function importirPresets(): HasMany
    {
        return $this->hasMany(CeisaImportirPreset::class, 'id_perusahaan', 'id_perusahaan');
    }

    public function referenceCache(): HasMany
    {
        return $this->hasMany(CeisaReferenceCache::class, 'id_perusahaan', 'id_perusahaan');
    }
}
