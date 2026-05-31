/* eslint-disable @typescript-eslint/no-explicit-any */
// m_customer/page.tsx

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Pastikan komponen ini ada
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types'; // Asumsi base types ada di sini
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table'; // Asumsi Anda punya komponen DataTable yang sama

// 1. Definisi Tipe Data Customer sesuai Database/Controller
export interface Customer {
    id_customer: number;
    id?: number;
    nama_perusahaan: string;
    type: string;
    email_to?: string[];
    email_cc?: string[];
    nama: string; // Nama PIC
    no_telp?: string;
    kota?: string;
    no_npwp?: string;
    no_npwp_16?: string;
    ceisa_importir_preset?: {
        id: number;
        name?: string;
        npwp?: string;
        npwp_16?: string;
        nitku?: string;
        nib?: string;
        address?: string;
        kode_jenis_identitas?: string;
        kode_status?: string;
        kode_jenis_api?: string;
        default_kode_cara_bayar?: string;
        default_kode_jenis_impor?: string;
        default_kode_tutup_pu?: string;
        default_ndpbm?: string | number | null;
    } | null;
    perusahaan?: {
        id_perusahaan: number;
        nama_perusahaan: string;
    };
    created_at: string;
}

// Interface untuk Props yang dikirim dari Controller
interface CustomerPageProps extends PageProps {
    customers: Customer[]; // Pastikan di controller index() Anda me-return data ini
    perusahaan_list?: { id_perusahaan: number; nama_perusahaan: string }[];
    selectedCompanyId?: number | null;
    trans_customer: Record<string, string>;
}

const normalizeNumericCeisaCode = (value: unknown, allowed: string[], fallback: string) => {
    const raw = String(value ?? '').trim();
    const match = raw.match(/^\d+/);
    const normalized = match ? String(Number(match[0])) : raw;

    return allowed.includes(normalized) ? normalized : fallback;
};

