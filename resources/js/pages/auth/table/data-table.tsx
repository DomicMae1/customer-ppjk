/* eslint-disable @typescript-eslint/no-explicit-any */
// Users/table/data-table.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, usePage } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import * as React from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

interface Role {
    id: number;
    name: string;
}
interface Perusahaan {
    id: number;
    nama_perusahaan: string;
}

interface Customer {
    id: number;
    nama_perusahaan: string;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { roles, companies, customers, trans_auth } = usePage().props as unknown as {
        roles: Role[];
        companies: Perusahaan[];
        customers: Customer[];
        trans_auth: Record<string, string>;
    };

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [openCreate, setOpenCreate] = React.useState(false);
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
    const [selectedRole, setSelectedRole] = React.useState<string>('');
    const [selectedRoleInternal, setSelectedRoleInternal] = React.useState<string>('');
    const [selectedCompany, setSelectedCompany] = React.useState<string>('');
    const [selectedCustomer, setSelectedCustomer] = React.useState<string>('');

    const [filterValue, setFilterValue] = React.useState('');

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    React.useEffect(() => {
        table.getColumn('name')?.setFilterValue(filterValue);
    }, [filterValue, table]);

    const onSubmitCreate = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Basic Validation (All fields required)
        if (!name || !email || !password || !passwordConfirmation) {
            console.error('All text fields are required.');
            alert(trans_auth.validation_required); // Translate
            return;
        }

        if (password !== passwordConfirmation) {
            console.error('Password mismatch.');
            alert(trans_auth.validation_password_mismatch); // Translate
            return;
        }

        // 2. Validate Company & User Type Selection
        if (!selectedCompany) {
            alert(trans_auth.validation_company_required); // Translate
            return;
        }

        // Note: 'selectedRole' here refers to the User Type dropdown (Internal/External)
        if (!selectedRole) {
            alert(trans_auth.validation_type_required); // Translate
            return;
        }

        // 3. Specific Validation based on User Type
        let roleNameToSend = '';

        if (selectedRole === 'internal') {
            if (!selectedRoleInternal) {
                alert(trans_auth.validation_role_required); // Translate
                return;
            }
            // Find role name from ID
            const foundRole = roles.find((r) => String(r.id) === selectedRoleInternal);
            roleNameToSend = foundRole ? foundRole.name : '';
        } else if (selectedRole === 'external') {
            if (!selectedCustomer) {
                alert(trans_auth.validation_customer_required); // Translate
                return;
            }
            // Default role for external users
            roleNameToSend = 'customer';
        }

        // 4. Construct Payload
        const data = {
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,

            // Relational Data
            id_perusahaan: Number(selectedCompany), // Always send company ID
            id_customer: selectedRole === 'external' ? Number(selectedCustomer) : null, // Send customer ID only if external

            // Role Data
            role: roleNameToSend, // Sends 'staff'/'manager'/'supervisor' OR 'customer'

            // Optional: Send type helper if backend needs it
            user_type: selectedRole,
        };

