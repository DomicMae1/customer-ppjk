/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzoneDocument } from '@/components/ResettableDropzoneDocument';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface DocumentData {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file: string;
    is_internal: boolean;
    is_confirmed: boolean;
    attribute: boolean;
    is_ori: boolean;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    kuota_revisi?: number;
    source?: 'master' | 'trans';
    section?: MasterSection;
}
interface PageProps {
    documents: DocumentData[];
    sections: MasterSection[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    trans_doc: Record<string, string>;
    [key: string]: any;
}

export default function ManageDocuments() {
    const { documents, sections, flash, auth, trans_doc } = usePage<PageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_doc.breadcrumb_title || 'Manage Documents',
            href: '/document',
        },
    ];

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);
    const isAdmin = userRole === 'admin';

    const toTitleCase = (text: string) => {
        return text
            .trim()
            .toLowerCase()
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // --- STATE EDIT ---
    const [openEdit, setOpenEdit] = useState(false);
    const [docIdToEdit, setDocIdToEdit] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
        is_internal: false,
        is_confirmed: false,
        attribute: false,
        is_ori: false,
        link_url_video_file: '',
        kuota_revisi: '',

        link_path_example_file: '',
        link_path_template_file: '',

        existing_example: null as { nama_file: string; path: string } | null,
        existing_template: null as { nama_file: string; path: string } | null,
    });

    // --- STATE DELETE ---
    const [openDelete, setOpenDelete] = useState(false);
    const [docIdToDelete, setDocIdToDelete] = useState<number | null>(null);
    const docToDelete = documents.find((d) => d.id_dokumen === docIdToDelete);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const handleEditDropzoneChange = (field: 'link_path_example_file' | 'link_path_template_file', response: any) => {
        if (response && (response.status === 'success' || response.path)) {
            setEditForm((prev) => ({ ...prev, [field]: response.path }));
        } else {
            setEditForm((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const handleEditNamaFileBlur = () => {
        setEditForm((prev) => ({
            ...prev,
            nama_file: toTitleCase(prev.nama_file),
        }));
    };

    // --- HANDLER EDIT ---
    const onEditClick = (id: number) => {
        const doc = documents.find((d) => d.id_dokumen === id) as any;

        if (doc) {
            // Validasi: Manager tidak boleh edit Master (Source 'master')
            if (isManager && doc.source === 'master') {
                toast.error(trans_doc.error_edit_master || 'Anda tidak memiliki izin untuk mengedit Dokumen Master.');
                return;
            }

            setDocIdToEdit(id);
            setEditForm({
                nama_file: toTitleCase(doc.nama_file || ''),
                id_section: String(doc.id_section),
                description_file: doc.description_file || '',
                is_internal: Boolean(doc.is_internal),
                is_confirmed: Boolean(doc.is_confirmed),
                attribute: Boolean(doc.attribute),
                is_ori: Boolean(doc.is_ori),
                link_url_video_file: doc.link_url_video_file || '',
                kuota_revisi: doc.kuota_revisi != null ? String(doc.kuota_revisi) : '',

                link_path_example_file: '',
                link_path_template_file: '',

                existing_example: doc.link_path_example_file
                    ? { nama_file: 'File Contoh Saat Ini', path: doc.link_path_example_file } // Backend sudah mengirim URL lengkap
                    : null,

                existing_template: doc.link_path_template_file
                    ? { nama_file: 'File Template Saat Ini', path: doc.link_path_template_file } // Backend sudah mengirim URL lengkap
                    : null,
            });
            setOpenEdit(true);
        }
    };

    const handleEditBooleanChange = (field: 'is_internal' | 'attribute' | 'is_confirmed' | 'is_ori', value: boolean) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const onConfirmEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (docIdToEdit) {
            const { existing_example, existing_template, ...payload } = editForm;
            router.post(
                `/document/${docIdToEdit}`,
                {
                    _method: 'put',
                    ...payload,
                    nama_file: toTitleCase(payload.nama_file),
                },
                {
                    onSuccess: () => {
                        setOpenEdit(false);
                        setDocIdToEdit(null);
                        // toast handled by flash
                    },
                    onError: (err) => console.error(err),
                },
            );
        }
    };

    // --- HANDLER DELETE ---
    const onDeleteClick = (id: number) => {
        setDocIdToDelete(id);
        setOpenDelete(true);
    };

    const handleConfirmDelete = () => {
        if (docIdToDelete) {
            router.delete(`/document/${docIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setDocIdToDelete(null);
                },
                onError: (errors) => {
                    console.error('Gagal menghapus:', errors);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={trans_doc.page_title || 'Manage Documents'} />
            <div className="p-4">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">{isAdmin ? trans_doc.header_global : trans_doc.header_internal}</h2>
                    <p className="text-sm text-gray-500">{isAdmin ? trans_doc.desc_global : trans_doc.desc_internal}</p>
                </div>

                <DataTable columns={columns(onEditClick, onDeleteClick, trans_doc)} data={documents} />
            </div>

            {/* --- MODAL EDIT --- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                {/* UBAH: w-[95vw] agar di mobile hampir full width, tapi tetap ada margin */}
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{trans_doc.title_edit || 'Edit Dokumen'}</DialogTitle>
                        <DialogDescription>{isManager ? trans_doc.subtitle_edit_internal : trans_doc.subtitle_edit_master}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={onConfirmEdit} className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="edit_nama_file">{trans_doc.label_doc_name}</Label>
                            <Input
                                id="edit_nama_file"
                                value={editForm.nama_file}
                                onChange={(e) => setEditForm({ ...editForm, nama_file: e.target.value })}
                                onBlur={handleEditNamaFileBlur}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit_id_section">{trans_doc.label_section}</Label>
                            <Select
                                value={editForm.id_section}
                                onValueChange={(val) => {
                                    setEditForm((prev) => {
                                        const newState = { ...prev, id_section: val };
                                        // Auto-reset mandatory if Global section selected
                                        if (val === '6') newState.attribute = false;
                                        return newState;
                                    });
                                }}
                            >
                                <SelectTrigger className="mt-1 w-full">
                                    <SelectValue placeholder={trans_doc.placeholder_section} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((sec) => (
                                        <SelectItem key={sec.id_section} value={String(sec.id_section)}>
                                            {sec.section_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">{trans_doc.label_upload_access}</Label>
                                <div className="flex w-full gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_internal', true)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_internal}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_internal', false)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_external}
                                    </Button>
                                </div>
                            </div>

                            {Number(editForm.id_section) !== 6 && (
                                <div>
                                    <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">{trans_doc.label_mandatory}</Label>
                                    <div className="flex w-full gap-2">
                                        <Button
                                            type="button"
                                            variant={editForm.attribute ? 'default' : 'outline'}
                                            onClick={() => handleEditBooleanChange('attribute', true)}
                                            className="flex-1"
                                        >
                                            {trans_doc.btn_yes}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={!editForm.attribute ? 'default' : 'outline'}
                                            onClick={() => handleEditBooleanChange('attribute', false)}
                                            className="flex-1"
                                        >
                                            {trans_doc.btn_no}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">
                                    {trans_doc.label_need_confirm || 'Need Confirm'}
                                </Label>
                                <div className="flex w-full gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.is_confirmed ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_confirmed', true)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.is_confirmed ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_confirmed', false)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">{trans_doc.label_is_ori || 'Is Original'}</Label>
                                <div className="flex w-full gap-2">
                                    <Button
                                        type="button"
                                        variant={editForm.is_ori ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_ori', true)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!editForm.is_ori ? 'default' : 'outline'}
                                        onClick={() => handleEditBooleanChange('is_ori', false)}
                                        className="flex-1"
                                    >
                                        {trans_doc.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="edit_video">{trans_doc.label_video_link}</Label>
                                <Input
                                    id="edit_video"
                                    value={editForm.link_url_video_file}
                                    onChange={(e) => setEditForm({ ...editForm, link_url_video_file: e.target.value })}
                                    placeholder="https://youtube.com/..."
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit_kuota_revisi">{trans_doc.count_revisi}</Label>
                                <Input
                                    id="edit_kuota_revisi"
                                    type="number"
                                    min="0"
                                    value={editForm.kuota_revisi}
                                    onChange={(e) => setEditForm({ ...editForm, kuota_revisi: e.target.value })}
                                    placeholder="Masukkan jumlah revisi"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="w-full">
                                <Label className="mb-2 block">{trans_doc.label_change_example}</Label>
                                <ResettableDropzoneDocument
                                    label={trans_doc.btn_upload_new}
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp',
                                        payload: { type: 'example', doc_name: editForm.nama_file },
                                    }}
                                    onFileChange={(file, response) => handleEditDropzoneChange('link_path_example_file', response)}
                                    existingFile={editForm.existing_example}
                                />
                                <p className="mt-1 text-[10px] text-gray-500">{trans_doc.note_overwrite}</p>
                            </div>

                            <div className="w-full">
                                <Label className="mb-2 block">{trans_doc.label_change_template}</Label>
                                <ResettableDropzoneDocument
                                    label={trans_doc.btn_upload_new}
                                    isRequired={false}
                                    uploadConfig={{
                                        url: '/document/upload-temp',
                                        payload: { type: 'template', doc_name: editForm.nama_file },
                                    }}
                                    onFileChange={(file, response) => handleEditDropzoneChange('link_path_template_file', response)}
                                    existingFile={editForm.existing_template}
                                />
                                <p className="mt-1 text-[10px] text-gray-500">{trans_doc.note_overwrite}</p>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="edit_desc">{trans_doc.label_description}</Label>
                            <Textarea
                                id="edit_desc"
                                value={editForm.description_file}
                                onChange={(e) => setEditForm({ ...editForm, description_file: e.target.value })}
                                className="mt-1"
                                rows={3}
                            />
                        </div>

                        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2">
                            <Button type="submit" className="w-full sm:w-auto">
                                {trans_doc.btn_save_changes}
                            </Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="w-full sm:w-auto">
                                    {trans_doc.btn_cancel}
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL DELETE --- */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{trans_doc.title_delete}</DialogTitle>
                        <DialogDescription>
                            {trans_doc.confirm_delete_1} <strong>{docToDelete?.nama_file}</strong>? {trans_doc.confirm_delete_2}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDelete(false)}>
                            {trans_doc.btn_cancel}
                        </Button>
                        <Button variant="destructive" className="text-white" onClick={handleConfirmDelete}>
                            {trans_doc.btn_delete}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
