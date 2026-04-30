/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Role, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { columns } from './table/columns';
import { DataTable } from './table/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManageRoles() {
    const { roles, permissions, flash, trans_role } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: trans_role.page_title_manage || 'Manage Role',
            href: '/role-manager',
        },
    ];

    const [openDelete, setOpenDelete] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [roleIdToDelete, setRoleIdToDelete] = useState<number | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedRoleType, setSelectedRoleType] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleCreateClick = () => {
        setSelectedRole(null);
        setRoleName('');
        setSelectedRoleType('');
        setSelectedPermissions([]);
        setOpenForm(true);
    };

    const onDeleteClick = (id: number) => {
        setRoleIdToDelete(id);
        setOpenDelete(true);
    };

    const onEditClick = (role: Role) => {
        setSelectedRole(role);
        setRoleName(role.name);
        setSelectedRoleType(role.role_type || '');
        setSelectedPermissions(role.permissions.map((perm) => perm.name));
        setOpenForm(true);
    };

    const isAllSelected = (model: string) => {
        const modelPermissions = permissions[model];
        return modelPermissions.every((perm) => selectedPermissions.includes(perm));
    };

    const isSomeSelected = (model: string) => {
        const modelPermissions = permissions[model];
        const selectedCount = modelPermissions.filter((perm) => selectedPermissions.includes(perm)).length;
        return selectedCount > 0 && selectedCount < modelPermissions.length;
    };

    const handleSelectAllChange = (model: string, checked: boolean) => {
        const modelPermissions = permissions[model];

        if (checked) {
            const newPermissions = Array.from(new Set([...selectedPermissions, ...modelPermissions]));
            setSelectedPermissions(newPermissions);
        } else {
            const newPermissions = selectedPermissions.filter((perm) => !modelPermissions.includes(perm));
            setSelectedPermissions(newPermissions);
        }
    };

    const onConfirmDelete = () => {
        if (roleIdToDelete) {
            router.delete(`/role-manager/${roleIdToDelete}`, {
                onSuccess: () => {
                    setOpenDelete(false);
                    setRoleIdToDelete(null);
                    toast.success(trans_role.toast_delete_success || 'Role deleted');
                },
                onError: (errors) => {
                    console.error('❌ Error saat menghapus role:', errors);
                },
            });
        }
    };

    const onSubmit = () => {
        const data = {
            name: roleName,
            role_type: selectedRoleType,
            permissions: selectedPermissions,
        };

        if (selectedRole) {
            router.put(`/role-manager/${selectedRole.id}`, data, {
                onSuccess: () => {
                    setOpenForm(false);
                    setSelectedRole(null);
                    setRoleName('');
                    setSelectedPermissions([]);
                    toast.success(selectedRole ? trans_role.toast_update_success : trans_role.toast_create_success);
                },
                onError: (errors) => {
                    console.error('❌ Error saat mengupdate role:', errors);
                },
            });
        } else {
            router.post('/role-manager', data, {
                onSuccess: () => {
                    setOpenForm(false);
                    setRoleName('');
                    setSelectedPermissions([]);
                    toast.success(selectedRole ? trans_role.toast_update_success : trans_role.toast_create_success);
                },
                onError: (errors) => {
                    console.error('❌ Error saat menambah role:', errors);
                },
            });
        }
    };

    const handlePermissionChange = (permission: string) => {
        if (selectedPermissions.includes(permission)) {
            setSelectedPermissions(selectedPermissions.filter((perm) => perm !== permission));
        } else {
            setSelectedPermissions([...selectedPermissions, permission]);
        }
    };

    const [searchTerm, setSearchTerm] = useState('');

    const filteredPermissions = Object.entries(permissions).filter(([model]) =>
        model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPermissionColor = (name: string) => {
        const action = name.split('-')[0];
        switch (action) {
            case 'view': return 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
            case 'create': return 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800';
            case 'update': return 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
            case 'delete': return 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800';
            default: return 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={trans_role.page_title_manage || 'Manage Roles'} />
            <div className="space-y-6 p-4 sm:p-8">
                {/* Header & Table Section */}
                <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
                    <DataTable columns={columns(onEditClick, onDeleteClick, trans_role)} data={roles} onCreateClick={handleCreateClick} />
                </div>
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                {/* ... (Existing Delete Dialog Content remains same) ... */}
                <DialogContent className="border-border bg-background text-foreground max-w-[90vw] rounded-2xl p-6 sm:max-w-md shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold">{trans_role.title_delete || 'Delete Role'}</DialogTitle>
                        <div className="text-muted-foreground mt-2 text-sm leading-relaxed">
                            {trans_role.text_delete_confirm_role || 'Are you sure you want to delete this role?'}
                        </div>
                    </DialogHeader>

                    <DialogFooter className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="ghost" onClick={() => setOpenDelete(false)} className="w-full sm:w-auto">
                            {trans_role.btn_cancel || 'Cancel'}
                        </Button>
                        <Button type="button" variant="destructive" className="w-full font-bold shadow-lg shadow-rose-500/20 sm:w-auto" onClick={onConfirmDelete}>
                            {trans_role.btn_delete || 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={openForm} onOpenChange={setOpenForm}>
                <DialogContent className="border-border bg-background/95 backdrop-blur-xl text-foreground max-h-[95vh] max-w-[95%] overflow-hidden flex flex-col rounded-3xl p-0 sm:max-w-4xl shadow-2xl border-white/20">
                    <DialogHeader className="p-6 border-b bg-muted/30">
                        <DialogTitle className="text-foreground text-2xl font-black tracking-tight">
                            {selectedRole ? trans_role.title_edit_role || 'Edit Role' : trans_role.title_create_role || 'Add Role'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Role Name Input */}
                        <div className="space-y-3">
                            <Label htmlFor="roleName" className="text-foreground text-sm font-bold uppercase tracking-wider">
                                {trans_role.label_role_name || 'Role Name'}
                            </Label>
                            <Input
                                id="roleName"
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                placeholder={trans_role.placeholder_role_name || 'Enter role name'}
                                className="bg-background/50 border-input text-lg h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                            />
                        </div>

                        {/* Role Type Dropdown (Added) */}
                        <div className="space-y-3">
                            <Label htmlFor="roleType" className="text-foreground text-sm font-bold uppercase tracking-wider">
                                {trans_role.label_role_type || 'Role Type'}
                            </Label>
                            <Select value={selectedRoleType} onValueChange={setSelectedRoleType}>
                                <SelectTrigger className="bg-background/50 border-input text-lg h-12 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl">
                                    <SelectValue placeholder="Select role type" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border text-foreground">
                                    <SelectItem value="internal">Internal</SelectItem>
                                    <SelectItem value="eksternal">Eksternal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Label className="text-foreground text-sm font-bold uppercase tracking-wider">{trans_role.label_permissions || 'Permissions'}</Label>
                                <div className="relative w-full max-w-xs">
                                    <Input
                                        placeholder="Search module..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-9 text-xs rounded-full bg-muted/50"
                                    />
                                </div>
                            </div>

                            {/* Grid of Permissions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredPermissions.map(([model, modelPermissions]: [string, any]) => (
                                    <div key={model} className="group border-border bg-card/50 hover:bg-card hover:shadow-md transition-all rounded-2xl border p-5 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-foreground text-base font-bold capitalize flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-primary" />
                                                {model.replace(/-/g, ' ')}
                                            </h3>
                                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-white/10">
                                                <Checkbox
                                                    id={`select-all-${model}`}
                                                    checked={isAllSelected(model) ? true : isSomeSelected(model) ? 'indeterminate' : false}
                                                    onCheckedChange={(checked) => handleSelectAllChange(model, !!checked)}
                                                    className="rounded-sm border-primary/50 data-[state=checked]:bg-primary"
                                                />
                                                <Label
                                                    htmlFor={`select-all-${model}`}
                                                    className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-bold uppercase tracking-tighter"
                                                >
                                                    {trans_role.label_select_all || 'Select All'}
                                                </Label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {modelPermissions.map((permission: string) => (
                                                <div
                                                    key={permission}
                                                    onClick={() => handlePermissionChange(permission)}
                                                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${selectedPermissions.includes(permission)
                                                        ? getPermissionColor(permission)
                                                        : 'bg-muted/20 border-transparent text-muted-foreground grayscale opacity-60'
                                                        }`}
                                                >
                                                    <Checkbox
                                                        id={permission}
                                                        checked={selectedPermissions.includes(permission)}
                                                        className="hidden"
                                                    />
                                                    <span className="text-[11px] font-black uppercase tracking-widest flex-1">
                                                        {permission.split('-')[0]}
                                                    </span>
                                                    {selectedPermissions.includes(permission) && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t bg-muted/30 backdrop-blur-md flex gap-3">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-12 px-8 rounded-xl font-bold"
                            >
                                {trans_role.btn_cancel || 'Cancel'}
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={onSubmit}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-10 rounded-xl font-black text-base shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {selectedRole ? trans_role.btn_save_changes : trans_role.btn_create}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
