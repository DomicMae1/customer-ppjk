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

interface FormState {
    nama_perusahaan: string;
    domain: string;
    path_company_logo: string;
}

interface PageProps {
    companies: any[];
    flash: { success?: string; error?: string };
    // Tambahkan prop translasi di sini
    trans_company: Record<string, string>;
    [key: string]: any;
}

export default function ManageCompany() {
    const { companies, flash, trans_company } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_company.breadcrumb_title || 'Manage Company',
            href: '/perusahaan',
        },
    ];

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
            <Head title={trans_company.page_title || 'Manage Companies'} />
            <div className="p-4">
                <DataTable columns={columns(onEditClick, onDeleteClick, trans_company)} data={companies} />
            </div>

            {/* Modal Hapus */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="max-w-[90vw] rounded-xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{trans_company.title_delete || 'Delete Company'}</DialogTitle>
                        <div className="mt-2 text-sm">{trans_company.confirm_delete || 'Are you sure you want to delete this company?'}</div>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                        <Button variant="destructive" className="w-full text-white sm:w-auto" onClick={onConfirmDelete}>
                            {trans_company.btn_delete || 'Delete'}
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary" className="w-full sm:w-auto">
                                {trans_company.btn_cancel || 'Cancel'}
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Form Tambah/Edit */}
            <Dialog open={openForm} onOpenChange={(isOpen) => !isOpen && resetFormAndClose()}>
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <form onSubmit={onSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-foreground text-lg font-bold sm:text-xl">
                                {selectedCompany ? trans_company.title_edit : trans_company.title_create}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nama_perusahaan" className="text-foreground/90 font-semibold">
                                    {trans_company.label_name}
                                </Label>
                                <Input
                                    id="nama_perusahaan"
                                    name="nama_perusahaan"
                                    value={form.nama_perusahaan}
                                    onChange={handleInputChange}
                                    placeholder={trans_company.placeholder_name}
                                    required
                                    className="bg-background border-input text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="domain" className="text-foreground/90 font-semibold">
                                    {trans_company.label_domain}
                                </Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    value={form.domain}
                                    onChange={handleInputChange}
                                    placeholder="AminTrans"
                                    required
                                    className="bg-background border-input text-foreground h-11 font-mono sm:h-10"
                                />
                                <p className="text-muted-foreground text-[10px] italic sm:text-xs">{trans_company.helper_domain}</p>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground/90 font-semibold">{trans_company.label_logo}</Label>
                                <div className="mt-1">
                                    <ResettableDropzoneImage
                                        key={form.path_company_logo}
                                        label={trans_company.btn_upload}
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

                        <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:mt-0 sm:flex-row sm:justify-end">
                            <DialogClose asChild>
                                <Button
                                    variant="secondary"
                                    type="button"
                                    className="bg-secondary text-secondary-foreground h-11 w-full sm:h-10 sm:w-auto"
                                >
                                    {trans_company.btn_cancel}
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto">
                                {selectedCompany ? trans_company.btn_update : trans_company.btn_create}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
