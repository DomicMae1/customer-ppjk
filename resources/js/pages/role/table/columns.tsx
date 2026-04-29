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
            const maxPermissionsToShow = 5;

            const displayedPermissions = permissions.slice(0, maxPermissionsToShow);
            const hasMorePermissions = permissions.length > maxPermissionsToShow;

            const getBadgeStyles = (name: string) => {
                const action = name.split('-')[0];
                switch (action) {
                    case 'view': return 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
                    case 'create': return 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
                    case 'update': return 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
                    case 'delete': return 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
                    default: return 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';
                }
            };

            return (
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {displayedPermissions.map((perm) => (
                        <Badge 
                            key={perm.id} 
                            variant="outline"
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border shadow-sm transition-all hover:scale-105 ${getBadgeStyles(perm.name)}`}
                        >
                            {perm.name}
                        </Badge>
                    ))}
                    {hasMorePermissions && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="cursor-pointer bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-md">
                                        +{permissions.length - maxPermissionsToShow}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md border-border bg-background/95 backdrop-blur-md p-3 shadow-2xl rounded-xl">
                                    <div className="flex flex-wrap gap-1.5">
                                        {permissions.map((perm) => (
                                            <Badge 
                                                key={perm.id} 
                                                variant="outline"
                                                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${getBadgeStyles(perm.name)}`}
                                            >
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
