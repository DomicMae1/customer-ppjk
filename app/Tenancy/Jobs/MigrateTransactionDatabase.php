<?php

declare(strict_types=1);

namespace App\Tenancy\Jobs;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\Tenant;

class MigrateTransactionDatabase
{
    protected Tenant $tenant;

    public function __construct(Tenant $tenant)
    {
        $this->tenant = $tenant;
    }

    /**
     * Run migrations on the transactional database for the tenant.
     */
    public function handle(): void
    {
        $dbName = $this->tenant->getTransactionDatabaseName();

        // Temporarily set the database name on the tenant-transaction connection
        config(['database.connections.tenant-transaction.database' => $dbName]);
        DB::purge('tenant-transaction');

        // Run migrations for the transaction folder
        $migrationParams = config('tenancy.transaction_migration_parameters', []);

        Artisan::call('migrate', array_merge($migrationParams, [
            '--database' => 'tenant-transaction',
        ]));

        \Log::info("Transaction database migrated: {$dbName}", [
            'output' => Artisan::output(),
        ]);
    }
}
