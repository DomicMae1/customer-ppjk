/* eslint-disable @typescript-eslint/no-explicit-any */
// m_customer/page.tsx

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Pastikan komponen ini ada
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types'; // Asumsi base types ada di sini
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table'; // Asumsi Anda punya komponen DataTable yang sama

// 1. Definisi Tipe Data Customer sesuai Database/Controller
export interface Customer {
    id_customer: number;
    id?: number;
    nama_perusahaan: string;
    type: string;
    email: string;
    nama: string; // Nama PIC
    no_telp?: string;
    kota?: string;
    no_npwp?: string;
    no_npwp_16?: string;
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
    flash: {
        success?: string;
        error?: string;
    };
    trans_customer: Record<string, string>;
}

export default function ManageCustomers() {
    // Ambil data dari Inertia Props
    const { customers, perusahaan_list, auth, trans_customer } = usePage<CustomerPageProps>().props;
    const isAdmin = auth.user.roles.some((role: any) => role.name === 'admin');

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
        email: '',
        nama: '',
        no_npwp: '',
        no_npwp_16: '',
        id_perusahaan: '',
    };

    const [formData, setFormData] = useState({
        id_customer: 0, // Hanya untuk edit
        ...initialFormState,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateClick = () => {
        setFormData({ id_customer: 0, ...initialFormState }); // Reset form
        setOpenCreate(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(route('customer.store'), formData, {
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
        setFormData({
            id_customer: customer.id_customer || customer.id || 0,
            nama_perusahaan: customer.nama_perusahaan || '',
            type: customer.type || 'external',
            email: customer.email || '',
            nama: customer.nama || '',
            no_npwp: customer.no_npwp || '',
            no_npwp_16: customer.no_npwp_16 || '',
            id_perusahaan: customer.perusahaan?.id_perusahaan?.toString() || '',
        });
        setOpenEdit(true);
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.put(route('customer.update', formData.id_customer), formData, {
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
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{trans_customer.title_create || 'Add New Customer'}</DialogTitle>
                        <DialogDescription>{trans_customer.desc_create || 'Enter the detail information of the new customer.'}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        {/* Nama Perusahaan */}
                        <div className="grid gap-2">
                            <Label htmlFor="create_nama_perusahaan">
                                {trans_customer.label_company_name} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="create_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                                placeholder={trans_customer.placeholder_company_name}
                                className="h-11 sm:h-10"
                            />
                        </div>

                        {/* Perusahaan Dropdown (Owner) - Khusus Admin */}
                        {isAdmin && (
                            <div className="grid gap-2 text-black">
                                <Label htmlFor="create_id_perusahaan">
                                    {trans_customer.label_owner_company || 'Owner Company'} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={formData.id_perusahaan} onValueChange={(val) => handleInputChange('id_perusahaan', val)}>
                                    <SelectTrigger className="h-11 sm:h-10">
                                        <SelectValue placeholder={trans_customer.placeholder_owner_company || 'Select Owner Company'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perusahaan_list?.map((p) => (
                                            <SelectItem key={p.id_perusahaan} value={p.id_perusahaan.toString()}>
                                                {p.nama_perusahaan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Tipe & Email */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create_type">
                                    {trans_customer.label_type} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                    <SelectTrigger className="h-11 sm:h-10">
                                        <SelectValue placeholder={trans_customer.placeholder_type} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="external">External</SelectItem>
                                        <SelectItem value="internal">Internal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create_email">
                                    {trans_customer.label_email} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="create_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    required
                                    placeholder="email@example.com"
                                    className="h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        {/* PIC Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="create_nama">
                                {trans_customer.label_pic_name} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="create_nama"
                                value={formData.nama}
                                onChange={(e) => handleInputChange('nama', e.target.value)}
                                required
                                placeholder={trans_customer.placeholder_pic_name}
                                className="h-11 sm:h-10"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-black sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create_no_npwp">{trans_customer.label_npwp_15}</Label>
                                <Input
                                    id="create_no_npwp"
                                    value={formData.no_npwp}
                                    onChange={(e) => handleInputChange('no_npwp', e.target.value)}
                                    placeholder="15 Digits"
                                    className="h-11 sm:h-10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create_no_npwp_16">{trans_customer.label_npwp_16}</Label>
                                <Input
                                    id="create_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                    placeholder="16 Digits"
                                    className="h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex-col-reverse gap-2 pt-4 sm:flex-row">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full text-black sm:h-10 sm:w-auto">
                                    {trans_customer.btn_cancel || 'Cancel'}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:h-10 sm:w-auto">
                                {isSubmitting ? trans_customer.btn_saving || 'Saving...' : trans_customer.btn_save || 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL EDIT CUSTOMER --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{trans_customer.title_edit || 'Edit Customer'}</DialogTitle>
                        <DialogDescription>{trans_customer.desc_edit || 'Update customer detail information below.'}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateSubmit} className="space-y-4 py-2">
                        {/* Fields sama dengan Create, gunakan trans_customer */}
                        <div className="grid gap-2">
                            <Label htmlFor="edit_nama_perusahaan">{trans_customer.label_company_name}</Label>
                            <Input
                                id="edit_nama_perusahaan"
                                value={formData.nama_perusahaan}
                                onChange={(e) => handleInputChange('nama_perusahaan', e.target.value)}
                                required
                                className="h-11 sm:h-10"
                            />
                        </div>

                        {/* Perusahaan Dropdown (Owner) - Khusus Admin */}
                        {isAdmin && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit_id_perusahaan">{trans_customer.label_owner_company || 'Owner Company'}</Label>
                                <Select value={formData.id_perusahaan} onValueChange={(val) => handleInputChange('id_perusahaan', val)}>
                                    <SelectTrigger className="h-11 sm:h-10">
                                        <SelectValue placeholder={trans_customer.placeholder_owner_company || 'Select Owner Company'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perusahaan_list?.map((p) => (
                                            <SelectItem key={p.id_perusahaan} value={p.id_perusahaan.toString()}>
                                                {p.nama_perusahaan}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="edit_type">{trans_customer.label_type}</Label>
                                <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                                    <SelectTrigger className="h-11 sm:h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">Internal</SelectItem>
                                        <SelectItem value="external">External</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_email">{trans_customer.label_email}</Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    required
                                    className="h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit_nama">{trans_customer.label_pic_name}</Label>
                            <Input
                                id="edit_nama"
                                value={formData.nama}
                                onChange={(e) => handleInputChange('nama', e.target.value)}
                                required
                                className="h-11 sm:h-10"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-black sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_no_npwp">{trans_customer.label_npwp_15}</Label>
                                <Input
                                    id="edit_no_npwp"
                                    value={formData.no_npwp}
                                    onChange={(e) => handleInputChange('no_npwp', e.target.value)}
                                    className="h-11 sm:h-10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_no_npwp_16">{trans_customer.label_npwp_16}</Label>
                                <Input
                                    id="edit_no_npwp_16"
                                    value={formData.no_npwp_16}
                                    onChange={(e) => handleInputChange('no_npwp_16', e.target.value)}
                                    className="h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex-col-reverse gap-2 pt-4 sm:flex-row">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full text-black sm:h-10 sm:w-auto">
                                    {trans_customer.btn_cancel || 'Cancel'}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:h-10 sm:w-auto">
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
