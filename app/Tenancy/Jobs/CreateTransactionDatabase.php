<?php

declare(strict_types=1);

namespace App\Tenancy\Jobs;

use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\Tenant;

class CreateTransactionDatabase
{
    protected Tenant $tenant;

    public function __construct(Tenant $tenant)
    {
        $this->tenant = $tenant;
    }

    /**
     * Create the transactional database for the tenant.
     */
    public function handle(): void
    {
        $dbName = $this->tenant->getTransactionDatabaseName();

        // Check if database already exists
        $exists = DB::connection('tako-user')
            ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$dbName]);

        if (empty($exists)) {
            // PostgreSQL doesn't allow CREATE DATABASE inside a transaction,
            // so we use the raw PDO connection
            $pdo = DB::connection('tako-user')->getPdo();
            $pdo->exec("CREATE DATABASE \"{$dbName}\"");

            \Log::info("Transaction database created: {$dbName}");
        } else {
            \Log::info("Transaction database already exists: {$dbName}");
        }
    }
}
