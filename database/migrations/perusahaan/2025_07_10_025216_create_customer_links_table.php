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
        Schema::connection('tako-perusahaan')->create('customer_links', function (Blueprint $table) {
            $table->id('id_link');
            $table->unsignedBigInteger('id_user');
            $table->string('link_customer');
            $table->string('nama_customer');
            $table->timestamps();

            // Foreign key ke tabel users
            $table->foreign('id_user')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('customer_links');
    }
};
