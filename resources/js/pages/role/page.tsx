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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={trans_role.page_title_manage || 'Manage Roles'} />
            <div className="space-y-6 p-4 sm:p-6">
                {/* Table */}
                <div className="">
                    <DataTable columns={columns(onEditClick, onDeleteClick, trans_role)} data={roles} onCreateClick={handleCreateClick} />
                </div>
            </div>

            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogContent className="max-w-[90vw] rounded-xl text-black sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{trans_role.title_delete || 'Delete Role'}</DialogTitle>
                        <div className="text-muted-foreground mt-2 text-sm">
                            {trans_role.text_delete_confirm_role || 'Are you sure you want to delete this role?'}
                        </div>
                    </DialogHeader>
                    <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                        <Button type="button" variant="secondary" onClick={() => setOpenDelete(false)}>
                            {trans_role.btn_cancel || 'Cancel'}
                        </Button>
                        <Button type="button" variant="destructive" className="text-white" onClick={onConfirmDelete}>
                            {trans_role.btn_delete || 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={openForm} onOpenChange={setOpenForm}>
                <DialogContent className="max-h-[90vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {selectedRole ? trans_role.title_edit_role || 'Edit Role' : trans_role.title_create_role || 'Add Role'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="roleName" className="text-sm font-semibold">
                                {trans_role.label_role_name || 'Role Name'}
                            </Label>
                            <Input
                                id="roleName"
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                placeholder={trans_role.placeholder_role_name || 'Enter role name'}
                                className="h-10"
                            />
                        </div>

                        <div className="grid gap-3">
                            <Label className="text-sm font-semibold">{trans_role.label_permissions || 'Permissions'}</Label>
                            <div className="rounded-xl border bg-gray-50/30 p-1 sm:p-2">
                                <div className="max-h-[40vh] space-y-6 overflow-y-auto p-3 sm:p-4">
                                    {Object.entries(permissions).map(([model, modelPermissions]: [string, any]) => (
                                        <div key={model} className="rounded-lg border bg-white p-3 text-black shadow-sm sm:p-4">
                                            <div className="mb-4 flex items-center justify-between border-b pb-2">
                                                <h3 className="text-sm font-bold text-gray-800 capitalize">{model.replace(/-/g, ' ')}</h3>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`select-all-${model}`}
                                                        checked={isAllSelected(model) ? true : isSomeSelected(model) ? 'indeterminate' : false}
                                                        onCheckedChange={(checked) => handleSelectAllChange(model, !!checked)}
                                                    />
                                                    <Label htmlFor={`select-all-${model}`} className="cursor-pointer text-xs font-medium">
                                                        {trans_role.label_select_all || 'Select All'}
                                                    </Label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                {modelPermissions.map((permission: string) => (
                                                    <div key={permission} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={permission}
                                                            checked={selectedPermissions.includes(permission)}
                                                            onCheckedChange={() => handlePermissionChange(permission)}
                                                        />
                                                        <Label htmlFor={permission} className="cursor-pointer text-xs text-gray-600 capitalize">
                                                            {permission.split('-')[0]}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" className="h-10 w-full sm:w-auto">
                                {trans_role.btn_cancel || 'Cancel'}
                            </Button>
                        </DialogClose>
                        <Button type="button" onClick={onSubmit} className="h-10 w-full font-bold sm:w-auto">
                            {selectedRole ? trans_role.btn_save_changes : trans_role.btn_create}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
