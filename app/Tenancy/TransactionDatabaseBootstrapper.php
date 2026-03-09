<?php

declare(strict_types=1);

namespace App\Tenancy;

use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\TenancyBootstrapper;
use Stancl\Tenancy\Contracts\Tenant;

class TransactionDatabaseBootstrapper implements TenancyBootstrapper
{
    protected ?string $originalDatabase = null;

    /**
     * Bootstrap tenancy — set the transactional DB connection.
     */
    public function bootstrap(Tenant $tenant): void
    {
        // Save original database name for reverting later
        $this->originalDatabase = config('database.connections.tenant-transaction.database');

        // Resolve the transactional database name from the tenant
        $transactionDb = $tenant->getTransactionDatabaseName();

        // Set the database name on the tenant-transaction connection
        config(['database.connections.tenant-transaction.database' => $transactionDb]);

        // Purge & reconnect so new config takes effect
        DB::purge('tenant-transaction');
    }

    /**
     * Revert to central context — clear the transactional DB connection.
     */
    public function revert(): void
    {
        config(['database.connections.tenant-transaction.database' => $this->originalDatabase]);

        DB::purge('tenant-transaction');
    }
}
