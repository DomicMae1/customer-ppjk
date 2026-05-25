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
        Schema::create('shipping_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('shipment_type', 20);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['shipment_type', 'is_active'], 'shipping_packages_type_active_index');
        });

        Schema::create('shipping_package_sections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipping_package_id');
            $table->unsignedBigInteger('id_section');
            $table->string('section_name_snapshot');
            $table->integer('section_order')->default(0);
            $table->timestamps();

            $table->foreign('shipping_package_id')
                ->references('id')
                ->on('shipping_packages')
                ->onDelete('cascade');

            $table->unique(['shipping_package_id', 'id_section'], 'shipping_package_section_unique');
            $table->index('id_section', 'shipping_package_sections_id_section_index');
        });

        Schema::create('shipping_package_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipping_package_section_id');
            $table->unsignedBigInteger('id_dokumen');
            $table->string('nama_file_snapshot');
            $table->integer('document_order')->default(0);
            $table->timestamps();

            $table->foreign('shipping_package_section_id')
                ->references('id')
                ->on('shipping_package_sections')
                ->onDelete('cascade');

            $table->unique(['shipping_package_section_id', 'id_dokumen'], 'shipping_package_document_unique');
            $table->index('id_dokumen', 'shipping_package_documents_id_dokumen_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipping_package_documents');
        Schema::dropIfExists('shipping_package_sections');
        Schema::dropIfExists('shipping_packages');
    }
};
