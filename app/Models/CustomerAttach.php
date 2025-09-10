<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;

class CustomerAttach extends Model
{
    use HasFactory, SoftDeletes;
    protected $connection = 'tako-customer';
    protected $table = 'customer_attaches';

    protected $fillable = [
        'customer_id',
        'nama_file',
        'path',
        'type',
    ];

    /**
     * Relasi ke model Customer.
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
