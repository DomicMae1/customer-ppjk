// Role/ManageRoles/table/columns.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Pencil, Trash2, Video } from 'lucide-react';

// Sesuaikan tipe data dengan output backend Anda
export type MasterDocument = {
    id_dokumen: number;
    id_section: number;
    nama_file: string;
    is_internal: boolean;
    is_confirmed: boolean;
    import_mandatory: boolean;
    export_mandatory: boolean;
    is_ori: boolean;
    is_print: boolean;
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

const badgeClass = (active: boolean) =>
    `gap-1.5 px-2.5 py-0.5 font-bold tracking-tight uppercase shadow-sm transition-all ${
        active
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-500'
    }`;

const BooleanBadge = ({ active }: { active: boolean }) => (
    <Badge className={badgeClass(active)}>
        <div className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
        {active ? 'Yes' : 'No'}
    </Badge>
);

export const columns = (
    onEditClick: (id: number) => void,
    onDeleteClick: (id: number) => void,
    trans: Record<string, string>,
): ColumnDef<MasterDocument>[] => [
    {
        id: 'actions',
        cell: ({ row }) => {
            const doc = row.original;

            return (
                <div className="flex items-center justify-start gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-black hover:bg-orange-50 hover:text-orange-700 dark:text-white"
                        onClick={() => onEditClick(doc.id_dokumen)}
                        title={trans.btn_edit || 'Edit'}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Tombol Delete */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDeleteClick(doc.id_dokumen)}
                        title={trans.btn_delete || 'Delete'}
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
        accessorKey: 'is_internal',
        header: trans.label_upload_by || 'Upload By',
        cell: ({ row }) => {
            return <BooleanBadge active={row.original.is_internal} />;
        },
    },
    {
        accessorKey: 'import_mandatory',
        header: trans.label_must_shipping_import || 'Must in Shipping (Import)',
        cell: ({ row }) => <BooleanBadge active={row.original.import_mandatory} />,
    },
    {
        accessorKey: 'export_mandatory',
        header: trans.label_must_shipping_export || 'Must in Shipping (Export)',
        cell: ({ row }) => <BooleanBadge active={row.original.export_mandatory} />,
    },
    {
        accessorKey: 'is_confirmed',
        header: trans.label_requires_verification || 'Requires Verification',
        cell: ({ row }) => <BooleanBadge active={row.original.is_confirmed} />,
    },
    {
        accessorKey: 'is_ori',
        header: trans.label_show_ori_date || 'Show Ori Date',
        cell: ({ row }) => <BooleanBadge active={row.original.is_ori} />,
    },
    {
        accessorKey: 'is_print',
        header: trans.label_show_pdf || 'Show in PDF',
        cell: ({ row }) => <BooleanBadge active={row.original.is_print} />,
    },
    {
        accessorKey: 'is_send_email',
        header: trans.label_send_email || 'Send Email',
        cell: ({ row }) => <BooleanBadge active={row.original.is_send_email} />,
    },
    {
        accessorKey: 'links',
        header: trans.label_links || 'Links',
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
];
