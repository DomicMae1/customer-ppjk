<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterSection extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    // protected $connection = 'tako-user';
    protected $table = 'master_sections';

    // PENTING: Definisi Primary Key baru
    protected $primaryKey = 'id_section';

    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'id_section',
        'section_name',
        'section_order',
        'is_penjaluran',
        'attribute_section',
    ];

    protected $casts = [
        'section_order' => 'integer',
        'is_penjaluran' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Relasi ke Master Document.
     * Satu section bisa punya banyak dokumen (list dokumen di dalamnya).
     */
    public function masterDocuments(): HasMany
    {
        return $this->hasMany(MasterDocument::class, 'id_section', 'id_section');
    }
}
