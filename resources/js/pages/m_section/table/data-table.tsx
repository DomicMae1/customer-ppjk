/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface SectionData {
    id?: number;
    id_spk?: number | null;
    section_name: string;
    is_penjaluran?: boolean;
    attribute_section: string;
    deadline?: boolean;
    deadline_date?: string | null;
    source?: 'master' | 'trans';
}

interface PageProps {
    sections: SectionData[];
    flash: { success?: string; error?: string };
    auth: { user: any };
    trans_sec: Record<string, string>;
    [key: string]: any;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, filterKey = 'section_name' }: DataTableProps<TData, TValue>) {
    const { auth, trans_sec } = usePage<PageProps>().props;

    const userRole = auth.user?.roles?.[0]?.name;
    const isManager = ['manager', 'supervisor'].includes(userRole);
    const isAdmin = userRole === 'admin';

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [openCreate, setOpenCreate] = React.useState(false);

    const [form, setForm] = useState({
        section_name: '',
        is_penjaluran: false,
        attribute_section: '',
        deadline: false,
        deadline_date: '',
    });

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

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleBooleanChange = (field: 'is_penjaluran' | 'deadline', value: boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm({
            section_name: '',
            is_penjaluran: false,
            attribute_section: '',
            deadline: false,
            deadline_date: '',
        });
    };

    const handleSubmit = () => {
        const payload: Record<string, any> = {
            section_name: form.section_name,
        };

        if (isAdmin) {
            payload.is_penjaluran = form.is_penjaluran;
        }

        if (isManager) {
            payload.attribute_section = form.attribute_section || null;
            payload.deadline = form.deadline;
            payload.deadline_date = form.deadline_date || null;
        }

        router.post('/section', payload, {
            onSuccess: () => {
                setOpenCreate(false);
                resetForm();
            },
            onError: (errors) => console.error(errors),
        });
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={trans_sec.search_placeholder || 'Filter...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="w-full pl-9"
                        />
                    </div>
                    <Button size="icon" className="shrink-0 md:hidden" onClick={() => setOpenCreate(true)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                    <DataTableViewOptions table={table} />
                    <Button onClick={() => setOpenCreate(true)}>
                        <Plus className="mr-2 h-4 w-4" /> {trans_sec.btn_add || 'Tambah Section'}
                    </Button>
                </div>
            </div>
            {/* Mobile */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as unknown as SectionData;
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        const value = original.attribute_section;
                        const isMandatory = value === true || value === 'mandatory' || value === '1';

                        return (
                            <div key={row.id} className="border-border bg-card rounded-lg border p-4 shadow-sm">
                                <div className="border-border mb-2 flex items-start justify-between border-b pb-2">
                                    <div>
                                        <div className="text-foreground text-base font-bold">{original.section_name}</div>
                                    </div>

                                    {actionsCell && (
                                        <div className="text-foreground">
                                            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                                isMandatory
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                            }`}
                                        >
                                            {isMandatory
                                                ? trans_sec.option_mandatory || 'Mandatory'
                                                : trans_sec.option_non_mandatory || 'Non Mandatory'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground border-border rounded-lg border-2 border-dashed py-8 text-center">
                        {trans_sec.no_data || 'Tidak ada data.'}
                    </div>
                )}
            </div>
            {/* Desktop */}
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
                                    {trans_sec.no_data || 'Tidak ada data.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="py-4">
                <DataTablePagination table={table} />
            </div>

            {/* Dialog Tambah Section */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] w-[95vw] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground pt-8 text-xl font-bold">
                            {isManager
                                ? trans_sec.title_create_internal || 'Tambah Section Trans'
                                : trans_sec.title_create_master || 'Tambah Master Section'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            {isManager
                                ? trans_sec.desc_create_internal || 'Buat section baru untuk transaction.'
                                : trans_sec.desc_create_master || 'Buat section baru untuk master/global.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        <div className="grid gap-2">
                            <Label htmlFor="section_name" className="text-foreground font-semibold">
                                {trans_sec.label_section_name || 'Nama Section'}
                            </Label>
                            <Input
                                id="section_name"
                                name="section_name"
                                value={form.section_name}
                                onChange={handleInputChange}
                                placeholder={trans_sec.placeholder_section_name || 'Masukkan nama section'}
                                className="bg-background text-foreground h-11 sm:h-10"
                            />
                        </div>

                        {/* {isAdmin && (
                            <div>
                                <Label className="text-muted-foreground mb-2 block text-xs font-bold uppercase">
                                    {trans_sec.label_is_penjaluran || 'Penjaluran'}
                                </Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.is_penjaluran ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_penjaluran', true)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_sec.btn_yes || 'Ya'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!form.is_penjaluran ? 'default' : 'outline'}
                                        onClick={() => handleBooleanChange('is_penjaluran', false)}
                                        className="h-11 flex-1 sm:h-9"
                                    >
                                        {trans_sec.btn_no || 'Tidak'}
                                    </Button>
                                </div>
                            </div>
                        )} */}

                        {isManager && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="attribute_section" className="text-foreground font-semibold">
                                        {trans_sec.label_attribute || 'Tipe Dokumen'}
                                    </Label>
                                    <select
                                        id="attribute_section"
                                        name="attribute_section"
                                        value={form.attribute_section}
                                        onChange={handleInputChange}
                                        className="border-input bg-background text-foreground focus:ring-primary h-11 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none sm:h-10"
                                    >
                                        <option value="">{trans_sec.placeholder_attribute || 'Pilih tipe'}</option>
                                        <option value="mandatory">{trans_sec.option_mandatory || 'Mandatory'}</option>
                                        <option value="non_mandatory">{trans_sec.option_non_mandatory || 'Non Mandatory'}</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto" onClick={resetForm}>
                                {trans_sec.btn_cancel || 'Batal'}
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            className="bg-primary text-primary-foreground h-11 w-full font-bold shadow-md sm:h-10 sm:w-auto"
                        >
                            {trans_sec.btn_save || 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
