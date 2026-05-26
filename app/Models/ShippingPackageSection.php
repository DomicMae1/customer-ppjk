<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingPackageSection extends Model
{
    use HasFactory;

    protected $connection = 'tenant';
    protected $table = 'shipping_package_sections';

    protected $fillable = [
        'shipping_package_id',
        'id_section',
        'section_name_snapshot',
        'section_order',
    ];

    protected $casts = [
        'shipping_package_id' => 'integer',
        'id_section' => 'integer',
        'section_order' => 'integer',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(ShippingPackage::class, 'shipping_package_id');
    }

    public function masterSection(): BelongsTo
    {
        return $this->belongsTo(MasterSectionTrans::class, 'id_section', 'id_section');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ShippingPackageDocument::class, 'shipping_package_section_id')
            ->orderBy('document_order')
            ->orderBy('id');
    }
}
