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
import { Globe, Mail, Plus, RotateCcw, Search, User2 } from 'lucide-react';
import * as React from 'react';
import { ChangeEvent, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface User {
    id: number;
    name: string;
}

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
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [openCreate, setOpenCreate] = React.useState(false);

    const { props } = usePage<{ users: User[] }>();
    const users = props.users ?? [];

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

    const handleUserChange = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
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
            <div className="hidden items-center gap-2 md:flex">
                <Input
                    placeholder="Filter nama perusahaan..."
                    value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                    onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
                <Button onClick={() => setOpenCreate(true)}>Tambah Perusahaan</Button>
            </div>

            {/* --- MOBILE VIEW: HEADER & FILTER --- */}
            <div className="flex flex-col gap-3 px-1 md:hidden">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-gray-800">Daftar Perusahaan</h2>
                    <Button size="icon" onClick={() => setOpenCreate(true)} className="shrink-0 rounded-full">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Cari perusahaan..."
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => table.getColumn(filterKey)?.setFilterValue('')} className="shrink-0">
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="hidden rounded-md border bg-white md:block">
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
                                    Tidak ada data.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any;

                        return (
                            <div
                                key={row.id}
                                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all active:scale-[0.98] active:bg-gray-50"
                            >
                                {/* Garis dekoratif samping */}
                                <div className="bg-primary absolute top-0 left-0 h-full w-1" />

                                <div className="flex flex-col gap-3">
                                    {/* Header: Nama Perusahaan & Status/Icon */}
                                    <div className="flex items-start justify-between border-b pb-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Perusahaan</span>
                                            <span className="line-clamp-1 text-base font-bold text-gray-900">{original.nama_perusahaan || '-'}</span>
                                        </div>
                                        <div className="bg-primary/10 text-primary rounded-full p-2">
                                            <Globe className="h-4 w-4" />
                                        </div>
                                    </div>

                                    {/* Body: Info Utama */}
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Globe className="h-4 w-4 text-gray-400" />
                                            <span className="truncate font-medium">{original.domain || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Footer Card: Actions (Diambil dari cell terakhir columns) */}
                                    <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                        {/* Ini akan me-render tombol Edit/Hapus yang ada di columnDef Anda */}
                                        {flexRender(
                                            row.getVisibleCells().find((cell) => cell.column.id === 'actions')?.column.columnDef.cell,
                                            row
                                                .getVisibleCells()
                                                .find((cell) => cell.column.id === 'actions')
                                                ?.getContext(),
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-lg border-2 border-dashed bg-gray-50/50 py-12 text-center text-gray-500">Tidak ada hasil ditemukan.</div>
                )}
            </div>

            <DataTablePagination table={table} />

            {/* Dialog Tambah */}
            {/* Dialog Tambah */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="max-h-[90vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-lg sm:p-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-bold">Tambah Perusahaan</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5">
                            {/* Nama Perusahaan */}
                            <div className="grid gap-2">
                                <Label htmlFor="nama_perusahaan" className="text-sm font-semibold">
                                    Nama Perusahaan
                                </Label>
                                <Input
                                    id="nama_perusahaan"
                                    value={form.nama_perusahaan}
                                    onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })}
                                    placeholder="Contoh: PT. AminTrans"
                                    className="h-11 sm:h-10" // Lebih tinggi di mobile untuk kemudahan tap
                                    required
                                />
                            </div>

                            {/* Domain */}
                            <div className="grid gap-2">
                                <Label htmlFor="domain" className="text-sm font-semibold">
                                    Nama Domain
                                </Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    value={form.domain}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: AminTrans"
                                    className="h-11 sm:h-10"
                                    required
                                />
                                <p className="text-muted-foreground text-[10px] leading-relaxed italic sm:text-xs">
                                    Silahkan masukkan nama domain perusahaan
                                </p>
                            </div>

                            {/* Logo Upload */}
                            <div className="grid gap-2">
                                <Label className="text-sm font-semibold">Logo Perusahaan</Label>
                                <div className="mt-1">
                                    <ResettableDropzoneImage label="Upload Logo" isRequired={false} onFileChange={setCompanyLogoFile} />
                                </div>
                            </div>
                        </div>

                        {/* Footer: Vertikal di Mobile, Horizontal di Desktop */}
                        <DialogFooter className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full font-medium text-black sm:h-10 sm:w-auto">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full font-bold sm:h-10 sm:w-auto"
                                onClick={handleSubmit}
                            >
                                Simpan Perusahaan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
