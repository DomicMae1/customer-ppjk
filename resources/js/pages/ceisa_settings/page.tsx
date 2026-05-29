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
import { CheckCircle2, EyeOff, Loader2, Save, ShieldCheck } from 'lucide-react';
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

interface PageProps {
    companies: Company[];
    selectedCompanyId?: number | null;
}

const baseUrlByEnvironment: Record<Environment, string> = {
    development: 'https://apisdev-gw.beacukai.go.id',
    production: 'https://apis-gw.beacukai.go.id',
};

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

    const selectedCompanyName = useMemo(
        () => companies.find((company) => String(company.id_perusahaan) === form.id_perusahaan)?.nama_perusahaan ?? '-',
        [companies, form.id_perusahaan],
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
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
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

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
