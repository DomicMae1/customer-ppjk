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
    const trans = (props.trans_role || props.trans_company || props.trans_doc || props.trans_customer || {}) as Record<string, string>;
    return (
        <div className="flex flex-col items-center justify-between gap-4 px-2 py-4 text-black sm:flex-row">
            {/* Bagian Baris Terpilih */}
            <div className="text-muted-foreground hidden flex-1 text-sm sm:block">
                {table.getFilteredSelectedRowModel().rows.length} {trans.label_of || 'of'} {table.getFilteredRowModel().rows.length}{' '}
                {trans.label_rows_selected || 'row(s) selected.'}
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
                {/* Rows Per Page */}
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{trans.label_rows_per_page || 'Rows'}</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Page Info */}
                <div className="flex items-center justify-center text-sm font-medium">
                    {trans.label_page || 'Page'} {table.getState().pagination.pageIndex + 1} {trans.label_of || 'of'} {table.getPageCount()}
                </div>

                {/* Navigasi Button */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">{trans.label_first_page || 'Go to first page'}</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        <span className="sr-only">{trans.label_previous_page || 'Go to previous page'}</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        <span className="sr-only">{trans.label_next_page || 'Go to next page'}</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">{trans.label_last_page || 'Go to last page'}</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
