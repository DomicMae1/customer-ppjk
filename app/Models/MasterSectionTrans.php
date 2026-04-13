<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterSectionTrans extends Model
{
    use HasFactory;

    protected $connection = 'tenant';
    protected $table = 'master_sections_trans';

    protected $primaryKey = 'id_section';

    protected $fillable = [
        'source_master_section_id',
        'section_name',
        'section_order',
        'is_penjaluran',
        'attribute_section',
        'is_checklist',
        'is_active',
        'updated_by',
    ];

    protected $casts = [
        'source_master_section_id' => 'integer',
        'section_order' => 'integer',
        'is_penjaluran' => 'boolean',
        'attribute_section' => 'boolean',
        'is_checklist' => 'boolean',
        'is_active' => 'boolean',
        'updated_by' => 'integer',
    ];

    /**
     * Relationship to MasterDocumentTrans.
     * Each section can have many document templates.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(MasterDocumentTrans::class, 'id_section', 'id_section');
    }
}
