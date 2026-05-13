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
        Schema::connection('tako-user')->table('customers', function (Blueprint $table) {
            $table->string('uid_perusahaan')->nullable()->after('uid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-user')->table('customers', function (Blueprint $table) {
            $table->dropColumn('uid_perusahaan');
        });
    }
};
