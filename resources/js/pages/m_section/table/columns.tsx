import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

export type SectionRow = {
    id_section: number;
    section_name: string;
    section_order: number;
    is_penjaluran?: boolean;
    attribute_section?: boolean | string | null;
    is_checklist?: boolean;
    created_at?: string;
    updated_at?: string;
};

export const columns = (
    onEditClick: (id: number) => void,
    onDeleteClick: (id: number) => void,
    trans: Record<string, string>,
): ColumnDef<SectionRow>[] => [
    {
        id: 'actions',
        cell: ({ row }) => {
            const section = row.original;

            return (
                <div className="flex items-center justify-start gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-black hover:bg-orange-50 hover:text-orange-700 dark:text-white"
                        onClick={() => onEditClick(section.id_section)}
                        title={trans.btn_edit || 'Edit'}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Tombol Delete */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDeleteClick(section.id_section)}
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
        accessorKey: 'section_name',
        header: trans.label_section_name || 'Nama Section',
        cell: ({ row }) => (
            <div className="flex flex-col px-2 py-2">
                <span className="font-medium">{row.original.section_name}</span>
            </div>
        ),
    },
    {
        accessorKey: 'attribute_section',
        header: trans.label_attribute || 'Tipe Dokumen',
        cell: ({ row }) => {
            const value = row.original.attribute_section;

            const isMandatory = value === true || value === 'mandatory' || value === '1';

            return (
                <Badge variant={isMandatory ? 'default' : 'secondary'}>
                    {isMandatory ? trans.option_mandatory || 'Mandatory' : trans.option_non_mandatory || 'Non Mandatory'}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'is_checklist',
        header: trans.label_is_checklist || 'Special Section',
        cell: ({ row }) => {
            const isChecklist = !!row.original.is_checklist;

            return (
                <Badge
                    variant={isChecklist ? 'secondary' : 'outline'}
                    className={isChecklist ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                >
                    {isChecklist ? trans.option_checklist || 'Yes (Checklist)' : trans.option_no_checklist || 'No'}
                </Badge>
            );
        },
    },
];
