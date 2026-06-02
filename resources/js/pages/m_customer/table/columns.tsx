// m_customer/table/columns.tsx

import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
// Pastikan path import Customer benar.
// Jika terjadi circular dependency, pindahkan interface Customer ke @/types/index.ts
import { Customer } from '../page';

// PERBAIKAN: Ubah parameter callback menjadi (customer: Customer) bukan (id: number)
export const columns = (
    onEditClick: (customer: Customer) => void,
    onDeleteClick: (customer: Customer) => void,
    trans: Record<string, string>,
): ColumnDef<Customer>[] => {
    return [
        {
            id: 'actions',
            header: '', // Biasanya aksi tidak butuh teks header di desktop
            cell: ({ row }) => {
                const customer = row.original;

                return (
                    <div className="flex items-center justify-start gap-2">
                        {/* Tombol Edit */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-black hover:bg-orange-50 hover:text-orange-700 dark:text-white"
                            onClick={() => onEditClick(customer)}
                            title={trans.title_edit || 'Edit'}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Tombol Delete */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => onDeleteClick(customer)}
                            title={trans.title_delete || 'Hapus'}
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
            accessorKey: 'nama_perusahaan',
            // Gunakan translasi untuk header
            header: trans.label_company_name || 'Nama Perusahaan',
        },
        {
            accessorKey: 'type',
            header: trans.label_type || 'Tipe',
            cell: ({ row }) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        row.original.type === 'internal' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}
                >
                    {row.original.type}
                </span>
            ),
        },
        {
            accessorKey: 'email_to',
            header: trans.label_email_to || 'Email To',
            cell: ({ row }) => {
                const emails = row.original.email_to ?? [];

                return (
                    <div className="grid max-w-[350px] grid-cols-2 gap-1">
                        {emails.length > 0 ? (
                            emails.map((email, index) => (
                                <span
                                    key={index}
                                    className="dark:bg-accent max-w-full rounded-xl bg-blue-200 px-2 py-0.5 text-xs break-words text-black dark:text-white"
                                >
                                    {email}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'email_cc',
            header: trans.label_email_cc || 'Email CC',
            cell: ({ row }) => {
                const emails = row.original.email_cc ?? [];

                return (
                    <div className="grid max-w-[350px] grid-cols-2 gap-1">
                        {emails.length > 0 ? (
                            emails.map((email, index) => (
                                <span
                                    key={index}
                                    className="dark:bg-accent max-w-full rounded-xl bg-blue-200 px-2 py-0.5 text-xs break-words text-black dark:text-white"
                                >
                                    {email}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'nama', // Nama PIC
            header: trans.label_pic_name || 'PIC',
            cell: ({ row }) => <span className="font-medium">{row.original.nama}</span>,
        },
        {
            accessorKey: 'no_npwp', // GANTI dari no_telp ke no_npwp
            header: trans.label_npwp || 'NPWP',
            cell: ({ row }) => <code className="text-muted-foreground text-xs">{row.original.no_npwp || '-'}</code>,
        },
        {
            accessorKey: 'nib',
            header: 'NIB',
            cell: ({ row }) => <code className="text-muted-foreground text-xs">{row.original.nib || '-'}</code>,
        },
        {
            id: 'ceisa_profile',
            header: 'CEISA',
            cell: ({ row }) => {
                const customer = row.original;
                const isReady = Boolean(customer.nama_perusahaan && (customer.no_npwp_16 || customer.no_npwp) && customer.nib && customer.alamat_lengkap);

                return (
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isReady
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        }`}
                    >
                        {isReady ? 'Siap' : 'Belum lengkap'}
                    </span>
                );
            },
        },
    ];
};
