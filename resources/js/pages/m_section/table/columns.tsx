import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export type SectionRow = {
    id_section: number;
    section_name: string;
    section_order: number;
    is_penjaluran?: boolean;
    attribute_section?: boolean | string | null;
    created_at?: string;
    updated_at?: string;
};

export const columns = (
    onEditClick: (id: number) => void,
    onDeleteClick: (id: number) => void,
    trans: Record<string, string>,
): ColumnDef<SectionRow>[] => [
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
        id: 'actions',
        cell: ({ row }) => {
            const section = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{trans.label_open_menu || 'Open menu'}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditClick(section.id_section)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {trans.btn_edit || 'Edit'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteClick(section.id_section)} className="text-red-600 focus:text-red-700">
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            {trans.btn_delete || 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
