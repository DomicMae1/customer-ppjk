<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tako-user')->table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('id_perusahaan')->nullable()->after('id');

            $table->foreign('id_perusahaan', 'roles_id_perusahaan_foreign')
                ->references('id_perusahaan')
                ->on('perusahaan')
                ->cascadeOnDelete();
        });

        $this->dropOldUniqueIndex();
        $this->createScopedUniqueIndexes();
    }

    public function down(): void
    {
        $connection = DB::connection('tako-user');
        $driver = $connection->getDriverName();

        if ($driver === 'pgsql') {
            $connection->statement('DROP INDEX IF EXISTS roles_company_name_guard_unique');
            $connection->statement('DROP INDEX IF EXISTS roles_global_name_guard_unique');
        } elseif ($driver === 'mysql') {
            $connection->statement('DROP INDEX roles_company_name_guard_unique ON roles');
        }

        $connection->table('roles')->whereNotNull('id_perusahaan')->delete();

        Schema::connection('tako-user')->table('roles', function (Blueprint $table) {
            $table->dropForeign('roles_id_perusahaan_foreign');
            $table->dropColumn('id_perusahaan');
        });

        Schema::connection('tako-user')->table('roles', function (Blueprint $table) {
            $table->unique(['name', 'guard_name'], 'roles_name_guard_name_unique');
        });
    }

    private function dropOldUniqueIndex(): void
    {
        $connection = DB::connection('tako-user');
        $driver = $connection->getDriverName();

        if ($driver === 'pgsql') {
            $connection->statement('ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_guard_name_unique');
            return;
        }

        if ($driver === 'mysql') {
            $connection->statement('ALTER TABLE roles DROP INDEX roles_name_guard_name_unique');
        }
    }

    private function createScopedUniqueIndexes(): void
    {
        $connection = DB::connection('tako-user');
        $driver = $connection->getDriverName();

        if ($driver === 'pgsql') {
            $connection->statement(
                'CREATE UNIQUE INDEX roles_company_name_guard_unique ON roles (id_perusahaan, name, guard_name) WHERE id_perusahaan IS NOT NULL'
            );
            $connection->statement(
                'CREATE UNIQUE INDEX roles_global_name_guard_unique ON roles (name, guard_name) WHERE id_perusahaan IS NULL'
            );
            return;
        }

        if ($driver === 'mysql') {
            $connection->statement('CREATE UNIQUE INDEX roles_company_name_guard_unique ON roles (id_perusahaan, name, guard_name)');
        }
    }
};
