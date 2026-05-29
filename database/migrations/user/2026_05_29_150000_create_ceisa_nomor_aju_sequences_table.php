<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tako-user';

    public function up(): void
    {
        Schema::create('ceisa_nomor_aju_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->string('environment', 20)->default('production');
            $table->string('kode_kantor', 10);
            $table->string('document_type', 20);
            $table->date('sequence_date');
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();

            $table->foreign('id_perusahaan')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->onDelete('cascade');

            $table->unique(
                ['id_perusahaan', 'environment', 'kode_kantor', 'document_type', 'sequence_date'],
                'ceisa_aju_sequences_scope_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ceisa_nomor_aju_sequences');
    }
};