        // 5. Submit
        router.post('/users', data, {
            onSuccess: () => {
                setOpenCreate(false);
                // Reset Form State
                setName('');
                setEmail('');
                setPassword('');
                setPasswordConfirmation('');
                setSelectedCompany('');
                setSelectedRole(''); // Reset User Type
                setSelectedRoleInternal('');
                setSelectedCustomer('');
            },
            onError: (errors) => {
                console.error('❌ Error creating user:', errors);
                alert(trans_auth.error_create); // Optional translation for general error
            },
        });
    };

    return (
        <div>
            <div className="hidden items-center gap-2 pb-4 md:flex">
                <div className="flex gap-2">
                    <Input
                        placeholder={trans_auth.filter_placeholder} // Translate
                        value={filterValue}
                        onChange={(event) => {
                            setFilterValue(event.target.value);
                        }}
                        className="max-w-sm"
                    />
                </div>

                <DataTableViewOptions table={table} />
                <Button className="h-9" onClick={() => setOpenCreate(true)}>
                    {trans_auth.add_button} {/* Translate */}
                </Button>
            </div>

            {/* --- MOBILE HEADER (Compact) --- */}
            <div className="flex items-center justify-between gap-2 pb-4 md:hidden">
                <Input
                    placeholder={trans_auth.filter_placeholder}
                    value={filterValue}
                    onChange={(event) => {
                        setFilterValue(event.target.value);
                    }}
                    className="w-full"
                />
                <Button size="icon" className="shrink-0" onClick={() => setOpenCreate(true)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            {/* --- MOBILE VIEW: CARD LAYOUT --- */}
            <div className="flex flex-col gap-4 md:hidden">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const original = row.original as any;
                        const actionsCell = row.getVisibleCells().find((cell) => cell.column.id === 'actions');

                        return (
                            <div key={row.id} className="border-border bg-card rounded-lg border p-4 shadow-sm">
                                {/* Header Card: Name & Role/Type */}
                                <div className="border-border mb-3 flex items-start justify-between border-b pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-foreground text-base font-bold">{original.name}</span>
                                        <span className="text-muted-foreground text-xs font-medium">{original.role}</span>
                                    </div>
                                    {actionsCell && (
                                        <div className="text-foreground">
                                            {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                                        </div>
                                    )}
                                </div>

                                {/* Body Card: Details */}
                                <div className="text-muted-foreground space-y-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground/70 text-xs">{trans_auth.label_email}</span>
                                        <span className="text-foreground font-medium">{original.email}</span>
                                    </div>

                                    {original.nama_perusahaan && (
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground/70 text-xs">{trans_auth.label_company}</span>
                                            <span className="text-foreground">{original.nama_perusahaan}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground border-border rounded-lg border-2 border-dashed py-8 text-center">
                        {trans_auth.no_results}
                    </div>
                )}
            </div>

            {/* --- DESKTOP VIEW: TABLE --- */}
            <div className="border-border bg-card hidden overflow-hidden rounded-md border md:block">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-muted-foreground font-bold">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="border-border hover:bg-muted/50 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-foreground">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                                    {trans_auth.no_results}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} />

            {/* Dialog Tambah User */}
            <Dialog
                open={openCreate}
                onOpenChange={(open) => {
                    setOpenCreate(open);
                    if (!open) {
                        setName('');
                        setEmail('');
                        setPassword('');
                        setPasswordConfirmation('');
                        setSelectedRole('');
                        setSelectedCompany('');
                        setSelectedRoleInternal('');
                        setSelectedCustomer('');
                    }
                }}
            >
                {/* Optimasi Mobile: 
        1. max-w-[95%] agar tidak menempel ke pinggir layar hp.
        2. max-h-[90vh] dan overflow-y-auto agar form bisa di-scroll jika layar pendek atau keyboard muncul.
    */}
                <DialogContent className="border-border bg-background text-foreground max-h-[90vh] max-w-[95%] overflow-y-auto rounded-xl p-4 sm:max-w-md sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold">{trans_auth.title_create}</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">{trans_auth.desc_create}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={onSubmitCreate} className="mt-4 space-y-5">
                        {/* --- Bagian Relasi --- */}
                        {/* bg-muted/50 memberikan kontras tipis yang elegan di mode terang maupun gelap */}
                        <div className="bg-muted/50 space-y-4 rounded-lg p-3 sm:bg-transparent sm:p-0">
                            {/* Company Select */}
                            <div className="grid gap-2">
                                <Label htmlFor="company" className="text-foreground font-semibold">
                                    {trans_auth.label_company}
                                </Label>
                                <Select onValueChange={setSelectedCompany} value={selectedCompany}>
                                    <SelectTrigger className="border-input bg-background text-foreground h-11 w-full sm:h-10">
                                        <SelectValue placeholder={trans_auth.placeholder_company} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover text-popover-foreground">
                                        {companies.length > 0 ? (
                                            companies.map((company) => (
                                                <SelectItem key={company.id} value={String(company.id)}>
                                                    {company.nama_perusahaan}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="text-muted-foreground p-2 text-sm">{trans_auth.no_data_company}</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* User Type Select */}
                            <div className="grid gap-2">
                                <Label htmlFor="role" className="text-foreground font-semibold">
                                    {trans_auth.label_user_type}
                                </Label>
                                <Select onValueChange={setSelectedRole} value={selectedRole}>
                                    <SelectTrigger className="border-input bg-background text-foreground h-11 w-full sm:h-10">
                                        <SelectValue placeholder={trans_auth.placeholder_user_type} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover text-popover-foreground">
                                        <SelectItem value="internal">{trans_auth.type_internal}</SelectItem>
                                        <SelectItem value="external">{trans_auth.type_external}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Role Internal Select */}
                            {selectedRole === 'internal' && (
                                <div className="animate-in fade-in slide-in-from-top-1 grid gap-2 duration-300">
                                    <Label htmlFor="role_internal" className="text-foreground font-semibold">
                                        {trans_auth.label_role_internal}
                                    </Label>
                                    <Select onValueChange={setSelectedRoleInternal} value={selectedRoleInternal}>
                                        <SelectTrigger className="border-input bg-background text-foreground h-11 w-full sm:h-10">
                                            <SelectValue placeholder={trans_auth.placeholder_role_internal} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover text-popover-foreground">
                                            {roles
                                                .filter((role) => ['staff', 'manager', 'supervisor'].includes(role.name))
                                                .map((role) => (
                                                    <SelectItem key={role.id} value={String(role.id)}>
                                                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Customer Select */}
                            {selectedRole === 'external' && (
                                <div className="animate-in fade-in slide-in-from-top-1 grid gap-2 duration-300">
                                    <Label htmlFor="customer" className="text-foreground font-semibold">
                                        {trans_auth.label_customer}
                                    </Label>
                                    <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
                                        <SelectTrigger className="border-input bg-background text-foreground h-11 w-full sm:h-10">
                                            <SelectValue placeholder={trans_auth.placeholder_customer} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover text-popover-foreground">
                                            {customers.length > 0 ? (
                                                customers.map((cust) => (
                                                    <SelectItem key={cust.id} value={String(cust.id)}>
                                                        {cust.nama_perusahaan}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="text-muted-foreground p-2 text-sm">{trans_auth.no_data_customer}</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* --- Bagian Identitas --- */}
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-foreground font-semibold">
                                    {trans_auth.label_name}
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={trans_auth.placeholder_name}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-foreground font-semibold">
                                    {trans_auth.label_email}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={trans_auth.placeholder_email}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-foreground font-semibold">
                                    {trans_auth.label_password}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={trans_auth.placeholder_password}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation" className="text-foreground font-semibold">
                                    {trans_auth.label_password_confirm}
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    placeholder={trans_auth.placeholder_password_confirm}
                                    className="border-input bg-background text-foreground h-11 sm:h-10"
                                />
                            </div>
                        </div>

                        {/* Footer: Tombol adaptif warna tema */}
                        <DialogFooter className="flex flex-col-reverse gap-2 pt-4 sm:flex-row">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                                    {trans_auth.btn_cancel}
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full font-bold sm:h-10 sm:w-auto"
                            >
                                {trans_auth.btn_create}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
