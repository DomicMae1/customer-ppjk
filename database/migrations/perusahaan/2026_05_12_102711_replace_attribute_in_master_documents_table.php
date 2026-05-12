<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->boolean('import_mandatory')->default(false)->after('is_verification');
            $table->boolean('export_mandatory')->default(false)->after('import_mandatory');
        });

        // Copy data from attribute to both columns, then drop attribute
        DB::statement('UPDATE master_documents_trans SET import_mandatory = attribute, export_mandatory = attribute');

        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->dropColumn('attribute');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->boolean('attribute')->default(false)->after('is_verification');
        });

        DB::statement('UPDATE master_documents_trans SET attribute = import_mandatory'); // Rough approximation

        Schema::table('master_documents_trans', function (Blueprint $table) {
            $table->dropColumn(['import_mandatory', 'export_mandatory']);
        });
    }
};
