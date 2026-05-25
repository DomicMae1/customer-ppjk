<?php

namespace App\Http\Controllers;

use App\Services\AdminCompanyContextService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminCompanyContextController extends Controller
{
    public function update(Request $request, AdminCompanyContextService $companyContext): RedirectResponse
    {
        $validated = $request->validate([
            'id_perusahaan' => ['required', 'integer', 'exists:perusahaan,id_perusahaan'],
        ]);

        $companyContext->switchForAdmin($request->user(), (int) $validated['id_perusahaan']);

        return back();
    }
}
