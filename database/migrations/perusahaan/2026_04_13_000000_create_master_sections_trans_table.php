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
        Schema::create('master_sections_trans', function (Blueprint $table) {
            $table->id('id_section');
            $table->unsignedBigInteger('source_master_section_id')->nullable();
            
            $table->string('section_name');
            $table->integer('section_order');
            $table->boolean('is_penjaluran')->default(false);
            $table->boolean('attribute_section')->default(true);
            $table->boolean('is_checklist')->default(false);
            
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_sections_trans');
    }
};
