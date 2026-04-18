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
        Schema::table('spk', function (Blueprint $table) {
            $table->string('shipper')->nullable();
            $table->string('consignee')->nullable();
            $table->string('vessel')->nullable();
            $table->string('party_qty')->nullable();
            $table->string('party_size')->nullable();
            $table->string('aju')->nullable();
            $table->string('j_o')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spk', function (Blueprint $table) {
            $table->dropColumn([
                'shipper',
                'consignee',
                'vessel',
                'party_qty',
                'party_size',
                'aju',
                'j_o',
            ]);
        });
    }
};
