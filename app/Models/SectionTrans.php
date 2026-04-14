<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SectionTrans extends Model
{
    use HasFactory;

    // protected $connection = 'tako-user';
    protected $connection = 'tenant-transaction';
    protected $table = 'section_trans';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'id_section',
        'id_spk',
        'section_name',
        'section_order',
        'deadline',
        'deadline_date', // NEW: Tanggal deadline per section
    ];

    protected $casts = [
        'id_section' => 'integer',
        'id_spk' => 'integer',
        'section_order' => 'integer',
        'deadline' => 'boolean',
        'deadline_date' => 'date:Y-m-d',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function masterSection(): BelongsTo
    {
        return $this->belongsTo(MasterSectionTrans::class, 'id_section', 'id_section');
    }

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    /**
     * Relasi ke Master Document.
     * Satu section bisa punya banyak dokumen (list dokumen di dalamnya).
     */
    public function documents(): HasMany
    {
        // Model MasterDocument akan kita buat setelah ini
        return $this->hasMany(DocumentTrans::class, 'id_section', 'id_section');
    }
}
