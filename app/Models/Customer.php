<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Perusahaan;
use App\Models\CustomerAttach;

class Customer extends Model
{
    use SoftDeletes;

    protected $connection = 'tako-customer';
    protected $table = 'customers';
    protected $primaryKey = 'id'; 

    protected $fillable = [
        'uid',
        'id_user',
        'id_perusahaan',
        'kategori_usaha',
        'nama_perusahaan',
        'bentuk_badan_usaha',
        'alamat_lengkap',
        'kota',
        'no_telp',
        'no_fax',
        'alamat_penagihan',
        'email',
        'website',
        'top',
        'status_perpajakan',
        'no_npwp',
        'no_npwp_16',
        'nama_pj',
        'no_ktp_pj',
        'no_telp_pj',
        'nama_personal',
        'jabatan_personal',
        'no_telp_personal',
        'email_personal',
    ];

    protected static function booted()
    {
        static::created(function ($customer) {
            // Kita ambil tahun dan bulan saat ini
            $prefix = now()->format('Y-m'); // Hasil: 2025-11
            
            // Update kolom uid
            $customer->uid = $prefix . '-' . $customer->id;
            
            // Simpan perubahan tanpa memicu event 'updated' (agar hemat resource)
            $customer->saveQuietly();
        });
    }

    /**
     * Relasi ke user pembuat (dari database tako-perusahaan).
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    /**
     * Relasi ke perusahaan (dari database tako-perusahaan).
     */
    public function perusahaan()
    {
        return $this->belongsTo(Perusahaan::class, 'id_perusahaan');
    }

    /**
     * Relasi ke lampiran dokumen customer.
     */
    public function attachments()
    {
        return $this->hasMany(CustomerAttach::class, 'customer_id', 'id');
    }

    public function status()
    {
        return $this->hasOne(Customers_Status::class, 'id_Customer');
    }

    public function customer_links()
    {
        return $this->hasOne(CustomerLink::class, 'id_customer');
    }
}
