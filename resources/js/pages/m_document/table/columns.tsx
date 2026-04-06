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
    attribute: boolean;
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
                <Badge variant={isInternal ? 'default' : 'secondary'}>
                    {isInternal ? trans.btn_internal || 'Internal' : trans.btn_external || 'Public'}
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
