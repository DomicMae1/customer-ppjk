<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DropAllTables extends Command
{
    protected $signature = 'db:drop-all {connection}';
    protected $description = 'Drop all tables from a specific PostgreSQL connection';

    public function handle()
    {
        $connection = $this->argument('connection');
        $schema = config("database.connections.$connection.schema", 'public');

        $tables = DB::connection($connection)
            ->select("SELECT tablename FROM pg_tables WHERE schemaname = ?", [$schema]);

        foreach ($tables as $table) {
            $tableName = $table->tablename;
            DB::connection($connection)->statement("DROP TABLE IF EXISTS \"$tableName\" CASCADE");
            $this->info("Dropped table: $tableName");
        }

        $this->info("✅ Semua tabel dari koneksi '$connection' berhasil dihapus.");
    }
}
