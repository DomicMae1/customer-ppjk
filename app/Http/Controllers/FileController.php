<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

class FileController extends Controller
{
    public function view($path)
    {
        // 1. Tentukan Disk yang mengarah ke /mnt/CR (via Docker Volume)
        $disk = Storage::disk('customers_external');

        // 2. Cek apakah file ada
        if (!$disk->exists($path)) {
            abort(404, 'File tidak ditemukan di penyimpanan server.');
        }

        // 3. Ambil Full Path (Path Internal Container)
        // Hasilnya akan seperti: /var/www/html/storage/external_data/pt-alpha/customers/file.pdf
        $fullPath = $disk->path($path);

        // 4. Cek Mime Type
        $mimeType = $disk->mimeType($path) ?? 'application/octet-stream';

        // 5. Return File agar bisa dipreview di browser
        // Menggunakan response()->file() mendukung "Range Requests" (penting untuk video/pdf besar)
        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
            // Header tambahan untuk keamanan
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}