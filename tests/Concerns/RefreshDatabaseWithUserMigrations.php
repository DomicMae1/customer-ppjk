<?php

namespace Tests\Concerns;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\Traits\CanConfigureMigrationCommands;
use RuntimeException;

trait RefreshDatabaseWithUserMigrations
{
    use RefreshDatabase;
    use CanConfigureMigrationCommands;

    protected function connectionsToTransact()
    {
        return ['tako-user'];
    }

    protected function migrateFreshUsing()
    {
        $this->ensureSafeTestingDatabase();

        $seeder = $this->seeder();

        return array_merge(
            [
                '--database' => 'tako-user',
                '--path' => database_path('migrations/user'),
                '--realpath' => true,
                '--drop-views' => $this->shouldDropViews(),
                '--drop-types' => $this->shouldDropTypes(),
            ],
            $seeder ? ['--seeder' => $seeder] : ['--seed' => $this->shouldSeed()]
        );
    }

    private function ensureSafeTestingDatabase(): void
    {
        $connection = config('database.connections.tako-user');
        $driver = $connection['driver'] ?? null;
        $database = $connection['database'] ?? null;

        if (app()->environment('testing') && $driver === 'sqlite' && $database === ':memory:') {
            return;
        }

        throw new RuntimeException(
            'Refusing to run tests because RefreshDatabaseWithUserMigrations would migrate:fresh the tako-user database. Configure tako-user to use sqlite :memory: for testing first.'
        );
    }
}
