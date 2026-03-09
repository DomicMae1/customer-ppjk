<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class MigrateTransactionCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'tenant:migrate-transaction {tenant_id? : The ID of the tenant (optional, migrates all if omitted)}';

    /**
     * The console command description.
     */
    protected $description = 'Run migrations on the transactional database for one or all tenants';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantId = $this->argument('tenant_id');

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if (!$tenant) {
                $this->error("Tenant '{$tenantId}' not found.");
                return 1;
            }
            $this->migrateTenant($tenant);
        } else {
            $tenants = Tenant::all();
            $this->info("Migrating transaction DB for {$tenants->count()} tenant(s)...");

            foreach ($tenants as $tenant) {
                $this->migrateTenant($tenant);
            }
        }

        $this->info('Done!');
        return 0;
    }

    /**
     * Migrate the transactional database for a single tenant.
     */
    protected function migrateTenant(Tenant $tenant): void
    {
        $dbName = $tenant->getTransactionDatabaseName();
        $this->info("Migrating: {$dbName} (tenant: {$tenant->id})");

        // Set the database name on the connection
        config(['database.connections.tenant-transaction.database' => $dbName]);
        DB::purge('tenant-transaction');

        // Run migrations
        $migrationParams = config('tenancy.transaction_migration_parameters', []);

        Artisan::call('migrate', array_merge($migrationParams, [
            '--database' => 'tenant-transaction',
        ]));

        $this->line(Artisan::output());
    }
}
