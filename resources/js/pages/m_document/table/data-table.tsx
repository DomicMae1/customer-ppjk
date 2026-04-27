/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzoneDocument } from '@/components/ResettableDropzoneDocument';
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
    is_confirmed: boolean;
    attribute: boolean;
    is_ori: boolean;
    is_print: boolean;
    is_send_email: boolean;
    link_path_example_file?: string;
    link_path_template_file?: string;
    link_url_video_file?: string;
    kuota_revisi: number;
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
    filters?: {
        search?: string;
        attribute?: string;
        section?: string;
    };
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
    const { sections, auth, trans_doc, filters } = usePage<PageProps>().props;

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [mandatoryFilter, setMandatoryFilter] = useState<'all' | 'mandatory' | 'non_mandatory'>(
        (filters?.attribute as 'all' | 'mandatory' | 'non_mandatory') || 'all',
    );
    const [sectionFilter, setSectionFilter] = useState<string>(filters?.section || 'all');
    const [rowSelection, setRowSelection] = React.useState({});

    // State Form Create Document (Bukan Perusahaan lagi)
    const [openCreate, setOpenCreate] = React.useState(false);

    const toTitleCase = (text: string) => {
        return text
            .trim()
            .toLowerCase()
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleNamaFileBlur = () => {
        setForm((prev) => ({
            ...prev,
            nama_file: toTitleCase(prev.nama_file),
        }));
    };

    // Sesuaikan form state dengan kebutuhan Master Document
    const [form, setForm] = useState({
        nama_file: '',
        id_section: '',
        description_file: '',
        is_internal: false,
        is_confirmed: false,
        attribute: false,
        is_ori: false,
        is_print: false,
        is_send_email: false,
        link_url_video_file: '',
        kuota_revisi: '',
        file_example: null as File | null, // Untuk file
        file_template: null as File | null, // Untuk file
    });

    console.log(form);

    const filteredData = React.useMemo(() => {
        let result = [...(data as any[])];

        if (mandatoryFilter === 'mandatory') {
            result = result.filter((item) => item.attribute === true);
        } else if (mandatoryFilter === 'non_mandatory') {
            result = result.filter((item) => item.attribute === false);
        }

        if (sectionFilter !== 'all') {
            result = result.filter((item) => String(item.id_section) === String(sectionFilter));
        }

        // Urutkan berdasarkan id_section kecil ke besar
        // Jika id_section sama, urutkan lagi berdasarkan id_dokumen supaya stabil
        result.sort((a, b) => {
            const sectionCompare = Number(a.id_section) - Number(b.id_section);
            if (sectionCompare !== 0) return sectionCompare;

            return Number(a.id_dokumen) - Number(b.id_dokumen);
        });

        return result;
    }, [data, mandatoryFilter, sectionFilter]);

    const table = useReactTable({
        // Gunakan data dari props 'data' yang dilempar dari parent component (index.tsx)
        // Pastikan di index.tsx: <DataTable data={documents} ... />
        data: filteredData,
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
        setForm((prev) => {
            const newState = { ...prev, [name]: value };
            // Jika id_section diubah ke 6 (Global), otomatis matikan mandatory (attribute = false)
            if (name === 'id_section' && value === '6') {
                newState.attribute = false;
            }
            return newState;
        });
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
    const handleBooleanChange = (field: 'is_internal' | 'attribute' | 'is_confirmed' | 'is_ori' | 'is_print'|'is_send_email', value: boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const payload = {
            ...form,
            nama_file: toTitleCase(form.nama_file),
        };

        // Inertia otomatis menangani FormData jika ada file di dalam object payload
        router.post('/document', payload as any, {
            onSuccess: () => {
                setOpenCreate(false);
                // Reset Form
                setForm({
                    nama_file: '',
                    id_section: '',
                    description_file: '',
                    is_internal: false,
                    is_confirmed: false,
                    attribute: false,
                    is_ori: false,
                    is_print: false,
                    is_send_email: false,
                    link_url_video_file: '',
                    kuota_revisi: '',
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
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    {/* Baris 1 mobile: search + tombol tambah */}
                    <div className="flex w-full items-center gap-2 md:w-[720px]">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <Input
                                placeholder={trans_doc.search_placeholder || 'Search document name...'}
                                value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                                onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                                className="h-10 w-full pl-9"
                            />
                        </div>

                        <Button size="icon" className="h-10 w-10 shrink-0 md:hidden" onClick={() => setOpenCreate(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Baris 2 mobile: filter */}
                    <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
                        <select
                            value={mandatoryFilter}
                            onChange={(e) => setMandatoryFilter(e.target.value as 'all' | 'mandatory' | 'non_mandatory')}
                            className="border-input bg-background text-foreground focus:ring-primary h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none md:min-w-[160px]"
                        >
                            <option value="all">{trans_doc.filter_all_attribute || 'Semua Attribute'}</option>
                            <option value="mandatory">{trans_doc.filter_mandatory || 'Mandatory'}</option>
                            <option value="non_mandatory">{trans_doc.filter_non_mandatory || 'Non Mandatory'}</option>
                        </select>

                        <select
                            value={sectionFilter}
                            onChange={(e) => setSectionFilter(e.target.value)}
                            className="border-input bg-background text-foreground focus:ring-primary h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none md:min-w-[180px]"
                        >
                            <option value="all">{trans_doc.filter_all_section || 'Semua Section'}</option>
                            {sections.map((sec) => (
                                <option key={sec.id_section} value={sec.id_section}>
                                    {sec.section_name}
                                </option>
                            ))}
                        </select>
                    </div>
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
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            <div key={row.id} className="border-border bg-card rounded-lg border p-4 shadow-sm">
                                {/* Header: Name & Actions */}
                                <div className="border-border mb-2 flex items-start justify-between border-b pb-2">
                                    <div>
                                        <div className="text-foreground text-base font-bold">{original.nama_file}</div>
                                        {original.section && (
                                            <span className="bg-muted text-muted-foreground mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-medium">
                                                {original.section.section_name}
                                            </span>
                                        )}
                                    </div>
                                    {actionsCell && (
                                        <div className="text-foreground">
                                            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                                        </div>
                                    )}
                                </div>

                                {/* Body: Details */}
                                <div className="space-y-3">
                                    {/* Badges/Tags Status */}
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                original.is_internal
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}
                                        >
                                            {original.is_internal ? 'INTERNAL' : 'EXTERNAL / PUBLIC'}
                                        </span>
                                        {original.attribute && (
                                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                MANDATORY
                                            </span>
                                        )}
                                        {original.is_confirmed && (
                                            <span className="bg-destructive/10 text-destructive rounded px-2 py-0.5 text-[10px] font-bold">
                                                NEED CONFIRM
                                            </span>
                                        )}
                                        {original.is_ori && (
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                ORIGINAL
                                            </span>
                                        )}
                                        {original.is_print && (
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                PRINT
                                            </span>
                                        )}
                                        {original.is_send_email && (
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                EMAIL
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {original.description_file && (
                                        <div className="text-muted-foreground text-sm">
                                            <span className="text-muted-foreground/70 block text-xs font-semibold">Deskripsi:</span>
                                            <p className="text-foreground/90">{original.description_file}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground border-border rounded-lg border-2 border-dashed py-8 text-center">
                        {trans_doc.no_data || 'Tidak ada data.'}
                    </div>
                )}
            </div>

            {/* --- DESKTOP VIEW (Table Layout) --- */}
            <div className="border-border bg-card hidden overflow-hidden rounded-md border md:block">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-muted-foreground font-bold">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="border-border hover:bg-muted/30 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-foreground">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
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
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground pt-8 text-xl font-bold">
                            {isManager ? trans_doc.title_create_internal : trans_doc.title_create_master}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {isManager ? trans_doc.desc_create_internal : trans_doc.desc_create_master}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        <div className="grid gap-2">
                            <Label htmlFor="nama_file" className="text-foreground font-semibold">
                                {trans_doc.label_doc_name}
                            </Label>
                            <Input
                                id="nama_file"
                                name="nama_file"
                                value={form.nama_file}
                                onChange={handleInputChange}
                                onBlur={handleNamaFileBlur}
                                placeholder={trans_doc.placeholder_doc_name}
                                className="bg-background text-foreground h-11 sm:h-10"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="id_section" className="text-foreground font-semibold">
                                {trans_doc.label_section}
                            </Label>
                            <select
                                id="id_section"
                                name="id_section"
                                className="border-input bg-background text-foreground focus:ring-primary h-11 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none sm:h-10"
                                value={form.id_section}
                                onChange={handleInputChange}
                            >
                                <option value="" className="bg-background">
                                    {trans_doc.placeholder_section}
                                </option>
                                {sections.map((sec: any) => (
                                    <option key={sec.id_section} value={sec.id_section} className="bg-background">
                                        {sec.section_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                    {trans_doc.label_upload_access}
                                </Label>
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

                            {Number(form.id_section) !== 6 && (
                                <div>
                                    <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                        {trans_doc.label_mandatory}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={form.attribute ? 'default' : 'outline'}
                                            onClick={() => handleBooleanChange('attribute', true)}
                                            className="h-11 flex-1 sm:h-9"
                                        >
                                            {trans_doc.btn_yes || 'Ya'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={!form.attribute ? 'default' : 'outline'}
                                            onClick={() => handleBooleanChange('attribute', false)}
                                            className="h-11 flex-1 sm:h-9"
                                        >
                                            {trans_doc.btn_no || 'Tidak'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                    {trans_doc.label_need_confirm || 'Need Confirm'}
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_confirmed ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_confirmed', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_confirmed ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_confirmed', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                    {trans_doc.label_is_ori || 'Is Original'}
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_ori ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_ori', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_ori ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_ori', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                    {trans_doc.label_is_print || 'Is Print'}
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_print ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_print', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_print ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_print', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_doc.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                        {trans_doc.label_is_send_email || 'Is Send Email'}
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={form.is_send_email ? 'default' : 'outline'}
                                            onClick={() => handleBooleanChange('is_send_email', true)}
                                            className="h-11 flex-1 sm:h-9"
                                        >
                                            {trans_doc.btn_yes || 'Ya'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={!form.is_send_email ? 'default' : 'outline'}
                                            onClick={() => handleBooleanChange('is_send_email', false)}
                                            className="h-11 flex-1 sm:h-9"
                                        >
                                            {trans_doc.btn_no || 'Tidak'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="link_url_video_file" className="text-foreground font-semibold">
                                    {trans_doc.label_video_link}
                                </Label>
                                <Input
                                    id="link_url_video_file"
                                    name="link_url_video_file"
                                    value={form.link_url_video_file}
                                    onChange={handleInputChange}
                                    placeholder="https://youtube.com/..."
                                    className="bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="kuota_revisi" className="text-foreground font-semibold">
                                    {trans_doc.count_revisi}
                                </Label>
                                <Input
                                    id="kuota_revisi"
                                    name="kuota_revisi"
                                    type="number"
                                    min="0"
                                    value={form.kuota_revisi}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan jumlah revisi"
                                    className="bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-foreground font-semibold">{trans_doc.label_example_file}</Label>
                                <ResettableDropzoneDocument
                                    label={trans_doc.btn_upload_example}
                                    isRequired={false}
                                    uploadConfig={{ url: '/document/upload-temp', payload: { type: 'example', doc_name: form.nama_file } }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_example_file', response)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground font-semibold">{trans_doc.label_template_file}</Label>
                                <ResettableDropzoneDocument
                                    label={trans_doc.btn_upload_template}
                                    isRequired={false}
                                    uploadConfig={{ url: '/document/upload-temp', payload: { type: 'template', doc_name: form.nama_file } }}
                                    onFileChange={(file, response) => handleDropzoneChange('link_path_template_file', response)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description_file" className="text-foreground font-semibold">
                                {trans_doc.label_description}
                            </Label>
                            <textarea
                                id="description_file"
                                name="description_file"
                                className="border-input bg-background text-foreground focus:ring-primary flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                                rows={3}
                                value={form.description_file}
                                onChange={handleInputChange}
                                placeholder={trans_doc.placeholder_description}
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                                {trans_doc.btn_cancel}
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto"
                        >
                            {trans_doc.btn_save_doc}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
