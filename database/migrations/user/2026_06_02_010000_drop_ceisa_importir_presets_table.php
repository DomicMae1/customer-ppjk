<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tako-user';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->connection)->dropIfExists('ceisa_importir_presets');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::connection($this->connection)->hasTable('ceisa_importir_presets')) {
            return;
        }

        Schema::connection($this->connection)->create('ceisa_importir_presets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->unsignedBigInteger('id_customer')->nullable();
            $table->string('kode_jenis_identitas', 10)->nullable();
            $table->string('kode_status', 10)->nullable();
            $table->string('kode_jenis_api', 10)->nullable();
            $table->string('default_kode_cara_bayar', 20)->nullable();
            $table->string('default_kode_jenis_impor', 20)->nullable();
            $table->string('default_kode_tutup_pu', 20)->nullable();
            $table->string('default_signer_name')->nullable();
            $table->string('default_signer_title')->nullable();
            $table->string('default_signer_city')->nullable();
            $table->string('last_nomor_aju', 26)->nullable();
            $table->timestamp('last_submitted_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('id_perusahaan')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->onDelete('cascade');

            $table->foreign('id_customer')
                ->references('id_customer')
                ->on('customers')
                ->nullOnDelete();

            $table->index(['id_perusahaan', 'is_active'], 'ceisa_importir_presets_company_active_index');
        });
    }
};
