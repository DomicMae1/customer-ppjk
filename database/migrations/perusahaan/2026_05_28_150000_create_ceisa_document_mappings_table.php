<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ceisa_document_mappings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_dokumen')->nullable();
            $table->unsignedBigInteger('id_section')->nullable();
            $table->string('parser_type', 50);
            $table->string('ceisa_document_code', 20)->nullable();
            $table->string('shipment_type', 20)->nullable();
            $table->json('aliases')->nullable();
            $table->boolean('is_required_for_submit')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('id_dokumen')
                ->references('id_dokumen')
                ->on('master_documents_trans')
                ->nullOnDelete();

            $table->foreign('id_section')
                ->references('id_section')
                ->on('master_sections_trans')
                ->nullOnDelete();

            $table->index(['parser_type', 'is_active'], 'ceisa_document_mappings_parser_active_index');
            $table->index(['shipment_type', 'is_required_for_submit'], 'ceisa_document_mappings_shipment_required_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ceisa_document_mappings');
    }
};
