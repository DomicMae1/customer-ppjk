<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Perusahaan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CustomerApiController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'uid'             => 'required|string',
            'uid_perusahaan'  => 'nullable|string',
            'nama_perusahaan' => 'required|string|max:255',
            'type'            => 'required|string|max:100',
            'email'           => 'nullable|email|max:255',
            'nama'            => 'required|string|max:255',
            'no_npwp'         => 'nullable|string|max:50',
            'no_npwp_16'      => 'nullable|string|max:50',
            'uid_marketing'   => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $ownership = null;
            if (!empty($validated['uid_perusahaan'])) {
                $perusahaan = Perusahaan::where('uid', $validated['uid_perusahaan'])->first();
                if ($perusahaan) {
                    $ownership = $perusahaan->id_perusahaan;
                }
            }

            $customer = Customer::create([
                'uid'             => $validated['uid'],
                'uid_perusahaan'  => $validated['uid_perusahaan'] ?? null,
                'uid_marketing'   => $validated['uid_marketing'] ?? null,
                'nama_perusahaan' => $validated['nama_perusahaan'],
                'type'            => $validated['type'],
                'email_to'        => !empty($validated['email']) ? [$validated['email']] : [],
                'email_cc'        => [],
                'nama'            => $validated['nama'],
                'no_npwp'         => $validated['no_npwp'] ?? null,
                'no_npwp_16'      => $validated['no_npwp_16'] ?? null,
                'ownership'       => $ownership,
                'created_by'      => null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data Customer berhasil ditambahkan',
                'data'    => $customer
            ], 201);

        } catch (\Throwable $th) {
            DB::rollBack();
            Log::error("Error Api Store Customer: " . $th->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $th->getMessage()
            ], 500);
        }
    }
}
