<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ceisa_document_mappings') || Schema::hasColumn('ceisa_document_mappings', 'draft_usage')) {
            return;
        }

        Schema::table('ceisa_document_mappings', function (Blueprint $table) {
            $table->string('draft_usage', 30)->default('include')->after('shipment_type');
            $table->index(['draft_usage', 'is_active'], 'ceisa_document_mappings_draft_usage_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ceisa_document_mappings') || ! Schema::hasColumn('ceisa_document_mappings', 'draft_usage')) {
            return;
        }

        Schema::table('ceisa_document_mappings', function (Blueprint $table) {
            $table->dropIndex('ceisa_document_mappings_draft_usage_index');
            $table->dropColumn('draft_usage');
        });
    }
};
