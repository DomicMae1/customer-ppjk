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
        Schema::connection('tako-perusahaan')->create('customers_statuses', function (Blueprint $table) {
            $table->id('id_Customer'); // Primary key sesuai permintaan

            $table->foreignId('id_user')->constrained('users')->onDelete('cascade'); // FK ke users

            // Status 1
            $table->foreignId('status_1_by')->nullable();
            $table->timestamp('status_1_timestamps')->nullable();
            $table->text('status_1_keterangan')->nullable();
            $table->timestamp('submit_1_timestamps')->nullable();
            $table->string('submit_1_attach')->nullable();

            // Status 2
            $table->foreignId('status_2_by')->nullable();
            $table->timestamp('status_2_timestamps')->nullable();
            $table->text('status_2_keterangan')->nullable();
            $table->timestamp('submit_2_timestamps')->nullable();
            $table->string('submit_2_attach')->nullable();

            // Status 3
            $table->foreignId('status_3_by')->nullable();
            $table->timestamp('status_3_timestamps')->nullable();
            $table->text('status_3_keterangan')->nullable();
            $table->timestamp('submit_3_timestamps')->nullable();
            $table->string('submit_3_attach')->nullable();

            $table->timestamps(); // Kolom timestamp created_at & updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tako-perusahaan')->dropIfExists('customers_statuses');
    }
};
