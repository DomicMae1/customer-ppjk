<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Remove columns from spk table
        Schema::connection('tenant-transaction')->table('spk', function (Blueprint $table) {
            if (Schema::connection('tenant-transaction')->hasColumn('spk', 'party_qty')) {
                $table->dropColumn('party_qty');
            }
            if (Schema::connection('tenant-transaction')->hasColumn('spk', 'party_size')) {
                $table->dropColumn('party_size');
            }
        });

        // 2. Create spk_parties table
        Schema::connection('tenant-transaction')->create('spk_parties', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_spk');
            $table->string('party_type'); // FCL, LCL
            $table->string('party_category')->nullable(); // Dropdown for FCL
            $table->string('party_qty');
            $table->string('party_size'); // 20 ft, 40 ft, etc (FCL) or CBM, KG (LCL)
            $table->timestamps();

            // Sesuai dengan referensi HsCode.php yang menggunakan 'id' di tabel spk
            $table->foreign('id_spk')->references('id')->on('spk')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant-transaction')->dropIfExists('spk_parties');

        Schema::connection('tenant-transaction')->table('spk', function (Blueprint $table) {
            $table->string('party_qty')->nullable()->after('comodity');
            $table->string('party_size')->nullable()->after('party_qty');
        });
    }
};
