<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class CutOffTransactionDatabase extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'tenant:cutoff 
        {tenant_id : The ID of the tenant to cut off}
        {year : The year label for the archive (e.g., 2026)}
        {--force : Skip confirmation prompt}';

    /**
     * The console command description.
     */
    protected $description = 'Cut off the transactional database for a tenant (archive current, create fresh)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantId = $this->argument('tenant_id');
        $year = $this->argument('year');

        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            $this->error("Tenant '{$tenantId}' not found.");
            return 1;
        }

        $liveDb = $tenant->getTransactionDatabaseName(); // e.g., tenantalpha_trans_live
        $archiveDb = 'tenant' . $tenantId . '_trans_' . $year; // e.g., tenantalpha_trans_2026

        $this->info("Cut-off plan:");
        $this->info("  Live DB:    {$liveDb}");
        $this->info("  Archive DB: {$archiveDb}");
        $this->info("");
        $this->info("Steps:");
        $this->info("  1. Rename {$liveDb} → {$archiveDb} (archive)");
        $this->info("  2. Create new empty {$liveDb} with same schema");

        if (!$this->option('force') && !$this->confirm('Proceed with cut-off?')) {
            $this->info('Cut-off cancelled.');
            return 0;
        }

        // Check if archive DB already exists
        $archiveExists = DB::connection('tako-user')
            ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$archiveDb]);

        if (!empty($archiveExists)) {
            $this->error("Archive database '{$archiveDb}' already exists! Choose a different year label.");
            return 1;
        }

        // Check if live DB exists
        $liveExists = DB::connection('tako-user')
            ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$liveDb]);

        if (empty($liveExists)) {
            $this->error("Live database '{$liveDb}' does not exist!");
            return 1;
        }

        try {
            $pdo = DB::connection('tako-user')->getPdo();

            // Step 1: Terminate active connections to the live DB
            $this->info("Terminating active connections to {$liveDb}...");
            DB::connection('tako-user')->statement("
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = ?
                AND pid <> pg_backend_pid()
            ", [$liveDb]);

            // Purge Laravel's connection
            DB::purge('tenant-transaction');

            // Step 2: Rename live → archive
            $this->info("Renaming {$liveDb} → {$archiveDb}...");
            $pdo->exec("ALTER DATABASE \"{$liveDb}\" RENAME TO \"{$archiveDb}\"");

            // Step 3: Create new empty DB with same schema
            // Use the archive DB as template
            $this->info("Creating new {$liveDb} from template...");
            $pdo->exec("CREATE DATABASE \"{$liveDb}\" TEMPLATE \"{$archiveDb}\"");

            // Step 4: Truncate all tables in the new live DB (keep schema, remove data)
            $this->info("Clearing data from new {$liveDb}...");
            config(['database.connections.tenant-transaction.database' => $liveDb]);
            DB::purge('tenant-transaction');

            $tables = DB::connection('tenant-transaction')
                ->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'");

            foreach ($tables as $table) {
                DB::connection('tenant-transaction')
                    ->statement("TRUNCATE TABLE \"{$table->tablename}\" RESTART IDENTITY CASCADE");
            }

            $this->info("");
            $this->info("✅ Cut-off completed successfully!");
            $this->info("  Archive: {$archiveDb} (data tahun {$year})");
            $this->info("  Live:    {$liveDb} (kosong, siap dipakai)");

            return 0;

        } catch (\Exception $e) {
            $this->error("Cut-off failed: " . $e->getMessage());
            $this->error("Please check database state manually!");
            return 1;
        }
    }
}
