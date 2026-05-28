<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaTokenCache extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    protected $table = 'ceisa_token_caches';

    protected $fillable = [
        'ceisa_company_config_id',
        'access_token',
        'refresh_token',
        'token_type',
        'expires_at',
        'refresh_expires_at',
        'last_refreshed_at',
        'last_error',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at' => 'datetime',
        'refresh_expires_at' => 'datetime',
        'last_refreshed_at' => 'datetime',
    ];

    public function config(): BelongsTo
    {
        return $this->belongsTo(CeisaCompanyConfig::class, 'ceisa_company_config_id');
    }
}
