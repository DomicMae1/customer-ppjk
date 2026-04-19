<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant-transaction';

    public function up(): void
    {
        Schema::connection($this->connection)->table('document_trans', function (Blueprint $table) {
            $table->timestamp('upload_date')->nullable()->after('is_verification');
            $table->timestamp('verified_date')->nullable()->after('upload_date');
            $table->timestamp('ori_date')->nullable()->after('verified_date');
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->table('document_trans', function (Blueprint $table) {
            $table->dropColumn(['upload_date', 'verified_date', 'ori_date']);
        });
    }
};
