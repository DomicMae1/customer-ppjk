/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { MemoizedInput } from '@/components/ui/memoized-input';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

interface SectionData {
    id?: number; // untuk SectionTrans
    id_section: number; // untuk MasterSection, dan ikut dikirim juga di trans
    id_spk?: number | null;
    section_name: string;
    section_order: number;
    is_penjaluran?: boolean;
    attribute_section: string;
    is_checklist?: boolean;
    deadline?: boolean;
    deadline_date?: string | null;
    source: 'master' | 'trans';
}

interface PageProps {
    sections: SectionData[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    trans_sec: Record<string, string>;
    [key: string]: any;
}

export default function ManageSections() {
    const { sections, flash, auth, trans_sec } = usePage<PageProps>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_sec.breadcrumb_title || 'Manage Sections',
            href: '/section',
        },
    ];

    const userRole = auth.user?.roles?.[0]?.name;
    const isAdmin = userRole === 'admin';

    const [openEdit, setOpenEdit] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);

    const [sectionIdToEdit, setSectionIdToEdit] = useState<number | null>(null);
    const [sectionIdToDelete, setSectionIdToDelete] = useState<number | null>(null);

    const [editForm, setEditForm] = useState({
        section_name: '',
        section_order: '',
        is_penjaluran: false,
        id_section: '',
        attribute_section: '',
        is_checklist: false,
        id_spk: '',
        deadline: false,
        deadline_date: '',
    });

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setEditForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const sectionToDelete = sections.find((item) => {
        const rowId = item.source === 'trans' ? item.id : item.id_section;
        return rowId === sectionIdToDelete;
    });

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const onEditClick = (id: number) => {
        if (!auth.user.permissions.includes('update-section')) {
            toast.error(trans_sec.toast_update_permission_error || 'Anda tidak memiliki izin untuk mengedit section.');
            return;
        }
        const section = sections.find((item) => item.id_section === id);

        if (!section) return;

        setSectionIdToEdit(id);
        setEditForm({
            section_name: section.section_name || '',
            section_order: section.section_order != null ? String(section.section_order) : '',
            is_penjaluran: Boolean(section.is_penjaluran),
            id_section: section.id_section != null ? String(section.id_section) : '',
            id_spk: section.id_spk != null ? String(section.id_spk) : '',
            attribute_section: section.attribute_section || '',
            is_checklist: Boolean(section.is_checklist),
            deadline: Boolean(section.deadline),
            deadline_date: section.deadline_date || '',
        });
        setOpenEdit(true);
    };

    const onConfirmEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sectionIdToEdit) return;

        const payload: Record<string, any> = {
            _method: 'put',
            section_name: editForm.section_name,
            section_order: editForm.section_order,
            attribute_section: editForm.attribute_section || null,
            is_checklist: editForm.is_checklist,
        };

        router.post(`/section/${sectionIdToEdit}`, payload, {
            onSuccess: () => {
                setOpenEdit(false);
                setSectionIdToEdit(null);
            },
            onError: (err) => console.error(err),
        });
    };

    const onDeleteClick = (id: number) => {
        if (!auth.user.permissions.includes('delete-section')) {
            toast.error(trans_sec.toast_delete_permission_error || 'Anda tidak memiliki izin untuk menghapus section.');
            return;
        }
        setSectionIdToDelete(id);
        setOpenDelete(true);
    };

    const handleConfirmDelete = () => {
        if (!sectionIdToDelete) return;

        router.delete(`/section/${sectionIdToDelete}`, {
            onSuccess: () => {
                setOpenDelete(false);
                setSectionIdToDelete(null);
            },
            onError: (errors) => {
                console.error('Gagal menghapus:', errors);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={trans_sec.page_title || 'Manage Sections'} />

            <div className="p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {isAdmin ? trans_sec.header_global || 'Master Section' : trans_sec.header_internal || 'Section Trans'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isAdmin
                                ? trans_sec.desc_global || 'Kelola section master/global.'
                                : trans_sec.desc_internal || 'Kelola section transaction perusahaan.'}
                        </p>
                    </div>
                </div>

                <DataTable columns={columns(onEditClick, onDeleteClick, trans_sec)} data={sections} />
            </div>

            {/* MODAL EDIT */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground pt-8 text-xl font-bold">{trans_sec.title_edit || 'Edit Section'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {trans_sec.subtitle_edit_master || 'Edit section master/global.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={onConfirmEdit}>
                        <div className="space-y-5 py-3">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_section_name" className="text-foreground font-semibold">
                                    {trans_sec.label_section_name || 'Nama Section'}
                                </Label>
                                <Input
                                    id="edit_section_name"
                                    name="section_name"
                                    value={editForm.section_name}
                                    onChange={(e) => setEditForm({ ...editForm, section_name: e.target.value })}
                                    placeholder={trans_sec.placeholder_section_name || 'Masukkan nama section'}
                                    className="bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="attribute_section" className="text-foreground font-semibold">
                                    {trans_sec.label_attribute || 'Tipe Dokumen'}
                                </Label>
                                <select
                                    id="attribute_section"
                                    name="attribute_section"
                                    value={editForm.attribute_section}
                                    onChange={handleEditInputChange}
                                    className="border-input bg-background text-foreground focus:ring-primary h-11 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none sm:h-10"
                                >
                                    <option value="">{trans_sec.placeholder_attribute || 'Pilih tipe'}</option>
                                    <option value="mandatory">{trans_sec.option_mandatory || 'Mandatory'}</option>
                                    <option value="non_mandatory">{trans_sec.option_non_mandatory || 'Non Mandatory'}</option>
                                </select>
                            </div>

                            <div>
                                <Label className="text-foreground mb-2 block font-semibold">
                                    {trans_sec.label_is_checklist || 'Special Section (Muncul di Checklist SPK Baru)'}
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.is_checklist ? 'default' : 'outline'}
                                        onClick={() => setEditForm({ ...editForm, is_checklist: true })}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_sec.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.is_checklist ? 'default' : 'outline'}
                                        onClick={() => setEditForm({ ...editForm, is_checklist: false })}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_sec.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                                 <p className="text-muted-foreground mt-1 text-xs">
                                    Jika diaktifkan, section ini akan muncul sebagai opsi tambahan (checkbox) saat membuat SPK baru.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                                    {trans_sec.btn_cancel || 'Batal'}
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto">
                                {trans_sec.btn_save_changes || 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL DELETE */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{trans_sec.title_delete || 'Hapus Section'}</DialogTitle>
                        <DialogDescription>
                            {trans_sec.confirm_delete_1 || 'Apakah Anda yakin ingin menghapus'} <strong>{sectionToDelete?.section_name}</strong>?{' '}
                            {trans_sec.confirm_delete_2 || 'Tindakan ini tidak dapat dibatalkan.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDelete(false)}>
                            {trans_sec.btn_cancel || 'Batal'}
                        </Button>
                        <Button variant="destructive" className="text-white" onClick={handleConfirmDelete}>
                            {trans_sec.btn_delete || 'Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
