<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
// use Illuminate\Database\Eloquent\SoftDeletes; // Dihapus karena di list tabel tidak ada kolom 'deleted_at'
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    // use SoftDeletes; // Aktifkan ini HANYA jika Anda menambahkan kolom 'deleted_at' di database

    protected $connection = 'tako-user';

    protected $table = 'customers';

    protected $primaryKey = 'id_customer';

    public $timestamps = true;

    protected $fillable = [
        'uid',              // Baru
        'nama_perusahaan',
        'type',
        'ownership',        // FK
        'created_by',
        'no_npwp',          // Baru
        'no_npwp_16',       // Baru
        'nib',
        'alamat_lengkap',
        'email_to',
        'email_cc',
        'nama',
        'uid_perusahaan',
        'uid_marketing',
    ];

    protected $casts = [
        'email_to' => 'array',
        'email_cc' => 'array',
    ];

    /**
     * Relasi ke perusahaan (dari database tako-perusahaan).
     * Foreign Key: ownership
     * Owner Key: id_perusahaan
     */
    public function perusahaan()
    {
        return $this->belongsTo(Perusahaan::class, 'ownership', 'id_perusahaan');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id_user');
    }

    /**
     * Relasi ke users (Asumsi: Tabel users memiliki kolom id_customer)
     */
    public function users()
    {
        return $this->hasMany(User::class, 'id_customer', 'id_customer');
    }

    public function ceisaImportirPreset(): HasOne
    {
        return $this->hasOne(CeisaImportirPreset::class, 'id_customer', 'id_customer')
            ->where('is_active', true)
            ->latestOfMany();
    }
}
