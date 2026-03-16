/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Plus, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onCreateClick: () => void;
    filterKey?: string;
}

export function DataTable<TData, TValue>({ columns, data, onCreateClick, filterKey = 'name' }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const trans = (props.trans_role as Record<string, string>) || {};
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

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

    return (
        <div className="w-full max-w-full space-y-4 overflow-hidden text-black">
            {/* --- DESKTOP VIEW: HEADER & FILTER --- */}
            <div className="hidden items-center justify-between gap-2 md:flex">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            placeholder={trans.placeholder_filter_role || 'Filter role name...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="bg-background border-input text-foreground pl-9"
                        />
                    </div>
                    <DataTableViewOptions table={table} />
                </div>
                <Button onClick={onCreateClick} className="font-semibold shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {trans.btn_create || 'Add Role'}
                </Button>
            </div>

            {/* --- MOBILE VIEW: HEADER & FILTER --- */}
            <div className="flex flex-col gap-3 px-1 md:hidden">
                <div className="flex items-center justify-between gap-2">
                    {/* Ganti text-gray-900 ke text-foreground */}
                    <h2 className="text-foreground text-xl font-bold">{trans.page_title_manage || 'Manage Roles'}</h2>
                    <Button size="icon" onClick={onCreateClick} className="shrink-0 rounded-full shadow-md">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            placeholder={trans.placeholder_filter_role || 'Cari role...'}
                            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
                            className="bg-background border-input text-foreground h-10 pl-9"
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
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="border-border hover:bg-muted/30 transition-colors"
                                >
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
                                    {trans.no_results || 'No results found.'}
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
                                                {trans.label_role_name || 'Role Name'}
                                            </span>
                                            <span className="text-foreground line-clamp-1 text-base font-bold">{original.name || '-'}</span>
                                        </div>
                                        <div className="bg-primary/10 text-primary dark:bg-primary/20 rounded-full p-2">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase">
                                            {trans.label_active_permissions || 'Active Permissions'}
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {original.permissions?.slice(0, 5).map((p: any) => (
                                                <span
                                                    key={p.id}
                                                    className="border-border bg-muted/50 text-foreground rounded border px-2 py-0.5 text-[10px] font-semibold"
                                                >
                                                    {p.name}
                                                </span>
                                            ))}
                                            {original.permissions?.length > 5 && (
                                                <span className="text-muted-foreground self-center text-[10px] font-bold">
                                                    +{original.permissions.length - 5} {trans.label_more || 'more'}
                                                </span>
                                            )}
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
                        {trans.no_results || 'No results found.'}
                    </div>
                )}
            </div>

            <DataTablePagination table={table} />
        </div>
    );
}
