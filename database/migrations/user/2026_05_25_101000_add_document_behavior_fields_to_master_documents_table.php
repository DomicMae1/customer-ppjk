<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $schema = Schema::connection('tako-user');

        $schema->table('master_documents', function (Blueprint $table) use ($schema) {
            if (!$schema->hasColumn('master_documents', 'is_verification')) {
                $table->boolean('is_verification')->nullable()->after('is_internal');
            }

            if (!$schema->hasColumn('master_documents', 'import_mandatory')) {
                $table->boolean('import_mandatory')->default(false)->after('attribute');
            }

            if (!$schema->hasColumn('master_documents', 'export_mandatory')) {
                $table->boolean('export_mandatory')->default(false)->after('import_mandatory');
            }

            if (!$schema->hasColumn('master_documents', 'is_ori')) {
                $table->boolean('is_ori')->default(false)->after('is_confirmed');
            }

            if (!$schema->hasColumn('master_documents', 'is_print')) {
                $table->boolean('is_print')->default(false)->after('is_ori');
            }

            if (!$schema->hasColumn('master_documents', 'is_send_email')) {
                $table->boolean('is_send_email')->default(false)->after('is_print');
            }

            if (!$schema->hasColumn('master_documents', 'kuota_revisi')) {
                $table->unsignedBigInteger('kuota_revisi')->nullable()->after('description_file');
            }
        });
    }

    public function down(): void
    {
        $schema = Schema::connection('tako-user');
        $columns = [
            'kuota_revisi',
            'is_send_email',
            'is_print',
            'is_ori',
            'export_mandatory',
            'import_mandatory',
            'is_verification',
        ];

        foreach ($columns as $column) {
            if ($schema->hasColumn('master_documents', $column)) {
                $schema->table('master_documents', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
