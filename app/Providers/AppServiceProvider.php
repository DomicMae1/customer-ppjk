<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        date_default_timezone_set(config('app.timezone'));
        Carbon::setLocale('id');

        RateLimiter::for('login-page', function (Request $request) {
            return Limit::perMinute((int) config('auth.login_rate_limits.page_per_minute', 60))
                ->by($request->ip().'|'.$request->getHost());
        });

        RateLimiter::for('login-submit', function (Request $request) {
            return Limit::perMinute((int) config('auth.login_rate_limits.submit_per_minute', 20))
                ->by($request->ip().'|'.$request->getHost());
        });

        \Inertia\Inertia::share([
            'company' => fn () => [
                'id' => session('company_id'),
                'name' => session('company_name'),
                'logo' => session('company_logo'),
            ],
        ]);
    }
}
