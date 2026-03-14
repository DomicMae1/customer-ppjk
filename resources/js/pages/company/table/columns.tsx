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
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-white shadow-sm">
                    {/* PERBAIKAN: Langsung masukkan variabel logo karena sudah berisi URL lengkap dari Controller */}
                    <img
                        src={logo}
                        alt="Logo"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                            // Fallback jika gambar gagal dimuat
                            e.currentTarget.src = '';
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-[8px] text-gray-400">Error</span>';
                        }}
                    />
                </div>
            ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed bg-gray-50 text-[10px] font-medium text-gray-400">
                    {trans.no_logo || 'No Logo'}
                </div>
            );
        },
    },
    {
        accessorKey: 'nama_perusahaan',
        header: trans.label_name || 'Nama Perusahaan',
        cell: ({ row }) => <div className="min-w-[150px] px-4 py-2 font-bold text-gray-900">{row.original.nama_perusahaan}</div>,
    },
    {
        id: 'domain',
        header: trans.label_domain || 'Domain',
        cell: ({ row }) => {
            const domain = (row.original as any).tenant?.domains?.[0]?.domain || '-';
            return (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="h-3 w-3 text-gray-400" />
                    <span>{domain}</span>
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
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                        {/* Action Edit */}
                        <DropdownMenuItem onClick={() => onEditClick(perusahaan)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            {trans.btn_edit || 'Edit'}
                        </DropdownMenuItem>

                        {/* Action Delete */}
                        <DropdownMenuItem
                            onClick={() => onDeleteClick(perusahaan.id_perusahaan)}
                            className="cursor-pointer text-red-600 focus:text-red-700"
                        >
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            {trans.btn_delete || 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
