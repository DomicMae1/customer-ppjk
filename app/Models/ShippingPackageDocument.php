<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingPackageDocument extends Model
{
    use HasFactory;

    protected $connection = 'tenant';
    protected $table = 'shipping_package_documents';

    protected $fillable = [
        'shipping_package_section_id',
        'id_dokumen',
        'nama_file_snapshot',
        'document_order',
    ];

    protected $casts = [
        'shipping_package_section_id' => 'integer',
        'id_dokumen' => 'integer',
        'document_order' => 'integer',
    ];

    public function packageSection(): BelongsTo
    {
        return $this->belongsTo(ShippingPackageSection::class, 'shipping_package_section_id');
    }

    public function masterDocument(): BelongsTo
    {
        return $this->belongsTo(MasterDocumentTrans::class, 'id_dokumen', 'id_dokumen');
    }
}
