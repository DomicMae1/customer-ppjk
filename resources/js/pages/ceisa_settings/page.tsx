import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Database, EyeOff, FileSearch, Loader2, Save, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Company {
    id_perusahaan: number;
    nama_perusahaan: string;
}

interface CeisaConfig {
    id: number;
    id_perusahaan: number;
    environment: Environment;
    base_url: string;
    origin_url: string | null;
    id_platform: string | null;
    has_api_key: boolean;
    has_app_id: boolean;
    has_username: boolean;
    has_password: boolean;
    company_code: string | null;
    id_pengguna: string | null;
    npwp: string | null;
    npwp_16: string | null;
    nib: string | null;
    ppjk_name: string | null;
    ppjk_address: string | null;
    ppjk_npwp: string | null;
    ppjk_npwp_16: string | null;
    ppjk_nib: string | null;
    default_kode_kantor: string | null;
    default_kode_tps: string | null;
    default_signer_name: string | null;
    default_signer_title: string | null;
    default_signer_city: string | null;
    is_active: boolean;
    last_verified_at: string | null;
    last_error: string | null;
    updated_at: string | null;
}

type Environment = 'development' | 'production';

interface FormState {
    id_perusahaan: string;
    environment: Environment;
    base_url: string;
    origin_url: string;
    id_platform: string;
    api_key: string;
    app_id: string;
    username: string;
    password: string;
    company_code: string;
    id_pengguna: string;
    npwp: string;
    npwp_16: string;
    nib: string;
    ppjk_name: string;
    ppjk_address: string;
    ppjk_npwp: string;
    ppjk_npwp_16: string;
    ppjk_nib: string;
    default_kode_kantor: string;
    default_kode_tps: string;
    default_signer_name: string;
    default_signer_title: string;
    default_signer_city: string;
    is_active: boolean;
}

type ReferenceLookupType = 'kurs' | 'hs_lartas' | 'tarif_hs' | 'pelabuhan_kata' | 'gudang_tps_kode_kantor' | 'pelabuhan_kode_kantor' | 'manifes_bc11';

type StatusCheckType = 'nomor_aju' | 'company';

interface ReferenceField {
    key: string;
    label: string;
    placeholder?: string;
    type?: string;
    optional?: boolean;
}

interface ReferenceOption {
    value: ReferenceLookupType;
    label: string;
    description: string;
    fields: ReferenceField[];
}

interface ReferenceState {
    lookup_type: ReferenceLookupType;
    params: Record<string, string>;
    force_refresh: boolean;
}

interface StatusState {
    status_type: StatusCheckType;
    nomor_aju: string;
    id_perusahaan_ceisa: string;
}

interface PageProps {
    companies: Company[];
    selectedCompanyId?: number | null;
}

const baseUrlByEnvironment: Record<Environment, string> = {
    development: 'https://apisdev-gw.beacukai.go.id',
    production: 'https://apis-gw.beacukai.go.id',
};

const referenceOptions: ReferenceOption[] = [
    {
        value: 'pelabuhan_kata',
        label: 'Pelabuhan by Kata',
        description: 'Cari kode pelabuhan dari potongan nama.',
        fields: [{ key: 'kata', label: 'Kata', placeholder: 'SAO' }],
    },
    {
        value: 'pelabuhan_kode_kantor',
        label: 'Pelabuhan by Kantor',
        description: 'Ambil pelabuhan berdasarkan kode kantor Bea Cukai.',
        fields: [{ key: 'kode_kantor', label: 'Kode Kantor', placeholder: '070100' }],
    },
    {
        value: 'gudang_tps_kode_kantor',
        label: 'TPS by Kantor',
        description: 'Ambil referensi TPS/gudang berdasarkan kode kantor.',
        fields: [{ key: 'kode_kantor', label: 'Kode Kantor', placeholder: '070100' }],
    },
    {
        value: 'kurs',
        label: 'Kurs',
        description: 'Cek kurs terkini berdasarkan kode valuta.',
        fields: [
            { key: 'kode_valuta', label: 'Kode Valuta', placeholder: 'USD' },
            { key: 'tanggal', label: 'Tanggal', type: 'date', optional: true },
        ],
    },
    {
        value: 'hs_lartas',
        label: 'HS Lartas',
        description: 'Cek larangan pembatasan berdasarkan kode HS.',
        fields: [{ key: 'kode_hs', label: 'Kode HS', placeholder: '87089999' }],
    },
    {
        value: 'tarif_hs',
        label: 'Tarif HS',
        description: 'Cek tarif pos HS pada tanggal tertentu.',
        fields: [
            { key: 'kode_hs', label: 'Kode HS', placeholder: '87089999' },
            { key: 'tanggal', label: 'Tanggal', type: 'date' },
        ],
    },
    {
        value: 'manifes_bc11',
        label: 'Manifes BC 1.1',
        description: 'Cek data manifes berdasarkan host B/L.',
        fields: [
            { key: 'nomor_bl', label: 'Nomor B/L', placeholder: 'Nomor host B/L' },
            { key: 'tanggal_bl', label: 'Tanggal B/L', placeholder: 'DD-MM-YYYY' },
            { key: 'kode_kantor', label: 'Kode Kantor', placeholder: '070100' },
            { key: 'nama_importir', label: 'Nama Importir', placeholder: 'Nama importir' },
        ],
    },
];

