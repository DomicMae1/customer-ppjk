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
        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->boolean('is_send_email')->default(false)->after('is_npd');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->dropColumn('is_send_email');
        });
    }
};
