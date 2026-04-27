<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpkParty extends Model
{
    use HasFactory;

    protected $connection = 'tenant-transaction';
    protected $table = 'spk_parties';

    protected $fillable = [
        'id_spk',
        'party_type',
        'party_category',
        'party_qty',
        'party_size',
    ];

    /**
     * Relasi ke SPK.
     */
    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }
}
