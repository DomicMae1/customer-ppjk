// Role/ManageRoles/table/columns.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Role } from '@/types';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export const columns = (onEditClick: (role: Role) => void, onDeleteClick: (id: number) => void, trans: Record<string, string>): ColumnDef<Role>[] => [
    {
        accessorKey: 'name',
        // Gunakan translasi untuk header
        header: trans.label_role_name || 'Role Name',
        cell: ({ row }) => <div className="min-w-[150px] px-2 py-2 font-medium">{row.original.name}</div>,
    },
    {
        accessorKey: 'permissions',
        header: trans.label_permissions || 'Permissions',
        cell: ({ row }) => {
            const permissions = row.original.permissions;
            const maxPermissionsToShow = 4;

            const displayedPermissions = permissions.slice(0, maxPermissionsToShow);
            const hasMorePermissions = permissions.length > maxPermissionsToShow;

            return (
                <div className="flex max-w-[800px] items-center gap-2 2xl:max-w-[1440px]">
                    {displayedPermissions.map((perm) => (
                        <Badge key={perm.id} className="text-[10px] font-medium" variant="outline">
                            {perm.name}
                        </Badge>
                    ))}
                    {hasMorePermissions && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground hover:text-primary cursor-pointer text-xs font-bold">
                                        +{permissions.length - maxPermissionsToShow}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-2xl border bg-zinc-950 p-4 shadow-xl 2xl:max-w-7xl">
                                    <div className="flex flex-wrap gap-2">
                                        {permissions.map((perm) => (
                                            <Badge key={perm.id} className="text-[10px]" variant="secondary">
                                                {perm.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const role = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                        {/* Edit Action */}
                        <DropdownMenuItem onClick={() => onEditClick(role)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            {trans.btn_edit || 'Edit'}
                        </DropdownMenuItem>

                        {/* Delete Action */}
                        <DropdownMenuItem onClick={() => onDeleteClick(role.id)} className="cursor-pointer text-red-600 focus:text-red-700">
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                            {trans.btn_delete || 'Delete'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