export default function ManageCustomers() {
    // Ambil semua data sekaligus dari usePage
    const { customers, flash, perusahaan_list, selectedCompanyId, auth, trans_customer, trans_general } = usePage<CustomerPageProps & any>().props;

    const trans = trans_general as Record<string, string>;
    const isAdmin = auth.user?.roles?.some((role: any) => role.name === 'admin');

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_customer.breadcrumb_master || 'Master Data',
            href: '#',
        },
        {
            title: trans_customer.breadcrumb_customer || 'Customer',
            href: '/customer',
        },
    ];

    // --- State untuk Modal Delete ---
    const [openDelete, setOpenDelete] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    // --- State Edit (Modal & Form Data) ---
    const [openEdit, setOpenEdit] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialFormState = {
        nama_perusahaan: '',
        type: '',
        nama: '',
        no_npwp: '',
        no_npwp_16: '',
        id_perusahaan: selectedCompanyId ? String(selectedCompanyId) : '',
        ceisa_name: '',
        ceisa_address: '',
        ceisa_npwp: '',
        ceisa_npwp_16: '',
        ceisa_nitku: '',
        ceisa_nib: '',
        ceisa_kode_jenis_identitas: '6',
        ceisa_kode_status: '01',
        ceisa_kode_jenis_api: '01',
        ceisa_default_kode_cara_bayar: '2',
        ceisa_default_kode_jenis_impor: '1',
        ceisa_default_kode_tutup_pu: '11',
        ceisa_default_ndpbm: '',
    };
    const [emailsTo, setEmailsTo] = useState<string[]>([]);
    const [inputTo, setInputTo] = useState('');

    const [emailsCc, setEmailsCc] = useState<string[]>([]);
    const [inputCc, setInputCc] = useState('');

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const addEmail = (value: string, emails: string[], setEmails: any) => {
        const email = value.trim().toLowerCase();

        if (!email) return;
        if (!isValidEmail(email)) return;
        if (emails.includes(email)) return;

        setEmails([...emails, email]);
    };

    const removeEmail = (index: number, emails: string[], setEmails: any) => {
        setEmails(emails.filter((_, i) => i !== index));
    };

    const [formData, setFormData] = useState({
        id_customer: 0, // Hanya untuk edit
        ...initialFormState,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const digitsOnly = (value: string) => value.replace(/\D+/g, '');

    const toNpwp16 = (value: string) => {
        const digits = digitsOnly(value);

        return digits.length === 15 ? `0${digits}` : digits;
    };

    const toNitku = (value: string) => {
        const npwp16 = toNpwp16(value);

        return npwp16 ? `${npwp16}00000` : '';
    };

    const fillCeisaFromCustomer = () => {
        setFormData((prev) => {
            const npwp16 = toNpwp16(prev.ceisa_npwp_16 || prev.no_npwp_16 || prev.no_npwp);

            return {
                ...prev,
                ceisa_name: prev.ceisa_name || prev.nama_perusahaan,
                ceisa_npwp: prev.ceisa_npwp || digitsOnly(prev.no_npwp),
                ceisa_npwp_16: prev.ceisa_npwp_16 || npwp16,
                ceisa_nitku: prev.ceisa_nitku || toNitku(npwp16),
            };
        });
    };

    const buildSubmitPayload = () => ({
        ...formData,
        ceisa: {
            name: formData.ceisa_name,
            address: formData.ceisa_address,
            npwp: formData.ceisa_npwp,
            npwp_16: formData.ceisa_npwp_16,
            nitku: formData.ceisa_nitku,
            nib: formData.ceisa_nib,
            kode_jenis_identitas: formData.ceisa_kode_jenis_identitas,
            kode_status: formData.ceisa_kode_status,
            kode_jenis_api: formData.ceisa_kode_jenis_api,
            default_kode_cara_bayar: formData.ceisa_default_kode_cara_bayar,
            default_kode_jenis_impor: formData.ceisa_default_kode_jenis_impor,
            default_kode_tutup_pu: formData.ceisa_default_kode_tutup_pu,
            default_ndpbm: formData.ceisa_default_ndpbm,
        },
    });

    const handleCreateClick = () => {
        if (!auth.user.permissions.includes('create-customer')) {
            toast.error(trans_customer.toast_update_permission_error || 'Anda tidak memiliki izin untuk menambahkan customer.');
            return;
        }
        resetCustomerForm();
        setOpenCreate(true);
    };

    const resetCustomerForm = () => {
        setFormData({ id_customer: 0, ...initialFormState });
        setEmailsTo([]);
        setEmailsCc([]);
        setInputTo('');
        setInputCc('');
        setIsSubmitting(false);
    };

    const validateCustomerForm = () => {
        if (!formData.nama_perusahaan.trim()) {
            toast.error(trans_customer.validation_company_name_required || 'Nama perusahaan wajib diisi.');
            return false;
        }

        if (!formData.type) {
            toast.error(trans_customer.validation_type_required || 'Tipe pelanggan wajib dipilih.');
            return false;
        }

        if (!formData.nama.trim()) {
            toast.error(trans_customer.validation_pic_name_required || 'Nama PIC wajib diisi.');
            return false;
        }

        return true;
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateCustomerForm()) return;

        setIsSubmitting(true);

        const payload = {
            ...buildSubmitPayload(),
            email_to: emailsTo,
            email_cc: emailsCc,
        };
        router.post(route('customer.store'), payload, {
            onSuccess: () => {
                setOpenCreate(false);
                setIsSubmitting(false);
                setFormData({ id_customer: 0, ...initialFormState });
                toast.success(trans_customer.toast_create_success || 'Customer created successfully!');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Error creating:', errors);
                toast.error('Gagal menambahkan data. Periksa input Anda.');
            },
        });
    };

    // 1. Edit Handler: Redirect ke halaman Edit
    const onEditClick = (customer: Customer) => {
        if (!auth.user.permissions.includes('update-customer')) {
            toast.error(trans_customer.toast_update_permission_error || 'Anda tidak memiliki izin untuk mengedit customer.');
            return;
        }

        setEmailsTo(customer.email_to || []);
        setEmailsCc(customer.email_cc || []);
        const ceisa = customer.ceisa_importir_preset;
        setFormData({
            id_customer: customer.id_customer || customer.id || 0,
            nama_perusahaan: customer.nama_perusahaan || '',
            type: customer.type || 'external',
            nama: customer.nama || '',
            no_npwp: customer.no_npwp || '',
            no_npwp_16: customer.no_npwp_16 || '',
            id_perusahaan: customer.perusahaan?.id_perusahaan?.toString() || (selectedCompanyId ? String(selectedCompanyId) : ''),
            ceisa_name: ceisa?.name || customer.nama_perusahaan || '',
            ceisa_address: ceisa?.address || '',
            ceisa_npwp: ceisa?.npwp || customer.no_npwp || '',
            ceisa_npwp_16: ceisa?.npwp_16 || customer.no_npwp_16 || '',
            ceisa_nitku: ceisa?.nitku || toNitku(ceisa?.npwp_16 || customer.no_npwp_16 || customer.no_npwp || ''),
            ceisa_nib: ceisa?.nib || '',
            ceisa_kode_jenis_identitas: ceisa?.kode_jenis_identitas || '6',
            ceisa_kode_status: ceisa?.kode_status || '01',
            ceisa_kode_jenis_api: ceisa?.kode_jenis_api || '01',
            ceisa_default_kode_cara_bayar: normalizeNumericCeisaCode(
                ceisa?.default_kode_cara_bayar,
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
                '2',
            ),
            ceisa_default_kode_jenis_impor: normalizeNumericCeisaCode(ceisa?.default_kode_jenis_impor, ['1', '2', '5', '9'], '1'),
            ceisa_default_kode_tutup_pu: normalizeNumericCeisaCode(ceisa?.default_kode_tutup_pu, ['11', '12', '14'], '11'),
            ceisa_default_ndpbm: ceisa?.default_ndpbm ? String(ceisa.default_ndpbm) : '',
        });
        setOpenEdit(true);
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateCustomerForm()) return;
        setIsSubmitting(true);

        const payload = {
            ...buildSubmitPayload(),
            email_to: emailsTo,
            email_cc: emailsCc,
        };
        router.put(route('customer.update', formData.id_customer), payload, {
            onSuccess: () => {
                setOpenEdit(false);
                setIsSubmitting(false);
                toast.success(trans_customer.toast_update_success || 'Customer updated successfully!');
            },
            onError: (errors) => {
                setIsSubmitting(false);
                console.error('Error updating:', errors);
                toast.error('Gagal memperbarui data.');
            },
        });
    };

    // 3. DELETE Handler
    const onDeleteClick = (customer: Customer) => {
        if (!auth.user.permissions.includes('delete-customer')) {
            toast.error(trans_customer.toast_update_permission_error || 'Anda tidak memiliki izin untuk menghapus customer.');
            return;
        }
        setCustomerToDelete(customer);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (customerToDelete) {
            const id = customerToDelete.id_customer || customerToDelete.id;
            router.delete(route('customer.destroy', id), {
                onSuccess: () => {
                    setOpenDelete(false);
                    setCustomerToDelete(null);
                    toast.success(trans_customer.toast_delete_success || 'Customer deleted successfully!');
                },
                onError: () => toast.error('Gagal menghapus data.'),
            });
        }
    };

    const renderCeisaProfileFields = () => (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-foreground text-sm font-bold">CEISA Importir Profile</h3>
                    <p className="text-muted-foreground text-xs">Data ini dipakai otomatis saat membuat draft CEISA untuk customer ini.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={fillCeisaFromCustomer}>
                    Salin data umum
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_name" className="text-foreground font-semibold">
                        Nama Importir/Eksportir
                    </Label>
                    <Input
                        id="ceisa_name"
                        value={formData.ceisa_name}
                        onChange={(e) => handleInputChange('ceisa_name', e.target.value)}
                        placeholder="PT. Contoh Importir"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_nib" className="text-foreground font-semibold">
                        NIB/API
                    </Label>
                    <Input
                        id="ceisa_nib"
                        value={formData.ceisa_nib}
                        onChange={(e) => handleInputChange('ceisa_nib', e.target.value)}
                        placeholder="Nomor NIB/API"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_npwp" className="text-foreground font-semibold">
                        NPWP
                    </Label>
                    <Input
                        id="ceisa_npwp"
                        value={formData.ceisa_npwp}
                        onChange={(e) => handleInputChange('ceisa_npwp', e.target.value)}
                        placeholder="15 digit"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_npwp_16" className="text-foreground font-semibold">
                        NPWP 16 Digit
                    </Label>
                    <Input
                        id="ceisa_npwp_16"
                        value={formData.ceisa_npwp_16}
                        onChange={(e) => handleInputChange('ceisa_npwp_16', e.target.value)}
                        onBlur={(e) => {
                            const npwp16 = toNpwp16(e.target.value);
                            handleInputChange('ceisa_npwp_16', npwp16);
                            if (!formData.ceisa_nitku) handleInputChange('ceisa_nitku', toNitku(npwp16));
                        }}
                        placeholder="16 digit"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_nitku" className="text-foreground font-semibold">
                        NITKU
                    </Label>
                    <Input
                        id="ceisa_nitku"
                        value={formData.ceisa_nitku}
                        onChange={(e) => handleInputChange('ceisa_nitku', e.target.value)}
                        placeholder="NPWP16 + 00000"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
            </div>

            <div className="mt-4 grid gap-2">
                <Label htmlFor="ceisa_address" className="text-foreground font-semibold">
                    Alamat Importir/Eksportir
                </Label>
                <Textarea
                    id="ceisa_address"
                    value={formData.ceisa_address}
                    onChange={(e) => handleInputChange('ceisa_address', e.target.value)}
                    placeholder="Alamat sesuai CEISA"
                    className="border-input bg-background text-foreground min-h-20"
                />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label className="text-foreground font-semibold">Jenis Identitas</Label>
                    <Select value={formData.ceisa_kode_jenis_identitas} onValueChange={(val) => handleInputChange('ceisa_kode_jenis_identitas', val)}>
                        <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6">6 - NPWP 16 DIGIT</SelectItem>
                            <SelectItem value="5">5 - NPWP 15 DIGIT</SelectItem>
                            <SelectItem value="3">3 - PASPOR</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-foreground font-semibold">Status Importir</Label>
                    <Select value={formData.ceisa_kode_status} onValueChange={(val) => handleInputChange('ceisa_kode_status', val)}>
                        <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="01">01</SelectItem>
                            <SelectItem value="02">02</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-foreground font-semibold">Jenis API</Label>
                    <Select value={formData.ceisa_kode_jenis_api} onValueChange={(val) => handleInputChange('ceisa_kode_jenis_api', val)}>
                        <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="01">01</SelectItem>
                            <SelectItem value="02">02</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_default_kode_cara_bayar" className="text-foreground font-semibold">
                        Cara Bayar
                    </Label>
                    <Select
                        value={formData.ceisa_default_kode_cara_bayar}
                        onValueChange={(value) => handleInputChange('ceisa_default_kode_cara_bayar', value)}
                    >
                        <SelectTrigger id="ceisa_default_kode_cara_bayar" className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 - BIASA/TUNAI</SelectItem>
                            <SelectItem value="2">2 - BERKALA</SelectItem>
                            <SelectItem value="3">3 - DENGAN JAMINAN</SelectItem>
                            <SelectItem value="4">4 - PERHITUNGAN KEMUDIAN</SelectItem>
                            <SelectItem value="5">5 - KONSINYASI</SelectItem>
                            <SelectItem value="6">6 - USANCE L/C</SelectItem>
                            <SelectItem value="7">7 - RED CLAUSE L/C</SelectItem>
                            <SelectItem value="8">8 - INTER-COMPANY ACCOUNT</SelectItem>
                            <SelectItem value="9">9 - GABUNGAN/LAINNYA</SelectItem>
                            <SelectItem value="10">10 - OPEN ACCOUNT BERTAHAP</SelectItem>
                            <SelectItem value="11">11 - OPEN ACCOUNT TUNAI</SelectItem>
                            <SelectItem value="12">12 - BAYAR TUNAI DI DN</SelectItem>
                            <SelectItem value="13">13 - BAYAR TELEGRAPH DI DN</SelectItem>
                            <SelectItem value="14">14 - TANPA PEMBAYARAN</SelectItem>
                            <SelectItem value="15">15 - ADVANCE PAYMENT</SelectItem>
                            <SelectItem value="16">16 - SIGHT L/C</SelectItem>
                            <SelectItem value="17">17 - INKASO</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_default_kode_jenis_impor" className="text-foreground font-semibold">
                        Jenis Impor
                    </Label>
                    <Select
                        value={formData.ceisa_default_kode_jenis_impor}
                        onValueChange={(value) => handleInputChange('ceisa_default_kode_jenis_impor', value)}
                    >
                        <SelectTrigger id="ceisa_default_kode_jenis_impor" className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 - UNTUK DIPAKAI</SelectItem>
                            <SelectItem value="2">2 - SEMENTARA</SelectItem>
                            <SelectItem value="5">5 - PELAYANAN SEGERA</SelectItem>
                            <SelectItem value="9">9 - GABUNGAN</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_default_kode_tutup_pu" className="text-foreground font-semibold">
                        Tutup PU
                    </Label>
                    <Select
                        value={formData.ceisa_default_kode_tutup_pu}
                        onValueChange={(value) => handleInputChange('ceisa_default_kode_tutup_pu', value)}
                    >
                        <SelectTrigger id="ceisa_default_kode_tutup_pu" className="border-input bg-background text-foreground h-11 sm:h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="11">11 - BC 1.1</SelectItem>
                            <SelectItem value="12">12 - BC 1.2</SelectItem>
                            <SelectItem value="14">14 - BC 1.4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="ceisa_default_ndpbm" className="text-foreground font-semibold">
                        NDPBM Default
                    </Label>
                    <Input
                        id="ceisa_default_ndpbm"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={formData.ceisa_default_ndpbm}
                        onChange={(e) => handleInputChange('ceisa_default_ndpbm', e.target.value)}
                        placeholder="Opsional"
                        className="border-input bg-background text-foreground h-11 sm:h-10"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={trans_customer.page_title || 'Manage Customers'} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{trans_customer.header_title || 'Customer Data'}</h1>
                        <p className="text-muted-foreground text-sm">
                            {trans_customer.header_desc || 'Manage your customers and partner companies.'}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="">
                    <DataTable
                        columns={columns(onEditClick, onDeleteClick, trans_customer)}
                        data={customers || []}
                        onCreateClick={handleCreateClick}
                    />
                </div>
            </div>

            {/* --- MODAL CREATE CUSTOMER --- */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="border-border bg-background text-foreground max-h-[95vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-4xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold">{trans_customer.title_create || 'Add New Customer'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {trans_customer.desc_create || 'Enter the detail information of the new customer.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="mt-2 space-y-4 py-2">
                        {/* Nama Perusahaan */}
                        <div className="grid gap-2">
                            <Label htmlFor="create_nama_perusahaan" className="text-foreground font-semibold">
                                {trans_customer.label_company_name} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="create_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                                placeholder={trans_customer.placeholder_company_name}
                                className="border-input bg-background text-foreground focus-visible:ring-primary h-11 sm:h-10"
                            />
                        </div>

                        {/* Perusahaan Dropdown (Owner) - Khusus Admin */}
                        {isAdmin && (
                            <div className="grid gap-2">
                                <Label htmlFor="create_id_perusahaan" className="text-foreground font-semibold">
                                    {trans_customer.label_owner_company || 'Owner Company'} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formData.id_perusahaan} onValueChange={(val) => handleInputChange('id_perusahaan', val)}>
                                    <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                                        <SelectValue placeholder={trans_customer.placeholder_owner_company || 'Select Owner Company'} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover text-popover-foreground border-border">
                                        {perusahaan_list?.map((p) => (
                                            <SelectItem key={p.id_perusahaan} value={p.id_perusahaan.toString()}>
                                                {p.nama_perusahaan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Tipe */}
                        <div className="grid gap-2">
                            <Label htmlFor="create_type" className="text-foreground font-semibold">
                                {trans_customer.label_type} <span className="text-destructive">*</span>
                            </Label>
                            <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                                    <SelectValue placeholder={trans_customer.placeholder_type} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover text-popover-foreground border-border">
                                    <SelectItem value="external">External</SelectItem>
                                    <SelectItem value="internal">Internal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>
                                Email To <span className="text-destructive">*</span>
                            </Label>

                            <div className="flex flex-wrap gap-2 rounded border p-2">
                                {emailsTo.map((email, index) => (
                                    <div key={index} className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 dark:text-black">
                                        <span>{email}</span>
                                        <button type="button" onClick={() => removeEmail(index, emailsTo, setEmailsTo)}>
                                            x
                                        </button>
                                    </div>
                                ))}

                                <input
                                    value={inputTo}
                                    onChange={(e) => setInputTo(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                            e.preventDefault();
                                            addEmail(inputTo, emailsTo, setEmailsTo);
                                            setInputTo('');
                                        }
                                    }}
                                    className="flex-1 outline-none"
                                />
                            </div>
                            <span className="text-muted-foreground text-xs">{trans.note_email}</span>
                        </div>
                        <div className="grid gap-2">
                            <Label>Email CC</Label>

                            <div className="flex flex-wrap gap-2 rounded border p-2">
                                {emailsCc.map((email, index) => (
                                    <div key={index} className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 dark:text-black">
                                        <span>{email}</span>
                                        <button type="button" onClick={() => removeEmail(index, emailsCc, setEmailsCc)}>
                                            x
                                        </button>
                                    </div>
                                ))}

                                <input
                                    value={inputCc}
                                    onChange={(e) => setInputCc(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                            e.preventDefault();
                                            addEmail(inputCc, emailsCc, setEmailsCc);
                                            setInputCc('');
                                        }
                                    }}
                                    className="flex-1 outline-none"
                                />
                            </div>
                            <span className="text-muted-foreground text-xs">{trans.note_email}</span>
                        </div>

                        {/* PIC Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="create_nama" className="text-foreground font-semibold">
                                {trans_customer.label_pic_name} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="create_nama"
                                value={formData.nama}
                                onChange={(e) => handleInputChange('nama', e.target.value)}
                                required
                                placeholder={trans_customer.placeholder_pic_name}
                                className="border-input bg-background text-foreground h-11 sm:h-10"
                            />
                        </div>

                        {/* NPWP Section */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create_no_npwp" className="text-foreground font-semibold">
                                    {trans_customer.label_npwp_15}
                                </Label>
                                <Input
                                    id="create_no_npwp"
                                    value={formData.no_npwp}
                                    onChange={(e) => handleInputChange('no_npwp', e.target.value)}
                                    placeholder="15 Digits"
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create_no_npwp_16" className="text-foreground font-semibold">
                                    {trans_customer.label_npwp_16}
                                </Label>
                                <Input
                                    id="create_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                    placeholder="16 Digits"
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        {renderCeisaProfileFields()}

                        {/* Footer: Responsif Mobile (Stacked) & Dark Mode Compatible Buttons */}
                        <DialogFooter className="flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 w-full sm:h-10 sm:w-auto"
                                >
                                    {trans_customer.btn_cancel || 'Cancel'}
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md transition-all active:scale-[0.98] sm:h-10 sm:w-auto"
                            >
                                {isSubmitting ? trans_customer.btn_saving || 'Saving...' : trans_customer.btn_save || 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL EDIT CUSTOMER --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="border-border bg-background text-foreground max-h-[95vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-4xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold">{trans_customer.title_edit || 'Edit Customer'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {trans_customer.desc_edit || 'Update customer detail information below.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateSubmit} className="mt-2 space-y-4 py-2">
                        {/* Nama Perusahaan */}
                        <div className="grid gap-2">
                            <Label htmlFor="edit_nama_perusahaan" className="text-foreground font-semibold">
                                {trans_customer.label_company_name} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                                className="border-input bg-background text-foreground focus-visible:ring-primary h-11 sm:h-10"
                            />
                        </div>

                        {/* Perusahaan Dropdown (Owner) - Khusus Admin */}
                        {isAdmin && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit_id_perusahaan" className="text-foreground font-semibold">
                                    {trans_customer.label_owner_company || 'Owner Company'} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formData.id_perusahaan} onValueChange={(val) => handleInputChange('id_perusahaan', val)}>
                                    <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                                        <SelectValue placeholder={trans_customer.placeholder_owner_company || 'Select Owner Company'} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover text-popover-foreground border-border">
                                        {perusahaan_list?.map((p) => (
                                            <SelectItem key={p.id_perusahaan} value={p.id_perusahaan.toString()}>
                                                {p.nama_perusahaan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Tipe */}
                        <div className="grid gap-2">
                            <Label htmlFor="edit_type" className="text-foreground font-semibold">
                                {trans_customer.label_type} <span className="text-destructive">*</span>
                            </Label>
                            <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                <SelectTrigger className="border-input bg-background text-foreground h-11 sm:h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover text-popover-foreground border-border">
                                    <SelectItem value="internal">Internal</SelectItem>
                                    <SelectItem value="external">External</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>
                                Email To <span className="text-destructive">*</span>
                            </Label>

                            <div className="flex flex-wrap gap-2 rounded border p-2">
                                {emailsTo.map((email, index) => (
                                    <div key={index} className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 dark:text-black">
                                        <span>{email}</span>
                                        <button type="button" onClick={() => removeEmail(index, emailsTo, setEmailsTo)}>
                                            x
                                        </button>
                                    </div>
                                ))}

                                <input
                                    value={inputTo}
                                    onChange={(e) => setInputTo(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                            e.preventDefault();
                                            addEmail(inputTo, emailsTo, setEmailsTo);
                                            setInputTo('');
                                        }
                                    }}
                                    className="flex-1 outline-none"
                                />
                            </div>
                            <span className="text-muted-foreground text-xs">{trans.note_email}</span>
                        </div>
                        <div className="grid gap-2">
                            <Label>Email CC</Label>

                            <div className="flex flex-wrap gap-2 rounded border p-2">
                                {emailsCc.map((email, index) => (
                                    <div key={index} className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 dark:text-black">
                                        <span>{email}</span>
                                        <button type="button" onClick={() => removeEmail(index, emailsCc, setEmailsCc)}>
                                            x
                                        </button>
                                    </div>
                                ))}

                                <input
                                    value={inputCc}
                                    onChange={(e) => setInputCc(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                            e.preventDefault();
                                            addEmail(inputCc, emailsCc, setEmailsCc);
                                            setInputCc('');
                                        }
                                    }}
                                    className="flex-1 outline-none"
                                />
                            </div>
                            <span className="text-muted-foreground text-xs">{trans.note_email}</span>
                        </div>

                        {/* PIC Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="edit_nama" className="text-foreground font-semibold">
                                {trans_customer.label_pic_name} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_nama"
                                value={formData.nama}
                                onChange={(e) => handleInputChange('nama', e.target.value)}
                                required
                                className="border-input bg-background text-foreground h-11 sm:h-10"
                            />
                        </div>

                        {/* NPWP Section */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_no_npwp" className="text-foreground font-semibold">
                                    {trans_customer.label_npwp_15}
                                </Label>
                                <Input
                                    id="edit_no_npwp"
                                    value={formData.no_npwp}
                                    onChange={(e) => handleInputChange('no_npwp', e.target.value)}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_no_npwp_16" className="text-foreground font-semibold">
                                    {trans_customer.label_npwp_16}
                                </Label>
                                <Input
                                    id="edit_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        {renderCeisaProfileFields()}

                        {/* Footer Actions */}
                        <DialogFooter className="flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 w-full sm:h-10 sm:w-auto"
                                >
                                    {trans_customer.btn_cancel || 'Cancel'}
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md transition-all active:scale-[0.98] sm:h-10 sm:w-auto"
                            >
                                {isSubmitting ? trans_customer.btn_saving || 'Saving...' : trans_customer.btn_save_changes || 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL DELETE --- */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="max-w-[95vw] rounded-xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{trans_customer.title_delete || 'Delete Customer Data'}</DialogTitle>
                        <DialogDescription className="pt-2">
                            {(trans_customer.text_delete_confirm || 'Are you sure you want to delete :name?').replace(
                                ':name',
                                customerToDelete?.nama_perusahaan ?? '',
                            )}
                            <br />
                            <span className="font-semibold text-red-600">{trans_customer.text_permanent || 'This action cannot be undone.'}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-start">
                        <Button type="button" variant="destructive" className="w-full text-white sm:w-auto" onClick={onConfirmDelete}>
                            {trans_customer.btn_confirm_delete || 'Yes, Delete'}
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="w-full sm:w-auto">
                                {trans_customer.btn_cancel || 'Cancel'}
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
