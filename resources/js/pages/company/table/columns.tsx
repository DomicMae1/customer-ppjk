// Role/ManageRoles/table/columns.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Perusahaan } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

export const columns = (onEditClick: (perusahaan: Perusahaan) => void, onDeleteClick: (id: number) => void): ColumnDef<Perusahaan>[] => [
    {
        accessorKey: 'path_company_logo',
        header: 'Logo',
        cell: ({ row }) => {
            const logo = row.original.path_company_logo;
            return logo ? (
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-gray-50">
                    <img src={`/storage/${logo}`} alt="Logo" className="h-full w-full object-contain" />
                </div>
            ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-gray-50 text-[10px] text-gray-400">
                    No Logo
                </div>
            );
        },
    },
    {
        accessorKey: 'nama_perusahaan',
        header: 'Nama Perusahaan',
        cell: ({ row }) => <div className="min-w-[150px] px-4 py-2 font-semibold">{row.original.nama_perusahaan}</div>,
    },
    {
        id: 'domain',
        header: 'Domain',
        cell: ({ row }) => {
            const domain = (row.original as any).tenant?.domains?.[0]?.domain || '-';
            return <div className="text-sm text-gray-600">{domain}</div>;
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
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(perusahaan)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClick(perusahaan.id_perusahaan)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
