<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaDocumentMapping extends Model
{
    use HasFactory;

    public const DRAFT_USAGE_INCLUDE = 'include';

    public const DRAFT_USAGE_IGNORE = 'ignore';

    public const DRAFT_USAGE_POST_SUBMIT = 'post_submit';

    protected $connection = 'tenant';

    protected $table = 'ceisa_document_mappings';

    protected $fillable = [
        'id_dokumen',
        'id_section',
        'parser_type',
        'ceisa_document_code',
        'shipment_type',
        'draft_usage',
        'aliases',
        'is_required_for_submit',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'aliases' => 'array',
        'is_required_for_submit' => 'boolean',
        'is_active' => 'boolean',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(MasterDocumentTrans::class, 'id_dokumen', 'id_dokumen');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(MasterSectionTrans::class, 'id_section', 'id_section');
    }
}
