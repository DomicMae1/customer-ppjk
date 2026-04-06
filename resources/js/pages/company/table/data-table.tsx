/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResettableDropzoneImage } from '@/components/ResettableDropzoneImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Building2, Globe, Plus, RotateCcw, Search } from 'lucide-react';
import * as React from 'react';
import { ChangeEvent, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface FormState {
    nama_perusahaan: string;
    domain: string;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'nama_perusahaan' }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const trans = (props.trans_company as Record<string, string>) || {};

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [openCreate, setOpenCreate] = React.useState(false);

    const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const [form, setForm] = useState<FormState>({
        nama_perusahaan: '',
        domain: '',
    });

    const handleSubmit = () => {
        const fd = new FormData();

        // field biasa
        fd.append('nama_perusahaan', form.nama_perusahaan);
        fd.append('domain', form.domain);

        // file logo jika ada
        if (companyLogoFile) {
            fd.append('company_logo', companyLogoFile);
        }

        router.post('/perusahaan', fd, {
            forceFormData: true,
            onSuccess: () => {
                setOpenCreate(false);
                setForm({
                    nama_perusahaan: '',
                    domain: '',
                });
                setCompanyLogoFile(null);
            },
            onError: (errors) => {
                console.error('❌ Error:', errors);
            },
        });
    };

    const table = useReactTable({
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

    return (
        <div className="w-full space-y-4">
            {/* --- DESKTOP VIEW: HEADER --- */}
            <div className="hidden items-center justify-between gap-2 px-1 md:flex">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            placeholder={trans.placeholder_filter_company || 'Cari nama perusahaan...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="bg-background border-input text-foreground focus-visible:ring-primary pl-9"
                        />
                    </div>
                    <DataTableViewOptions table={table} />
                </div>
                <Button onClick={() => setOpenCreate(true)} className="font-semibold shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> {trans.btn_create_nav || 'Tambah Perusahaan'}
                </Button>
            </div>

            {/* --- MOBILE VIEW: HEADER --- */}
            <div className="flex flex-col gap-3 px-1 md:hidden">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-foreground text-xl font-bold">{trans.page_title || 'Manajemen Perusahaan'}</h2>
                    <Button size="icon" onClick={() => setOpenCreate(true)} className="shrink-0 rounded-full shadow-md">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            placeholder={trans.placeholder_filter_company || 'Cari...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="bg-background border-input text-foreground focus-visible:ring-primary h-10 pl-9"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.getColumn(filterKey)?.setFilterValue('')}
                        className="border-input bg-background hover:bg-accent text-foreground h-10 w-10 shrink-0"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* --- DESKTOP TABLE --- */}
            <div className="border-border bg-card hidden overflow-hidden rounded-md border shadow-sm md:block">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {' '}
                        {/* Menggunakan bg-muted agar adaptif di dark mode */}
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-muted-foreground px-4 font-bold">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="border-border hover:bg-muted/30 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-foreground px-4 py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                                    {trans.no_data || 'Tidak ada data.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any;
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            <div
                                key={row.id}
                                className="group border-border bg-card dark:active:bg-muted/20 relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all active:scale-[0.99]"
                            >
                                <div className="bg-primary absolute top-0 left-0 h-full w-1" />
                                <div className="flex flex-col gap-3">
                                    <div className="border-border flex items-start justify-between border-b pb-2">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                                {trans.label_company || 'Perusahaan'}
                                            </span>
                                            <span className="text-foreground line-clamp-1 text-base font-bold">{original.nama_perusahaan}</span>
                                        </div>
                                        <div className="bg-primary/10 text-primary dark:bg-primary/20 rounded-full p-2">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase">
                                            {trans.label_domain || 'Domain'}
                                        </span>
                                        <div className="text-foreground/80 flex items-center gap-2 text-sm font-medium">
                                            <Globe className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                            <span className="break-all">{original.tenant?.domains?.[0]?.domain || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="border-border text-foreground mt-1 flex items-center justify-end border-t pt-2">
                                        {actionsCell && flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="border-border bg-muted/20 text-muted-foreground rounded-lg border-2 border-dashed py-12 text-center">
                        {trans.no_data || 'Tidak ada data ditemukan.'}
                    </div>
                )}
            </div>

            <DataTablePagination table={table} />

            {/* Dialog Tambah */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-lg sm:p-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <DialogHeader className="mb-4">
                            {/* Judul otomatis adaptif dengan text-foreground dari parent */}
                            <DialogTitle className="text-xl font-bold">{trans.title_create || 'Tambah Perusahaan'}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5">
                            <div className="grid gap-2">
                                <Label htmlFor="nama_perusahaan" className="text-foreground font-semibold">
                                    {trans.label_name}
                                </Label>
                                <Input
                                    id="nama_perusahaan"
                                    value={form.nama_perusahaan}
                                    onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })}
                                    placeholder={trans.placeholder_name}
                                    className="bg-background text-foreground h-11 sm:h-10"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="domain" className="text-foreground font-semibold">
                                    {trans.label_domain}
                                </Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    value={form.domain}
                                    onChange={handleInputChange}
                                    placeholder="Forward.com"
                                    className="bg-background text-foreground h-11 font-mono sm:h-10"
                                    required
                                />
                                <p className="text-muted-foreground text-[10px] italic sm:text-xs">{trans.helper_domain}</p>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground font-semibold">{trans.label_logo}</Label>
                                <div className="mt-1">
                                    <ResettableDropzoneImage label={trans.btn_upload} isRequired={false} onFileChange={setCompanyLogoFile} />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                                    {trans.btn_cancel}
                                </Button>
                            </DialogClose>
                            <Button type="submit" className="h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto">
                                {trans.btn_create}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
