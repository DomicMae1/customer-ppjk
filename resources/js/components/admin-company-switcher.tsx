import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export function AdminCompanySwitcher() {
    const { adminCompanyContext } = usePage<SharedData>().props;
    const canSwitch = Boolean(adminCompanyContext?.canSwitch);
    const companies = useMemo(() => adminCompanyContext?.companies ?? [], [adminCompanyContext?.companies]);
    const selectedCompanyId = adminCompanyContext?.selectedCompanyId ?? null;
    const [selectedCompany, setSelectedCompany] = useState(selectedCompanyId ? String(selectedCompanyId) : '');

    useEffect(() => {
        setSelectedCompany(selectedCompanyId ? String(selectedCompanyId) : '');
    }, [selectedCompanyId]);

    if (!canSwitch || companies.length === 0) {
        return null;
    }

    const handleChange = (companyId: string) => {
        setSelectedCompany(companyId);

        router.post(
            '/admin/company-context',
            { id_perusahaan: Number(companyId) },
            {
                preserveScroll: true,
                onError: () => setSelectedCompany(selectedCompanyId ? String(selectedCompanyId) : ''),
            },
        );
    };

    return (
        <div className="flex min-w-0 items-center gap-2">
            <Building2 className="text-muted-foreground hidden h-4 w-4 sm:block" />
            <Select value={selectedCompany} onValueChange={handleChange}>
                <SelectTrigger className="bg-background h-9 w-[180px] text-xs sm:w-[260px] sm:text-sm">
                    <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                    {companies.map((company) => (
                        <SelectItem key={company.id_perusahaan} value={String(company.id_perusahaan)}>
                            {company.nama_perusahaan}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
