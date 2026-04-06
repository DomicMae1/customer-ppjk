/* eslint-disable @typescript-eslint/no-explicit-any */
// Role/ManageRoles/table/columns.tsx
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Perusahaan } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { Globe, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export const columns = (
    onEditClick: (perusahaan: Perusahaan) => void,
    onDeleteClick: (id: number) => void,
    trans: Record<string, string>,
): ColumnDef<Perusahaan>[] => [
    {
        accessorKey: 'path_company_logo',
        header: trans.label_logo || 'Logo',
        cell: ({ row }) => {
            const logo = row.original.path_company_logo;
            return logo ? (
                /* bg-white dipertahankan untuk kontainer logo agar logo berwarna gelap tetap terlihat, 
                   namun border disesuaikan agar tidak terlalu terang di dark mode */
                <div className="border-border flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-white shadow-sm dark:bg-zinc-200">
                    <img
                        src={logo}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-[8px] text-muted-foreground">${trans.error || 'Error'}</span>`;
                        }}
                    />
                </div>
            ) : (
                /* Menggunakan bg-muted dan text-muted-foreground untuk fallback logo */
                <div className="border-border bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-[10px] font-medium">
                    {trans.no_logo || 'No Logo'}
                </div>
            );
        },
    },
    {
        accessorKey: 'nama_perusahaan',
        header: trans.label_name || 'Nama Perusahaan',
        cell: ({ row }) => <div className="text-foreground min-w-[150px] px-4 py-2 font-bold">{row.original.nama_perusahaan}</div>,
    },
    {
        id: 'domain',
        header: trans.label_domain || 'Domain',
        cell: ({ row }) => {
            const domain = (row.original as any).tenant?.domains?.[0]?.domain || '-';
            return (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Globe className="text-muted-foreground/70 h-3 w-3" />
                    <span className="text-foreground/80">{domain}</span>
                </div>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const perusahaan = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={() => onEditClick(perusahaan)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            {trans.btn_edit || 'Edit'}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => onDeleteClick(perusahaan.id_perusahaan)}
                            className="text-destructive focus:text-destructive cursor-pointer dark:text-red-400 dark:focus:text-red-300"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {trans.btn_delete || 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
