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
        Schema::connection('tako-user')->table('tenants', function (Blueprint $table) {
            $table->dropForeign(['perusahaan_id']); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->table('tenants', function (Blueprint $table) {
            // $table->foreign('perusahaan_id')->references('id_perusahaan')->on('perusahaan');
        });
    }
};
