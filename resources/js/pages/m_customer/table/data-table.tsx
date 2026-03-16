/* eslint-disable @typescript-eslint/no-explicit-any */
// Customer/table/data-table.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePage } from '@inertiajs/react';
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
import { IdCard, Mail, MapPin, Plus, Search } from 'lucide-react';
import * as React from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onCreateClick?: () => void;
}

export function DataTable<TData, TValue>({ columns, data, onCreateClick }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const trans = (props.trans_customer as Record<string, string>) || {};
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [filterValue, setFilterValue] = React.useState('');

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
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    React.useEffect(() => {
        table.getColumn('nama_perusahaan')?.setFilterValue(filterValue);
    }, [filterValue, table]);

    return (
        <div>
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
                {/* Input Pencarian (Full width di mobile, auto di desktop) */}
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={trans.placeholder_company_name || 'Cari...'}
                            value={filterValue}
                            onChange={(event) => setFilterValue(event.target.value)}
                            className="w-full pl-9"
                        />
                    </div>
                    {onCreateClick && (
                        <Button size="icon" className="shrink-0 md:hidden" onClick={onCreateClick}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Tombol Aksi Desktop */}
                <div className="hidden items-center gap-2 md:flex">
                    <DataTableViewOptions table={table} />
                    {onCreateClick && (
                        <Button className="h-9 font-semibold" onClick={onCreateClick}>
                            <Plus className="mr-2 h-4 w-4" /> {trans.btn_add?.replace('Save', 'Add') || 'Tambah Customer'}
                        </Button>
                    )}
                </div>
            </div>

            {/* --- MOBILE VIEW (Card Layout) --- */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any;
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            /* Ganti bg-white ke bg-card dan border-gray-200 ke border-border */
                            <div key={row.id} className="border-border bg-card relative overflow-hidden rounded-lg border p-4 shadow-sm">
                                {/* Header Card */}
                                <div className="bg-primary absolute top-0 left-0 h-full w-1" />

                                <div className="border-border mb-3 flex items-start justify-between border-b pb-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                                            {trans.label_company_name || 'Perusahaan'}
                                        </span>
                                        {/* Ganti text-gray-900 ke text-foreground */}
                                        <span className="text-foreground text-base leading-tight font-bold">{original.nama_perusahaan}</span>
                                        <div className="mt-1 flex gap-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                    original.type === 'internal'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}
                                            >
                                                {original.type || 'External'}
                                            </span>
                                        </div>
                                    </div>
                                    {actionsCell && (
                                        <div className="text-foreground shrink-0">
                                            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                                        </div>
                                    )}
                                </div>

                                {/* Body Card: Informasi Kontak */}
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{original.email || '-'}</span>
                                    </div>

                                    <div className="text-muted-foreground flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="text-muted-foreground line-clamp-2 text-xs italic">
                                            PIC: <span className="text-foreground font-semibold not-italic">{original.nama || '-'}</span>
                                        </span>
                                    </div>

                                    <div className="text-muted-foreground flex items-center gap-2">
                                        <IdCard className="h-3.5 w-3.5" />
                                        <span>{original.no_npwp || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    /* Empty State adaptif */
                    <div className="border-border bg-muted/20 text-muted-foreground rounded-lg border border-dashed py-12 text-center">
                        {trans.toast_delete_success ? 'No results found' : 'Data tidak ditemukan.'}
                    </div>
                )}
            </div>
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
                                    {trans.toast_delete_success ? 'No data available' : 'Data tidak ditemukan.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="py-4">
                <DataTablePagination table={table} />
            </div>
        </div>
    );
}
