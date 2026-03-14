/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzone } from '@/components/ResettableDropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Import Description
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, usePage } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import * as React from 'react';
import { ChangeEvent, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

// Interface Data dari Backend
interface DocumentData {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    description_file: string;
    is_internal: boolean;
    attribute: boolean;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    source?: 'master' | 'trans';
    section?: MasterSection;
}

interface MasterSection {
    id_section: number;
    section_name: string;
}

interface PageProps {
    documents: DocumentData[];
    sections: MasterSection[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    trans_doc: Record<string, string>;
    [key: string]: any;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    // Data tabel sekarang dinamis, tapi defaultnya kita pakai TData
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'nama_file' }: DataTableProps<TData, TValue>) {
    // 1. Ambil data documents dan sections dari props Inertia
    const { sections, auth, trans_doc } = usePage<PageProps>().props;

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // State Form Create Document (Bukan Perusahaan lagi)
    const [openCreate, setOpenCreate] = React.useState(false);

    // Sesuaikan form state dengan kebutuhan Master Document
    const [form, setForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
        is_internal: false,
        attribute: false,
        link_url_video_file: '',
        file_example: null as File | null, // Untuk file
        file_template: null as File | null, // Untuk file
    });

    const table = useReactTable({
        // Gunakan data dari props 'data' yang dilempar dari parent component (index.tsx)
        // Pastikan di index.tsx: <DataTable data={documents} ... />
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: { sorting, columnFilters, columnVisibility, rowSelection },
    });

    // --- FORM HANDLERS ---
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleDropzoneChange = (field: 'link_path_example_file' | 'link_path_template_file', response: any) => {
        if (response && (response.status === 'success' || response.path)) {
            setForm((prev) => ({ ...prev, [field]: response.path }));
        } else {
            // Jika reset/hapus
            setForm((prev) => ({ ...prev, [field]: '' }));
        }
    };

    // Helper Boolean
    const handleBooleanChange = (field: 'is_internal' | 'attribute', value: boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        // Inertia otomatis menangani FormData jika ada file di dalam object payload
        router.post('/document', form as any, {
            onSuccess: () => {
                setOpenCreate(false);
                // Reset Form
                setForm({
                    nama_file: '',
                    id_section: '',
                    description_file: '',
                    is_internal: false,
                    attribute: false,
                    link_url_video_file: '',
                    file_example: null,
                    file_template: null,
                });
            },
            onError: (errors) => console.error(errors),
        });
    };

    return (
        <div className="w-full space-y-4">
            {/* --- HEADER RESPONSIVE --- */}
            <div className="flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
                {/* Search Input */}
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={trans_doc.search_placeholder || 'Filter...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="w-full pl-9"
                        />
                    </div>
                    <Button size="icon" className="shrink-0 md:hidden" onClick={() => setOpenCreate(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden items-center gap-2 md:flex">
                    <DataTableViewOptions table={table} />
                    <Button onClick={() => setOpenCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" /> {trans_doc.btn_add || 'Tambah Dokumen'}
                    </Button>
                </div>
            </div>

            {/* --- MOBILE VIEW (Card Layout) --- */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as unknown as DocumentData;

                        // Render action column manually
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                {/* Header: Name & Actions */}
                                <div className="mb-2 flex items-start justify-between border-b pb-2">
                                    <div>
                                        <div className="text-base font-bold text-gray-900">{original.nama_file}</div>
                                        {original.section && (
                                            <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                                {original.section.section_name}
                                            </span>
                                        )}
                                    </div>
                                    {actionsCell && <div>{flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}</div>}
                                </div>

                                {/* Body: Details */}
                                <div className="space-y-3">
                                    {/* Badges/Tags Status */}
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                original.is_internal ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                            }`}
                                        >
                                            {original.is_internal ? 'INTERNAL' : 'EXTERNAL / PUBLIC'}
                                        </span>
                                        {original.attribute && (
                                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">MANDATORY</span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {original.description_file && (
                                        <div className="text-sm text-gray-600">
                                            <span className="block text-xs font-semibold text-gray-400">Deskripsi:</span>
                                            {original.description_file}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-gray-500">{trans_doc.no_data || 'Tidak ada data.'}</div>
                )}
            </div>

            {/* --- DESKTOP VIEW (Table Layout) --- */}
            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {trans_doc.no_data || 'Tidak ada data.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="py-4">
                <DataTablePagination table={table} />
            </div>

            {/* Dialog Tambah Dokumen */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                {/* UBAH: 
                    - w-[95vw] untuk mobile agar tidak mepet layar
                    - max-h-[90vh] dan overflow-y-auto agar bisa scroll di layar pendek
                */}
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-lg sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {isManager ? trans_doc.title_create_internal : trans_doc.title_create_master}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {isManager ? trans_doc.desc_create_internal : trans_doc.desc_create_master}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        <div className="grid gap-2">
                            <Label htmlFor="nama_file" className="font-semibold text-gray-700">
                                {trans_doc.label_doc_name}
                            </Label>
                            <Input
                                id="nama_file"
                                name="nama_file"
                                value={form.nama_file}
                                onChange={handleInputChange}
                                placeholder={trans_doc.placeholder_doc_name}
                                className="h-11 sm:h-10"
                            />
                        </div>

                        <div className="grid gap-2 text-black">
                            <Label htmlFor="id_section" className="font-semibold text-gray-700">
                                {trans_doc.label_section}
                            </Label>
                            <select
                                id="id_section"
                                name="id_section"
                                className="border-input bg-background h-11 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none sm:h-10"
                                value={form.id_section}
                                onChange={handleInputChange}
                            >
                                <option value="">{trans_doc.placeholder_section}</option>
                                {sections.map((sec: any) => (
                                    <option key={sec.id_section} value={sec.id_section}>
                                        {sec.section_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="mb-2 block text-xs font-bold text-gray-500 uppercase">{trans_doc.label_upload_access}</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_internal', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_internal}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_internal ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_internal', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_external}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-bold text-gray-500 uppercase">{trans_doc.label_mandatory}</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.attribute ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('attribute', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_yes}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.attribute ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('attribute', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_no}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2 text-black">
                            <Label htmlFor="link_url_video_file" className="font-semibold text-gray-700">
                                {trans_doc.label_video_link}
                            </Label>
                            <Input
                                id="link_url_video_file"
                                name="link_url_video_file"
                                value={form.link_url_video_file}
                                onChange={handleInputChange}
                                placeholder="https://youtube.com/..."
                                className="h-11 sm:h-10"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">{trans_doc.label_example_file}</Label>
                                <ResettableDropzone
                                    label={trans_doc.btn_upload_example}
                                    isRequired={false}
                                    uploadConfig={{ url: '/document/upload-temp', payload: { type: 'example', doc_name: form.nama_file } }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_example_file', response)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">{trans_doc.label_template_file}</Label>
                                <ResettableDropzone
                                    label={trans_doc.btn_upload_template}
                                    isRequired={false}
                                    uploadConfig={{ url: '/document/upload-temp', payload: { type: 'template', doc_name: form.nama_file } }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_template_file', response)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description_file" className="font-semibold text-gray-700">
                                {trans_doc.label_description}
                            </Label>
                            <textarea
                                id="description_file"
                                name="description_file"
                                className="border-input bg-background flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                                rows={3}
                                value={form.description_file}
                                onChange={handleInputChange}
                                placeholder={trans_doc.placeholder_description}
                            />
                        </div>
                    </div>

                    {/* Footer: Tombol tumpuk terbalik di mobile (Simpan di atas) */}
                    <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                                {trans_doc.btn_cancel}
                            </Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSubmit} className="h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto">
                            {trans_doc.btn_save_doc}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
