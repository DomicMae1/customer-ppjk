<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Tests\Concerns\RefreshDatabaseWithUserMigrations;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabaseWithUserMigrations;

    public function test_profile_page_is_displayed()
    {
        $this->actingAs(User::factory()->create())
            ->get('/settings/profile')
            ->assertNotFound();
    }

    public function test_profile_information_can_not_be_updated_when_route_is_disabled()
    {
        $this->actingAs(User::factory()->create())
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ])
            ->assertNotFound();
    }

    public function test_profile_email_verification_flow_is_unavailable_when_route_is_disabled()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ])
            ->assertNotFound();
    }

    public function test_user_can_not_delete_their_account_when_route_is_disabled()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete('/settings/profile', [
                'password' => 'password',
            ])
            ->assertNotFound();

        $this->assertAuthenticated();
        $this->assertNotNull($user->fresh());
    }

    public function test_invalid_password_delete_attempt_is_unavailable_when_route_is_disabled()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from('/settings/profile')
            ->delete('/settings/profile', [
                'password' => 'wrong-password',
            ])
            ->assertNotFound();

        $this->assertNotNull($user->fresh());
    }
}
