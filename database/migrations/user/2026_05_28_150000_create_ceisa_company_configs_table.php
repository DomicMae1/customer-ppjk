<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tako-user';

    public function up(): void
    {
        Schema::create('ceisa_company_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->string('environment', 20)->default('production');
            $table->string('base_url')->default('https://apis-gw.beacukai.go.id');
            $table->string('origin_url')->nullable();
            $table->string('id_platform')->nullable();
            $table->text('api_key')->nullable();
            $table->text('app_id')->nullable();
            $table->text('username')->nullable();
            $table->text('password')->nullable();
            $table->string('company_code', 6)->nullable();
            $table->string('id_pengguna')->nullable();
            $table->string('npwp', 32)->nullable();
            $table->string('npwp_16', 32)->nullable();
            $table->string('nib', 32)->nullable();
            $table->string('ppjk_name')->nullable();
            $table->text('ppjk_address')->nullable();
            $table->string('ppjk_npwp', 32)->nullable();
            $table->string('ppjk_npwp_16', 32)->nullable();
            $table->string('ppjk_nib', 32)->nullable();
            $table->string('default_kode_kantor', 10)->nullable();
            $table->string('default_kode_tps', 50)->nullable();
            $table->string('default_signer_name')->nullable();
            $table->string('default_signer_title')->nullable();
            $table->string('default_signer_city')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_verified_at')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('id_perusahaan')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->onDelete('cascade');

            $table->unique(['id_perusahaan', 'environment'], 'ceisa_company_configs_company_env_unique');
            $table->index(['environment', 'is_active'], 'ceisa_company_configs_env_active_index');
        });

        Schema::create('ceisa_token_caches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ceisa_company_config_id')
                ->constrained('ceisa_company_configs')
                ->cascadeOnDelete();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->string('token_type', 50)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('refresh_expires_at')->nullable();
            $table->timestamp('last_refreshed_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique('ceisa_company_config_id', 'ceisa_token_caches_config_unique');
            $table->index('expires_at', 'ceisa_token_caches_expires_at_index');
        });

        Schema::create('ceisa_importir_presets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan');
            $table->unsignedBigInteger('id_customer')->nullable();
            $table->string('name');
            $table->string('npwp', 32)->nullable();
            $table->string('npwp_16', 32)->nullable();
            $table->string('nitku', 64)->nullable();
            $table->string('nib', 32)->nullable();
            $table->text('address')->nullable();
            $table->string('kode_jenis_identitas', 10)->nullable();
            $table->string('kode_status', 10)->nullable();
            $table->string('kode_jenis_api', 10)->nullable();
            $table->string('default_kode_cara_bayar', 20)->nullable();
            $table->string('default_kode_jenis_impor', 20)->nullable();
            $table->string('default_kode_tutup_pu', 20)->nullable();
            $table->string('default_signer_name')->nullable();
            $table->string('default_signer_title')->nullable();
            $table->string('default_signer_city')->nullable();
            $table->decimal('default_ndpbm', 18, 4)->nullable();
            $table->string('last_nomor_aju', 26)->nullable();
            $table->timestamp('last_submitted_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('id_perusahaan')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->onDelete('cascade');

            $table->foreign('id_customer')
                ->references('id_customer')
                ->on('customers')
                ->nullOnDelete();

            $table->index(['id_perusahaan', 'is_active'], 'ceisa_importir_presets_company_active_index');
            $table->index('npwp_16', 'ceisa_importir_presets_npwp_16_index');
        });

        Schema::create('ceisa_reference_cache', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_perusahaan')->nullable();
            $table->string('environment', 20)->default('production');
            $table->string('reference_type', 50);
            $table->string('lookup_key', 255);
            $table->json('request_params')->nullable();
            $table->json('response_payload');
            $table->timestamp('fetched_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('id_perusahaan')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->nullOnDelete();

            $table->index(['id_perusahaan', 'environment', 'reference_type'], 'ceisa_reference_cache_scope_index');
            $table->index(['reference_type', 'lookup_key'], 'ceisa_reference_cache_lookup_index');
            $table->index('expires_at', 'ceisa_reference_cache_expires_at_index');
            $table->unique(
                ['id_perusahaan', 'environment', 'reference_type', 'lookup_key'],
                'ceisa_reference_cache_scope_lookup_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ceisa_reference_cache');
        Schema::dropIfExists('ceisa_importir_presets');
        Schema::dropIfExists('ceisa_token_caches');
        Schema::dropIfExists('ceisa_company_configs');
    }
};
