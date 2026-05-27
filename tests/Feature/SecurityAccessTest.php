<?php

namespace Tests\Feature;

use App\Models\Perusahaan;
use App\Models\User;
use Tests\Concerns\RefreshDatabaseWithUserMigrations;
use Tests\TestCase;

class SecurityAccessTest extends TestCase
{
    use RefreshDatabaseWithUserMigrations;

    public function test_login_screen_requests_are_rate_limited(): void
    {
        config(['auth.login_rate_limits.page_per_minute' => 2]);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->get('/login')
            ->assertOk();

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->get('/login')
            ->assertOk();

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->get('/login')
            ->assertTooManyRequests();
    }

    public function test_non_admin_cannot_fetch_company_json_endpoint(): void
    {
        $company = Perusahaan::create(['nama_perusahaan' => 'Private Company']);
        $user = User::factory()->create([
            'role' => 'eksternal',
            'id_perusahaan' => $company->id_perusahaan,
        ]);

        $this->actingAs($user)
            ->getJson("/perusahaan/{$company->id_perusahaan}")
            ->assertForbidden();
    }

    public function test_non_admin_cannot_mutate_company_resources(): void
    {
        $company = Perusahaan::create(['nama_perusahaan' => 'Private Company']);
        $user = User::factory()->create([
            'role' => 'eksternal',
            'id_perusahaan' => $company->id_perusahaan,
        ]);

        $this->actingAs($user)
            ->post('/perusahaan', [
                'nama_perusahaan' => 'Another Company',
                'domain' => 'another-company',
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->put("/perusahaan/{$company->id_perusahaan}", [
                'nama_perusahaan' => 'Changed Company',
                'domain' => 'changed-company',
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->delete("/perusahaan/{$company->id_perusahaan}")
            ->assertForbidden();
    }
}
