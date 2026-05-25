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
        Schema::connection('tenant-transaction')->table('spk', function (Blueprint $table) {
            if (!Schema::connection('tenant-transaction')->hasColumn('spk', 'shipping_package_id')) {
                $table->unsignedBigInteger('shipping_package_id')->nullable()->after('shipment_type');
                $table->index('shipping_package_id', 'spk_shipping_package_id_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant-transaction')->table('spk', function (Blueprint $table) {
            if (Schema::connection('tenant-transaction')->hasColumn('spk', 'shipping_package_id')) {
                $table->dropIndex('spk_shipping_package_id_index');
                $table->dropColumn('shipping_package_id');
            }
        });
    }
};
