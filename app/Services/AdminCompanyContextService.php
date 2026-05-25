<?php

namespace App\Services;

use App\Models\Perusahaan;
use App\Models\User;
use Illuminate\Support\Collection;

class AdminCompanyContextService
{
    public function companies(): Collection
    {
        return Perusahaan::with('domain')
            ->select(['id_perusahaan', 'nama_perusahaan', 'id_domain'])
            ->orderBy('nama_perusahaan')
            ->get()
            ->map(fn (Perusahaan $company) => $this->companyPayload($company));
    }

    public function companySharedPayload(?User $user): array
    {
        $company = $this->selectedCompanyForUser($user);

        if (!$company) {
            return [
                'id' => session('company_id'),
                'name' => session('company_name'),
                'logo' => session('company_logo'),
            ];
        }

        return [
            'id' => $company->id_perusahaan,
            'name' => $company->nama_perusahaan,
            'logo' => $this->companyLogo($company),
        ];
    }

    public function adminContextPayload(?User $user): array
    {
        if (!$user?->hasRole('admin')) {
            return [
                'canSwitch' => false,
                'selectedCompanyId' => null,
                'companies' => [],
            ];
        }

        $selectedCompany = $this->selectedCompanyForUser($user);

        return [
            'canSwitch' => true,
            'selectedCompanyId' => $selectedCompany?->id_perusahaan,
            'companies' => $this->companies(),
        ];
    }

    public function selectedCompanyForUser(?User $user): ?Perusahaan
    {
        if (!$user) {
            return null;
        }

        if (!$user->hasRole('admin')) {
            $company = $user->perusahaan()->with('domain')->first();

            if ($company) {
                $this->putCompanySession($company);
            }

            return $company;
        }

        $company = null;
        $sessionCompanyId = session('company_id');

        if ($sessionCompanyId) {
            $company = Perusahaan::with('domain')->whereKey((int) $sessionCompanyId)->first();
        }

        if (!$company) {
            $company = Perusahaan::with('domain')->orderBy('nama_perusahaan')->first();
        }

        if ($company) {
            $this->putCompanySession($company);
        }

        return $company;
    }

    public function selectedCompanyIdForUser(?User $user): ?int
    {
        $company = $this->selectedCompanyForUser($user);

        return $company?->id_perusahaan ? (int) $company->id_perusahaan : null;
    }

    public function switchForAdmin(User $user, int $idPerusahaan): Perusahaan
    {
        abort_unless($user->hasRole('admin'), 403, 'Only admin can switch active company.');

        $company = Perusahaan::with('domain')->findOrFail($idPerusahaan);
        $this->putCompanySession($company);

        return $company;
    }

    private function putCompanySession(Perusahaan $company): void
    {
        session([
            'company_id' => $company->id_perusahaan,
            'company_name' => $company->nama_perusahaan,
            'company_logo' => $this->companyLogo($company),
            'company_url' => $company->domain?->domain,
        ]);
    }

    private function companyPayload(Perusahaan $company): array
    {
        return [
            'id_perusahaan' => $company->id_perusahaan,
            'nama_perusahaan' => $company->nama_perusahaan,
            'path_company_logo' => $this->companyLogo($company),
        ];
    }

    private function companyLogo(Perusahaan $company): ?string
    {
        $logoPath = $company->domain?->path_company_logo;

        return $logoPath ? asset('storage/' . $logoPath) : null;
    }
}