const emptyForm = (companyId = '', environment: Environment = 'production'): FormState => ({
    id_perusahaan: companyId,
    environment,
    base_url: baseUrlByEnvironment[environment],
    origin_url: '',
    id_platform: '',
    api_key: '',
    app_id: '',
    username: '',
    password: '',
    company_code: '',
    id_pengguna: '',
    npwp: '',
    npwp_16: '',
    nib: '',
    ppjk_name: '',
    ppjk_address: '',
    ppjk_npwp: '',
    ppjk_npwp_16: '',
    ppjk_nib: '',
    default_kode_kantor: '',
    default_kode_tps: '',
    default_signer_name: '',
    default_signer_title: '',
    default_signer_city: '',
    is_active: true,
});

export default function CeisaSettings({ companies, selectedCompanyId }: PageProps) {
    const initialCompanyId = selectedCompanyId ? String(selectedCompanyId) : companies[0]?.id_perusahaan ? String(companies[0].id_perusahaan) : '';
    const [form, setForm] = useState<FormState>(() => emptyForm(initialCompanyId));
    const [config, setConfig] = useState<CeisaConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [referenceLookup, setReferenceLookup] = useState<ReferenceState>({
        lookup_type: 'pelabuhan_kata',
        params: { kata: '' },
        force_refresh: false,
    });
    const [statusCheck, setStatusCheck] = useState<StatusState>({
        status_type: 'nomor_aju',
        nomor_aju: '',
        id_perusahaan_ceisa: '',
    });
    const [isReferenceLoading, setIsReferenceLoading] = useState(false);
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [referenceResult, setReferenceResult] = useState<any>(null);
    const [statusResult, setStatusResult] = useState<any>(null);

    const selectedCompanyName = useMemo(
        () => companies.find((company) => String(company.id_perusahaan) === form.id_perusahaan)?.nama_perusahaan ?? '-',
        [companies, form.id_perusahaan],
    );

    const selectedReferenceOption = useMemo(
        () => referenceOptions.find((option) => option.value === referenceLookup.lookup_type) ?? referenceOptions[0],
        [referenceLookup.lookup_type],
    );

    useEffect(() => {
        if (!form.id_perusahaan) return;
        void fetchConfig(form.id_perusahaan, form.environment);
    }, [form.id_perusahaan, form.environment]);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const applyConfig = (nextConfig: CeisaConfig | null, companyId: string, environment: Environment) => {
        setConfig(nextConfig);
        setForm({
            ...emptyForm(companyId, environment),
            ...(nextConfig
                ? {
                      base_url: nextConfig.base_url || baseUrlByEnvironment[environment],
                      origin_url: nextConfig.origin_url ?? '',
                      id_platform: nextConfig.id_platform ?? '',
                      company_code: nextConfig.company_code ?? '',
                      id_pengguna: nextConfig.id_pengguna ?? '',
                      npwp: nextConfig.npwp ?? '',
                      npwp_16: nextConfig.npwp_16 ?? '',
                      nib: nextConfig.nib ?? '',
                      ppjk_name: nextConfig.ppjk_name ?? '',
                      ppjk_address: nextConfig.ppjk_address ?? '',
                      ppjk_npwp: nextConfig.ppjk_npwp ?? '',
                      ppjk_npwp_16: nextConfig.ppjk_npwp_16 ?? '',
                      ppjk_nib: nextConfig.ppjk_nib ?? '',
                      default_kode_kantor: nextConfig.default_kode_kantor ?? '',
                      default_kode_tps: nextConfig.default_kode_tps ?? '',
                      default_signer_name: nextConfig.default_signer_name ?? '',
                      default_signer_title: nextConfig.default_signer_title ?? '',
                      default_signer_city: nextConfig.default_signer_city ?? '',
                      is_active: nextConfig.is_active,
                  }
                : {}),
            id_perusahaan: companyId,
            environment,
        });
    };

    const fetchConfig = async (companyId: string, environment: Environment) => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/ceisa-settings/companies/${companyId}`, { params: { environment } });
            applyConfig(response.data.config, companyId, environment);
        } catch {
            toast.error('Gagal mengambil konfigurasi CEISA.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnvironmentChange = (environment: Environment) => {
        setForm((current) => ({
            ...current,
            environment,
            base_url: baseUrlByEnvironment[environment],
            api_key: '',
            app_id: '',
            username: '',
            password: '',
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post('/ceisa-settings', {
                ...form,
                id_perusahaan: Number(form.id_perusahaan),
            });
            applyConfig(response.data.config, form.id_perusahaan, form.environment);
            toast.success('Konfigurasi CEISA disimpan.');
        } catch (error: any) {
            const message = error?.response?.data?.message ?? 'Gagal menyimpan konfigurasi CEISA.';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        if (!config) {
            toast.error('Simpan konfigurasi dulu sebelum test OAuth.');
            return;
        }

        setIsTesting(true);
        try {
            const response = await axios.post('/ceisa-settings/test', {
                id_perusahaan: Number(form.id_perusahaan),
                environment: form.environment,
            });
            setConfig(response.data.config);
            toast.success(response.data.message ?? 'OAuth CEISA berhasil.');
        } catch (error: any) {
            const responseConfig = error?.response?.data?.config;
            if (responseConfig) setConfig(responseConfig);
            toast.error(error?.response?.data?.message ?? 'Test OAuth CEISA gagal.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleReferenceTypeChange = (lookupType: ReferenceLookupType) => {
        const option = referenceOptions.find((item) => item.value === lookupType);
        const params = Object.fromEntries((option?.fields ?? []).map((field) => [field.key, '']));

        setReferenceLookup({
            lookup_type: lookupType,
            params,
            force_refresh: false,
        });
        setReferenceResult(null);
    };

    const setReferenceParam = (key: string, value: string) => {
        setReferenceLookup((current) => ({
            ...current,
            params: {
                ...current.params,
                [key]: value,
            },
        }));
    };

    const handleReferenceLookup = async () => {
        if (!config) {
            toast.error('Simpan konfigurasi dulu sebelum cek referensi.');
            return;
        }

        setIsReferenceLoading(true);
        setReferenceResult(null);

        try {
            const response = await axios.post('/ceisa-settings/reference', {
                id_perusahaan: Number(form.id_perusahaan),
                environment: form.environment,
                lookup_type: referenceLookup.lookup_type,
                params: referenceLookup.params,
                force_refresh: referenceLookup.force_refresh,
            });
            setReferenceResult(response.data);
            toast.success(response.data.message ?? 'Referensi CEISA berhasil dicek.');
        } catch (error: any) {
            setReferenceResult(error?.response?.data ?? null);
            toast.error(error?.response?.data?.message ?? 'Cek referensi CEISA gagal.');
        } finally {
            setIsReferenceLoading(false);
        }
    };

    const handleStatusLookup = async () => {
        if (!config) {
            toast.error('Simpan konfigurasi dulu sebelum cek status.');
            return;
        }

        setIsStatusLoading(true);
        setStatusResult(null);

        try {
            const response = await axios.post('/ceisa-settings/status', {
                id_perusahaan: Number(form.id_perusahaan),
                environment: form.environment,
                status_type: statusCheck.status_type,
                nomor_aju: statusCheck.nomor_aju,
                id_perusahaan_ceisa: statusCheck.id_perusahaan_ceisa,
            });
            setStatusResult(response.data);
            toast.success(response.data.message ?? 'Status CEISA berhasil dicek.');
        } catch (error: any) {
            setStatusResult(error?.response?.data ?? null);
            toast.error(error?.response?.data?.message ?? 'Cek status CEISA gagal.');
        } finally {
            setIsStatusLoading(false);
        }
    };

    return (
        <AppSidebarLayout
            breadcrumbs={[
                { title: 'Settings', url: '#' },
                { title: 'CEISA', url: '/ceisa-settings' },
            ]}
        >
            <Head title="CEISA Settings" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">CEISA Settings</h1>
                        <p className="text-muted-foreground text-sm">Konfigurasi API CEISA per perusahaan.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleTest} disabled={isLoading || isSaving || isTesting || !config}>
                            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Test OAuth
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading || isSaving || !form.id_perusahaan}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Simpan
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Scope</CardTitle>
                        <CardDescription>Config ini hanya berlaku untuk perusahaan dan environment yang dipilih.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Perusahaan</Label>
                            <Select value={form.id_perusahaan} onValueChange={(value) => setField('id_perusahaan', value)}>
                                <SelectTrigger>
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
                        <div className="space-y-2">
                            <Label>Environment</Label>
                            <Select value={form.environment} onValueChange={(value) => handleEnvironmentChange(value as Environment)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="development">Development</SelectItem>
                                    <SelectItem value="production">Production</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex h-9 items-center gap-2">
                                <Checkbox
                                    checked={form.is_active}
                                    onCheckedChange={(value) => setField('is_active', Boolean(value))}
                                    id="is_active"
                                />
                                <label htmlFor="is_active" className="text-sm">
                                    Aktif
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gateway & OAuth</CardTitle>
                            <CardDescription>
                                Secret tidak ditampilkan ulang. Isi field secret hanya kalau mau set atau mengganti nilai.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <TextField label="Base URL" value={form.base_url} onChange={(value) => setField('base_url', value)} />
                            <TextField
                                label="Origin URL"
                                value={form.origin_url}
                                onChange={(value) => setField('origin_url', value)}
                                placeholder="https://domain-app"
                            />
                            <SecretField
                                label="API Key"
                                configured={config?.has_api_key}
                                value={form.api_key}
                                onChange={(value) => setField('api_key', value)}
                            />
                            <SecretField
                                label="App ID"
                                configured={config?.has_app_id}
                                value={form.app_id}
                                onChange={(value) => setField('app_id', value)}
                            />
                            <SecretField
                                label="Username CEISA"
                                configured={config?.has_username}
                                value={form.username}
                                onChange={(value) => setField('username', value)}
                            />
                            <SecretField
                                label="Password CEISA"
                                configured={config?.has_password}
                                value={form.password}
                                onChange={(value) => setField('password', value)}
                                type="password"
                            />
                            <TextField label="ID Platform" value={form.id_platform} onChange={(value) => setField('id_platform', value)} />
                            <TextField label="ID Pengguna" value={form.id_pengguna} onChange={(value) => setField('id_pengguna', value)} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ringkasan</CardTitle>
                            <CardDescription>{selectedCompanyName}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex flex-wrap gap-2">
                                <SecretBadge label="API Key" configured={config?.has_api_key} />
                                <SecretBadge label="App ID" configured={config?.has_app_id} />
                                <SecretBadge label="Username" configured={config?.has_username} />
                                <SecretBadge label="Password" configured={config?.has_password} />
                            </div>
                            <SummaryRow label="Last OAuth test" value={formatDate(config?.last_verified_at)} />
                            <SummaryRow label="Last update" value={formatDate(config?.updated_at)} />
                            {config?.last_error && (
                                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                                    <div className="font-medium">Last error</div>
                                    <div className="mt-1 break-words">{config.last_error}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Identitas & Default Dokumen</CardTitle>
                        <CardDescription>
                            Default ini dipakai sebagai bantuan saat membuat payload CEISA, tetap bisa dioverride per shipment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <TextField
                            label="Company Code CEISA"
                            value={form.company_code}
                            onChange={(value) => setField('company_code', value.toUpperCase())}
                            maxLength={6}
                        />
                        <TextField
                            label="Kode Kantor Default"
                            value={form.default_kode_kantor}
                            onChange={(value) => setField('default_kode_kantor', value)}
                            placeholder="070100"
                        />
                        <TextField label="Kode TPS Default" value={form.default_kode_tps} onChange={(value) => setField('default_kode_tps', value)} />
                        <TextField label="NPWP" value={form.npwp} onChange={(value) => setField('npwp', value)} />
                        <TextField label="NPWP 16" value={form.npwp_16} onChange={(value) => setField('npwp_16', value)} />
                        <TextField label="NIB" value={form.nib} onChange={(value) => setField('nib', value)} />
                        <TextField label="Nama PPJK" value={form.ppjk_name} onChange={(value) => setField('ppjk_name', value)} />
                        <TextField label="NPWP PPJK" value={form.ppjk_npwp} onChange={(value) => setField('ppjk_npwp', value)} />
                        <TextField label="NPWP 16 PPJK" value={form.ppjk_npwp_16} onChange={(value) => setField('ppjk_npwp_16', value)} />
                        <TextField label="NIB PPJK" value={form.ppjk_nib} onChange={(value) => setField('ppjk_nib', value)} />
                        <TextField
                            label="Nama TTD Default"
                            value={form.default_signer_name}
                            onChange={(value) => setField('default_signer_name', value)}
                        />
                        <TextField
                            label="Jabatan TTD Default"
                            value={form.default_signer_title}
                            onChange={(value) => setField('default_signer_title', value)}
                        />
                        <TextField
                            label="Kota TTD Default"
                            value={form.default_signer_city}
                            onChange={(value) => setField('default_signer_city', value)}
                        />
                        <div className="space-y-2 md:col-span-2">
                            <Label>Alamat PPJK</Label>
                            <Textarea value={form.ppjk_address} onChange={(event) => setField('ppjk_address', event.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>CEISA Diagnostics</CardTitle>
                        <CardDescription>Cek endpoint CEISA ringan dari konfigurasi perusahaan ini sebelum masuk ke submit dokumen.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 xl:grid-cols-2">
                        <section className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold">Cek Referensi</h2>
                                    <p className="text-muted-foreground text-sm">{selectedReferenceOption.description}</p>
                                </div>
                                <Database className="text-muted-foreground mt-1 h-5 w-5 shrink-0" />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Jenis Referensi</Label>
                                    <Select
                                        value={referenceLookup.lookup_type}
                                        onValueChange={(value) => handleReferenceTypeChange(value as ReferenceLookupType)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {referenceOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedReferenceOption.fields.map((field) => (
                                    <TextField
                                        key={field.key}
                                        label={`${field.label}${field.optional ? ' (opsional)' : ''}`}
                                        value={referenceLookup.params[field.key] ?? ''}
                                        onChange={(value) => setReferenceParam(field.key, value)}
                                        placeholder={field.placeholder}
                                        type={field.type}
                                    />
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={referenceLookup.force_refresh}
                                        onCheckedChange={(value) => setReferenceLookup((current) => ({ ...current, force_refresh: Boolean(value) }))}
                                    />
                                    Abaikan cache
                                </label>
                                <Button variant="outline" onClick={handleReferenceLookup} disabled={!config || isReferenceLoading}>
                                    {isReferenceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    Cek Referensi
                                </Button>
                            </div>

                            <ReferenceResultSummary value={referenceResult} />
                            <JsonPreview value={referenceResult} />
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold">Cek Status</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Gunakan nomor aju tertentu, atau cek status daftar dokumen berdasarkan NPWP konfigurasi.
                                    </p>
                                </div>
                                <FileSearch className="text-muted-foreground mt-1 h-5 w-5 shrink-0" />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Mode</Label>
                                    <Select
                                        value={statusCheck.status_type}
                                        onValueChange={(value) =>
                                            setStatusCheck((current) => ({ ...current, status_type: value as StatusCheckType }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="nomor_aju">Nomor Aju</SelectItem>
                                            <SelectItem value="company">Perusahaan / NPWP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {statusCheck.status_type === 'nomor_aju' ? (
                                    <div className="md:col-span-2">
                                        <TextField
                                            label="Nomor Aju"
                                            value={statusCheck.nomor_aju}
                                            onChange={(value) => setStatusCheck((current) => ({ ...current, nomor_aju: value }))}
                                            placeholder="26 digit nomor aju"
                                            maxLength={32}
                                        />
                                    </div>
                                ) : (
                                    <div className="md:col-span-2">
                                        <TextField
                                            label="ID Perusahaan CEISA / NPWP (opsional)"
                                            value={statusCheck.id_perusahaan_ceisa}
                                            onChange={(value) => setStatusCheck((current) => ({ ...current, id_perusahaan_ceisa: value }))}
                                            placeholder="Kosongkan untuk pakai NPWP di config"
                                            maxLength={32}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button variant="outline" onClick={handleStatusLookup} disabled={!config || isStatusLoading}>
                                    {isStatusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
                                    Cek Status
                                </Button>
                            </div>

                            <StatusResultSummary value={statusResult} />
                            <JsonPreview value={statusResult} />
                        </section>
                    </CardContent>
                </Card>
            </div>
        </AppSidebarLayout>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    maxLength,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    type?: string;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
        </div>
    );
}

function SecretField({
    label,
    configured,
    value,
    onChange,
    type = 'text',
}: {
    label: string;
    configured?: boolean;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'password';
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <Label>{label}</Label>
                {configured && (
                    <Badge variant="outline" className="gap-1">
                        <EyeOff className="h-3 w-3" />
                        Tersimpan
                    </Badge>
                )}
            </div>
            <Input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={configured ? 'Kosongkan jika tidak diganti' : 'Belum diisi'}
                autoComplete="new-password"
            />
        </div>
    );
}

function SecretBadge({ label, configured }: { label: string; configured?: boolean }) {
    return (
        <Badge variant={configured ? 'secondary' : 'outline'} className="gap-1">
            {configured ? <CheckCircle2 className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {label}: {configured ? 'set' : 'kosong'}
        </Badge>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-b-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );
}

function ReferenceResultSummary({ value }: { value: any }) {
    if (!value) return null;

    const result = unwrapResult(value);
    const rows = extractReferenceRows(value);

    return (
        <div className="border-border bg-muted/20 space-y-3 rounded-md border p-3">
            <ResultMeta result={result} title="Ringkasan Referensi" />
            <div className="text-muted-foreground text-xs">
                {rows.length ? `${rows.length} baris pertama ditampilkan.` : 'Tidak ada baris referensi.'}
            </div>
            {rows.length > 0 && (
                <div className="grid gap-2">
                    {rows.slice(0, 5).map((row, index) => (
                        <div key={index} className="border-border bg-background grid gap-2 rounded-md border p-3 text-xs md:grid-cols-2">
                            {Object.entries(row)
                                .slice(0, 8)
                                .map(([key, rowValue]) => (
                                    <SummaryField key={key} label={key} value={formatRecordValue(rowValue)} />
                                ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusResultSummary({ value }: { value: any }) {
    if (!value) return null;

    const result = unwrapResult(value);
    const rows = extractStatusRows(value);
    const internalLog = value?.internal_log;

    return (
        <div className="border-border bg-muted/20 space-y-3 rounded-md border p-3">
            <ResultMeta result={result} title="Ringkasan Status" />
            {internalLog && (
                <div
                    className={`rounded-md border p-3 text-xs ${
                        internalLog.persisted ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'
                    }`}
                >
                    <div className="font-medium">{internalLog.persisted ? 'Tersimpan ke log internal' : 'Tidak disimpan ke log internal'}</div>
                    <div className="text-muted-foreground mt-1">
                        {internalLog.persisted
                            ? `Submission #${internalLog.ceisa_submission_id}, status ${internalLog.status}, ${internalLog.status_log_count} log.`
                            : (internalLog.reason ?? 'Nomor aju tidak cocok dengan submission internal.')}
                    </div>
                </div>
            )}
            <div className="text-muted-foreground text-xs">
                {rows.length ? `${rows.length} status/respon ditemukan.` : 'Tidak ada status/respon.'}
            </div>
            {rows.length > 0 && (
                <div className="grid gap-2">
                    {rows.slice(0, 5).map((row, index) => (
                        <div key={index} className="border-border bg-background rounded-md border p-3 text-xs">
                            <div className="grid gap-2 md:grid-cols-2">
                                <SummaryField label="nomorAju" value={pickRecordValue(row, ['nomorAju', 'nomor_aju'])} />
                                <SummaryField label="nomorDaftar" value={pickRecordValue(row, ['nomorDaftar', 'nomor_daftar'])} />
                                <SummaryField label="tanggalDaftar" value={pickRecordValue(row, ['tanggalDaftar', 'tanggal_daftar'])} />
                                <SummaryField label="kodeProses/status" value={pickRecordValue(row, ['kodeProses', 'kodeStatus', 'status'])} />
                                <SummaryField label="waktuStatus" value={pickRecordValue(row, ['waktuStatus', 'waktu_status'])} />
                                <SummaryField label="keterangan" value={pickRecordValue(row, ['keterangan', 'uraian', 'message'])} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ResultMeta({ result, title }: { result: any; title: string }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{title}</span>
                <Badge variant={result?.ok ? 'secondary' : 'destructive'}>{result?.ok ? 'OK' : 'Gagal'}</Badge>
                {result?.cached && <Badge variant="outline">cache</Badge>}
            </div>
            <div className="grid gap-2 text-xs md:grid-cols-2">
                <SummaryField label="HTTP" value={result?.http_status ?? '-'} />
                <SummaryField label="Body status" value={result?.body_status ?? '-'} />
                <SummaryField label="Message" value={result?.message ?? '-'} />
                <SummaryField label="Nomor aju" value={result?.nomor_aju ?? '-'} />
            </div>
        </div>
    );
}

function SummaryField({ label, value }: { label: string; value: any }) {
    return (
        <div className="min-w-0">
            <div className="text-muted-foreground">{label}</div>
            <div className="font-medium break-words">{formatRecordValue(value)}</div>
        </div>
    );
}

function JsonPreview({ value }: { value: any }) {
    if (!value) {
        return (
            <div className="border-border bg-muted/30 text-muted-foreground flex min-h-32 items-center justify-center rounded-md border p-4 text-sm">
                Belum ada hasil.
            </div>
        );
    }

    return (
        <pre className="border-border bg-muted/30 max-h-80 overflow-auto rounded-md border p-4 text-xs leading-relaxed break-words whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
        </pre>
    );
}

function unwrapResult(value: any) {
    return value?.result ?? value;
}

function extractReferenceRows(value: any): Record<string, any>[] {
    const result = unwrapResult(value);
    const payload = result?.data ?? result;

    return firstRecordList(payload, ['data', 'item', 'result', 'items']);
}

function extractStatusRows(value: any): Record<string, any>[] {
    const result = unwrapResult(value);
    const payload = result?.data ?? result;

    return [
        ...firstRecordList(payload, ['dataStatus', 'data.dataStatus', 'item.dataStatus']),
        ...firstRecordList(payload, ['dataRespon', 'data.dataRespon', 'item.dataRespon']),
    ];
}

function firstRecordList(payload: any, paths: string[]): Record<string, any>[] {
    if (Array.isArray(payload)) {
        return payload.filter((item) => item && typeof item === 'object');
    }

    for (const path of paths) {
        const value = getPath(payload, path);

        if (Array.isArray(value)) {
            return value.filter((item) => item && typeof item === 'object');
        }

        if (value && typeof value === 'object') {
            return [value];
        }
    }

    return [];
}

function getPath(source: any, path: string) {
    return path.split('.').reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), source);
}

function pickRecordValue(record: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        const value = getPath(record, key);
        if (value !== undefined && value !== null && value !== '') return value;
    }

    return '-';
}

function formatRecordValue(value: any) {
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);

    return JSON.stringify(value);
}

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
