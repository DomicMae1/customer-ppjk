<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customers_Status extends Model
{
    protected $connection = 'tako-perusahaan'; // koneksi khusus

    protected $table = 'customers_statuses';   // nama tabel

    protected $primaryKey = 'id_Customer';     // primary key khusus

    public $incrementing = true;               // auto-increment

    protected $keyType = 'int';                // tipe primary key

    protected $fillable = [
        'id_user',
        'status_1_by',
        'status_1_timestamps',
        'status_1_keterangan',
        'submit_1_timestamps',
        'submit_1_attach',
        'status_2_by',
        'status_2_timestamps',
        'status_2_keterangan',
        'submit_2_timestamps',
        'submit_2_attach',
        'status_3_by',
        'status_3_timestamps',
        'status_3_keterangan',
        'submit_3_timestamps',
        'submit_3_attach',
    ];

    protected $dates = [
        'status_1_timestamps',
        'submit_1_timestamps',
        'status_2_timestamps',
        'submit_2_timestamps',
        'status_3_timestamps',
        'submit_3_timestamps',
        'created_at',
        'updated_at',
    ];

    // Relasi ke user (yang menginput/submit)
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    // (Opsional) Relasi ke customer, jika id_Customer juga merupakan FK
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'id_Customer');
    }
}
