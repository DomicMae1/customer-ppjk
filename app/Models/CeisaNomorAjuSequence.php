<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CeisaNomorAjuSequence extends Model
{
    use HasFactory;

    protected $connection = 'tako-user';

    protected $table = 'ceisa_nomor_aju_sequences';

    protected $fillable = [
        'id_perusahaan',
        'environment',
        'kode_kantor',
        'document_type',
        'sequence_date',
        'last_sequence',
    ];

    protected $casts = [
        'id_perusahaan' => 'integer',
        'sequence_date' => 'date',
        'last_sequence' => 'integer',
    ];
}
