/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Company',
        href: '/perusahaan',
    },
];

interface FormState {
    nama_perusahaan: string;
    domain: string;
    path_company_logo: string;
}

export default function ManageCompany() {
    const { props } = usePage();
    const { companies, flash } = props as {
        companies: any[];
        flash: { success?: string; error?: string };
        users: any[];
    };

    const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);

    const initialFormState: FormState = {
        nama_perusahaan: '',
        domain: '',
        path_company_logo: '',
    };

    const [form, setForm] = useState<FormState>(initialFormState);
    const [openForm, setOpenForm] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
    const [companyIdToDelete, setCompanyIdToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({
            ...prevForm,
            [name]: value,
        }));
    };

    const resetFormAndClose = () => {
        setForm(initialFormState);
        setCompanyLogoFile(null);
        setSelectedCompany(null);
        setOpenForm(false);
    };

    const onEditClick = (company: any) => {
        setSelectedCompany(company);
        setCompanyLogoFile(null);

        setForm({
            nama_perusahaan: company.nama_perusahaan || '',
            domain: company.tenant?.domains?.[0]?.domain || '',
            path_company_logo: company.path_company_logo || '',
        });

        setOpenForm(true);
    };

    const onDeleteClick = (id: number) => {
        setCompanyIdToDelete(id);
        setOpenDelete(true);
    };

    const onConfirmDelete = () => {
        if (companyIdToDelete) {
            router.delete(`/perusahaan/${companyIdToDelete}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenDelete(false);
                    setCompanyIdToDelete(null);
                    toast.success('Perusahaan berhasil dihapus');

                    router.reload({ only: ['companies'] });
                },
                onError: () => {
                    toast.error('Gagal menghapus perusahaan');
                },
            });
        }
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();

        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (value !== null) formData.append(key, value);
        });

        // append file logo jika ada upload baru
        if (companyLogoFile) formData.append('company_logo', companyLogoFile);

        if (selectedCompany) {
            formData.append('_method', 'PUT');
            router.post(`/perusahaan/${selectedCompany.id_perusahaan}`, formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Perusahaan berhasil diperbarui');
                    resetFormAndClose();
                    router.reload({ only: ['companies'] });
                },
                onError: (errors) => {
                    console.error(errors);
                    toast.error('Gagal memperbarui perusahaan');
                },
            });
        } else {
            router.post('/perusahaan', formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Perusahaan berhasil ditambahkan');
                    resetFormAndClose();
                    router.reload({ only: ['companies'] });
                },
                onError: (errors) => {
                    console.error(errors);
                    toast.error('Gagal menambah perusahaan');
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Companies" />
            <div className="p-4">
                <DataTable columns={columns(onEditClick, onDeleteClick)} data={companies} />
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Perusahaan</DialogTitle>
                        <div className="mt-2">Apakah Anda yakin ingin menghapus perusahaan ini?</div>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <Button variant="destructive" className="text-white" onClick={onConfirmDelete}>
                            Hapus
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={openForm} onOpenChange={(isOpen) => !isOpen && resetFormAndClose()}>
                {/* - max-w-[95%] untuk mobile, max-w-lg untuk desktop
                - max-h-[90vh] agar tidak melebihi layar hp
                - overflow-y-auto agar bisa di-scroll tanpa ScrollArea 
            */}
                <DialogContent className="max-h-[90vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <form onSubmit={onSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">{selectedCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Input Nama */}
                            <div className="grid gap-2">
                                <Label htmlFor="nama_perusahaan">Nama Perusahaan</Label>
                                <Input
                                    id="nama_perusahaan"
                                    name="nama_perusahaan"
                                    value={form.nama_perusahaan}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: PT. Maju Sejahtera"
                                    required
                                    className="h-10"
                                />
                            </div>

                            {/* Input Domain */}
                            <div className="grid gap-2">
                                <Label htmlFor="domain">Nama Domain</Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    value={form.domain}
                                    onChange={handleInputChange}
                                    placeholder="AminTrans"
                                    required
                                    className="h-10"
                                />
                                <p className="text-muted-foreground text-[10px] sm:text-xs">Silahkan masukkan nama domain perusahaan</p>
                            </div>

                            {/* Logo Upload */}
                            <div className="grid gap-2">
                                <Label>Logo Perusahaan</Label>
                                <div className="mt-1">
                                    <ResettableDropzoneImage
                                        key={form.path_company_logo}
                                        label="Upload Logo"
                                        isRequired={false}
                                        onFileChange={setCompanyLogoFile}
                                        existingFile={
                                            form.path_company_logo
                                                ? {
                                                      nama_file: form.path_company_logo.split('/').pop() ?? 'logo.png',
                                                      path: form.path_company_logo,
                                                  }
                                                : null
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer: Tombol tumpuk di mobile, sejajar di desktop */}
                        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:mt-0 sm:flex-row">
                            <DialogClose asChild>
                                <Button variant="secondary" type="button" className="w-full sm:w-auto">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="w-full sm:w-auto">
                                {selectedCompany ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
