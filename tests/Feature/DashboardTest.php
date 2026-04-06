<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\Concerns\RefreshDatabaseWithUserMigrations;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabaseWithUserMigrations;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertRedirect('/shipping');
    }
}
