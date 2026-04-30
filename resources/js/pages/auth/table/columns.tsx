/* eslint-disable @typescript-eslint/no-explicit-any */
// Users/table/columns.tsx
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

export const columns = (onDeleteClick: (id: number) => void, onEditClick: (id: number) => void, t: Record<string, string>): ColumnDef<User>[] => [
    {
        id: 'actions',
        header: '', // Opsional: Header untuk kolom aksi
        cell: ({ row }) => {
            const user = row.original;
            const userId = (user as any).id_user || user.id;

            return (
                <div className="flex items-center justify-start gap-2">
                    {/* Tombol Edit */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-black hover:bg-orange-50 hover:text-orange-700 dark:text-white"
                        onClick={() => onEditClick(userId)}
                        title={t.btn_edit || 'Edit'}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Tombol Delete */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDeleteClick(userId)}
                        title={t.btn_delete || 'Hapus'}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            );
        },
    },
    {
        id: 'rowNumber',
        header: 'No.',
        cell: ({ row }) => <div className="px-2 py-2 font-medium">{row.index + 1}</div>,
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'name',
        header: t.label_name, // Mengambil dari trans_auth.label_name
        cell: ({ row }) => <div className="py-2">{row.original.name}</div>,
    },
    {
        accessorKey: 'email',
        header: t.label_email, // Mengambil dari trans_auth.label_email
        cell: ({ row }) => <div className="py-2">{row.original.email}</div>,
    },
    {
        accessorKey: 'roles',
        header: t.header_roles, // Perlu ditambahkan di file bahasa (lihat langkah 2)
        cell: ({ row }) => {
            const roles = row.original.roles;
            return <div className="py-2">{roles.map((role) => role.name).join(', ')}</div>;
        },
    },
];
