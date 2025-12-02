<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

class FileController extends Controller
{
    public function view($path) 
    {
        // $path sekarang berisi string lengkap, contoh: "cv-delta/attachment/12345.pdf"
        
        if (!Storage::disk('customers_external')->exists($path)) {
            abort(404, 'File not found.');
        }

        $fullPath = Storage::disk('customers_external')->path($path);
        $mimeType = Storage::disk('customers_external')->mimeType($path);

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . basename($path) . '"'
        ]);
    }
}