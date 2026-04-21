// Role/ManageRoles/table/columns.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, MoreHorizontal, Pencil, Trash2, Video } from 'lucide-react';

// Sesuaikan tipe data dengan output backend Anda
export type MasterDocument = {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    is_internal: boolean;
    is_confirmed: boolean;
    attribute: boolean;
    is_ori: boolean;
    link_path_example_file: string | null;
    link_path_template_file: string | null;
    link_url_video_file: string | null;
    description_file: string | null;
    updated_by: number;
    created_at: string;
    updated_at: string;
    section?: {
        id_section: number;
        section_name: string;
    };
};

export const columns = (
    onEditClick: (id: number) => void,
    onDeleteClick: (id: number) => void,
    trans: Record<string, string>,
): ColumnDef<MasterDocument>[] => [
    {
        id: 'rowNumber',
        header: 'No.',
        cell: ({ row }) => <div className="px-2 py-2 font-medium">{row.index + 1}</div>,
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'nama_file',
        header: trans.label_doc_name || 'Nama Dokumen',
        cell: ({ row }) => (
            <div className="flex flex-col px-2 py-2">
                <span className="font-medium">{row.original.nama_file}</span>
                <span className="text-muted-foreground text-xs">
                    {trans.label_section || 'Section'}: {row.original.section?.section_name ?? row.original.id_section}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'description_file',
        header: trans.label_description || 'Deskripsi',
        cell: ({ row }) => (
            <div className="text-muted-foreground max-w-[300px] truncate py-2 text-sm" title={row.original.description_file || ''}>
                {row.original.description_file || '-'}
            </div>
        ),
    },
    {
        accessorKey: 'is_internal',
        header: trans.label_status || 'Status',
        cell: ({ row }) => {
            const isInternal = row.original.is_internal;
            return (
                <Badge
                    variant={isInternal ? 'default' : 'secondary'}
                    className={
                        isInternal
                            ? 'border-amber-200 bg-amber-100 text-amber-700 shadow-none hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'border-blue-200 bg-blue-100 text-blue-700 shadow-none hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }
                >
                    {isInternal ? trans.btn_internal || 'Internal' : trans.btn_external || 'Public'}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'is_confirmed',
        header: trans.label_need_confirm || 'Need Confirm',
        cell: ({ row }) => {
            const isConfirmed = row.original.is_confirmed;
            return (
                <Badge
                    variant={isConfirmed ? 'destructive' : 'outline'}
                    className={
                        isConfirmed
                            ? 'border-red-200 bg-red-100 text-red-700 shadow-none hover:bg-red-200 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'text-muted-foreground border-border font-medium'
                    }
                >
                    {isConfirmed ? trans.btn_yes || 'Ya' : trans.btn_no || 'Tidak'}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'is_ori',
        header: trans.label_is_ori || 'Is Original',
        cell: ({ row }) => {
            const isOri = row.original.is_ori;
            return (
                <Badge
                    variant={isOri ? 'default' : 'outline'}
                    className={`gap-1.5 px-2.5 py-0.5 font-bold tracking-tight uppercase shadow-sm transition-all ${
                        isOri
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-500'
                    }`}
                >
                    <div className={`h-1.5 w-1.5 rounded-full ${isOri ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
                    {isOri ? trans.btn_yes || 'Ya' : trans.btn_no || 'Tidak'}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'links',
        header: 'Links',
        cell: ({ row }) => {
            const { link_url_video_file, link_path_template_file } = row.original;
            return (
                <div className="flex gap-2">
                    {link_url_video_file && (
                        <a
                            href={link_url_video_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title={trans.label_video_link || 'Tonton Video'}
                        >
                            <Video className="h-4 w-4" />
                        </a>
                    )}
                    {link_path_template_file && (
                        <span className="text-muted-foreground" title="Template Available">
                            <FileText className="h-4 w-4" />
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const doc = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{trans.label_open_menu || 'Open menu'}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(doc.id_dokumen)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {trans.btn_edit || 'Edit'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClick(doc.id_dokumen)} className="text-red-600 focus:text-red-700">
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            {trans.btn_delete || 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
