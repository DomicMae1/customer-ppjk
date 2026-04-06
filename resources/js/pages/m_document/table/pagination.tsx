import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePage } from '@inertiajs/react';
import { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
    const { props } = usePage();
    const trans = (props.trans_doc as Record<string, string>) || {};
    return (
        <div className="w-full border-t px-2 py-4">
            <div className="flex items-center justify-between md:hidden">
                {/* Gunakan text-foreground untuk teks utama */}
                <div className="text-foreground text-sm font-medium">
                    {trans.label_page || 'Halaman'} {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="border-border bg-background text-foreground hover:bg-accent h-9 w-9 p-0"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft size={18} />
                    </Button>

                    <Button
                        variant="outline"
                        className="border-border bg-background text-foreground hover:bg-accent h-9 w-9 p-0"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight size={18} />
                    </Button>
                </div>
            </div>

            {/* === DESKTOP VERSION === */}
            <div className="hidden items-center justify-between md:flex">
                {/* text-muted-foreground sudah otomatis adaptif di Shadcn */}
                <div className="text-muted-foreground flex-1 text-sm">
                    {table.getFilteredSelectedRowModel().rows.length} {trans.label_of || 'dari'} {table.getFilteredRowModel().rows.length}{' '}
                    {trans.label_rows_selected || 'baris dipilih'}.
                </div>

                <div className="flex items-center space-x-6 lg:space-x-8">
                    {/* Rows per page - Ganti text-black menjadi text-foreground */}
                    <div className="text-foreground flex items-center space-x-2">
                        <p className="text-sm font-medium">{trans.label_rows_per_page || 'Baris per halaman'}</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger className="border-border bg-background text-foreground h-8 w-[80px]">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top" className="border-border bg-popover text-popover-foreground">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Page indicator - Ganti text-black menjadi text-foreground */}
                    <div className="text-foreground flex w-[120px] items-center justify-center text-sm font-medium">
                        {trans.label_page || 'Halaman'} {table.getState().pagination.pageIndex + 1} {trans.label_of || 'dari'} {table.getPageCount()}
                    </div>

                    {/* Navigation Buttons Desktop */}
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="border-border bg-background text-foreground hover:bg-accent hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">First page</span>
                            <ChevronsLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            className="border-border bg-background text-foreground hover:bg-accent h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Previous page</span>
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            className="border-border bg-background text-foreground hover:bg-accent h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Next page</span>
                            <ChevronRight size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            className="border-border bg-background text-foreground hover:bg-accent hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Last page</span>
                            <ChevronsRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
