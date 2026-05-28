<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CeisaDocumentExtractionAudit extends Model
{
    use HasFactory;

    protected $connection = 'tenant-transaction';

    protected $table = 'ceisa_document_extraction_audits';

    protected $fillable = [
        'id_spk',
        'id_dokumen_trans',
        'filenames',
        'parser_type',
        'parser_version',
        'extracted_fields',
        'raw_text_storage_path',
        'result_payload',
        'error_message',
        'extracted_by',
    ];

    protected $casts = [
        'filenames' => 'array',
        'extracted_fields' => 'array',
        'result_payload' => 'array',
        'extracted_by' => 'integer',
    ];

    public function spk(): BelongsTo
    {
        return $this->belongsTo(Spk::class, 'id_spk', 'id');
    }

    public function documentTrans(): BelongsTo
    {
        return $this->belongsTo(DocumentTrans::class, 'id_dokumen_trans', 'id');
    }
}
