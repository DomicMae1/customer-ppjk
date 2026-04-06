<?php

namespace Tests\Concerns;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\Traits\CanConfigureMigrationCommands;

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
}
