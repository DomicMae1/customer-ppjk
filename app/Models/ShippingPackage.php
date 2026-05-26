<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingPackage extends Model
{
    use HasFactory;

    protected $connection = 'tenant';
    protected $table = 'shipping_packages';

    protected $fillable = [
        'name',
        'shipment_type',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(ShippingPackageSection::class, 'shipping_package_id')
            ->orderBy('section_order')
            ->orderBy('id');
    }
}
