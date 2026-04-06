<?php

namespace Tests\Feature\Auth;

use Tests\Concerns\RefreshDatabaseWithUserMigrations;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabaseWithUserMigrations;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertNotFound();
    }

    public function test_new_users_can_not_register_when_registration_is_disabled()
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertGuest();
        $response->assertNotFound();
    }
}
