<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ceisa_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_spk');
            $table->unsignedBigInteger('id_perusahaan');
            $table->unsignedBigInteger('ceisa_company_config_id');
            $table->string('shipment_type', 20);
            $table->string('document_type', 20);
            $table->string('mode', 20)->default('draft');
            $table->boolean('is_final')->default(false);
            $table->boolean('is_revision')->default(false);
            $table->string('nomor_aju', 26);
            $table->string('id_header')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->string('status', 50)->default('pending');
            $table->string('error_code', 50)->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->foreign('id_spk')
                ->references('id')
                ->on('spk')
                ->onDelete('cascade');

            $table->unique('nomor_aju', 'ceisa_submissions_nomor_aju_unique');
            $table->index(['id_spk', 'status'], 'ceisa_submissions_spk_status_index');
            $table->index(['id_perusahaan', 'ceisa_company_config_id'], 'ceisa_submissions_company_config_index');
        });

        Schema::create('ceisa_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ceisa_submission_id')
                ->constrained('ceisa_submissions')
                ->cascadeOnDelete();
            $table->string('nomor_aju', 26);
            $table->string('source', 30)->default('status');
            $table->string('kode_status', 50)->nullable();
            $table->string('kode_respon', 50)->nullable();
            $table->string('nomor_daftar')->nullable();
            $table->date('tanggal_daftar')->nullable();
            $table->string('nomor_respon')->nullable();
            $table->date('tanggal_respon')->nullable();
            $table->timestamp('waktu_status')->nullable();
            $table->timestamp('waktu_respon')->nullable();
            $table->text('keterangan')->nullable();
            $table->json('pesan')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['nomor_aju', 'source'], 'ceisa_status_logs_nomor_source_index');
            $table->index(['kode_status', 'kode_respon'], 'ceisa_status_logs_code_index');
        });

        Schema::create('ceisa_response_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ceisa_submission_id')
                ->constrained('ceisa_submissions')
                ->cascadeOnDelete();
            $table->foreignId('ceisa_status_log_id')
                ->nullable()
                ->constrained('ceisa_status_logs')
                ->nullOnDelete();
            $table->string('response_type', 50)->nullable();
            $table->string('kode_respon', 50)->nullable();
            $table->string('nomor_respon')->nullable();
            $table->string('storage_disk')->default('local');
            $table->string('storage_path');
            $table->string('file_name')->nullable();
            $table->string('mime_type')->nullable();
            $table->string('sha256', 64)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->boolean('raw_base64_available')->default(false);
            $table->timestamps();

            $table->index(['ceisa_submission_id', 'response_type'], 'ceisa_response_documents_submission_type_index');
            $table->index(['ceisa_submission_id', 'sha256'], 'ceisa_response_documents_submission_sha_index');
        });

        Schema::create('ceisa_document_extraction_audits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_spk');
            $table->unsignedBigInteger('id_dokumen_trans')->nullable();
            $table->json('filenames')->nullable();
            $table->string('parser_type', 50)->nullable();
            $table->string('parser_version', 50)->nullable();
            $table->json('extracted_fields')->nullable();
            $table->string('raw_text_storage_path')->nullable();
            $table->json('result_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedBigInteger('extracted_by')->nullable();
            $table->timestamps();

            $table->foreign('id_spk')
                ->references('id')
                ->on('spk')
                ->onDelete('cascade');

            $table->foreign('id_dokumen_trans')
                ->references('id')
                ->on('document_trans')
                ->nullOnDelete();

            $table->index(['id_spk', 'parser_type'], 'ceisa_extraction_audits_spk_parser_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ceisa_document_extraction_audits');
        Schema::dropIfExists('ceisa_response_documents');
        Schema::dropIfExists('ceisa_status_logs');
        Schema::dropIfExists('ceisa_submissions');
    }
};
