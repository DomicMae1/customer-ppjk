<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SecureFileController extends Controller
{
    public function show($filename)
    {
        $fullPath = storage_path('app/public/customers/' . $filename);

        if (!file_exists($fullPath)) {
            abort(404, 'File not found: ' . $filename);
        }

        return response()->file($fullPath);
    }
}
