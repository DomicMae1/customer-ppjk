<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/customers', [\App\Http\Controllers\Api\CustomerApiController::class, 'store'])->middleware('auth:sanctum');
