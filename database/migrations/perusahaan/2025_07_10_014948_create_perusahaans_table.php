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
        Schema::connection('tako-perusahaan')->create('perusahaan', function (Blueprint $table) {
            $table->bigIncrements('Id_Perusahaan');
            $table->string('Nama_perusahaan');

            $table->unsignedBigInteger('id_User_1')->nullable();
            $table->unsignedBigInteger('id_User_2')->nullable();
            $table->unsignedBigInteger('id_User_3')->nullable();

            $table->unsignedBigInteger('id_User'); // FK utama

            $table->string('Notify_1')->nullable();
            $table->string('Notify_2')->nullable();

            $table->timestamps();

            // FK ke tabel users
            $table->foreign('id_User')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('perusahaan');
    }
};
