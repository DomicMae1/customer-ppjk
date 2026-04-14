/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Clipboard, CopyPlus, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react'; // Import Icon Plus & Upload
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTablePagination } from './pagination';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

interface HsCodeItem {
    id: string;
    code: string;
    link: string;
    file: File | null;
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
    const { props } = usePage();
    const auth = (props.auth as any) || {};
    const userRole = auth.user?.roles?.[0]?.name ?? '';
    const externalCustomers = (props.externalCustomers as any[]) || [];
    const internalStaff = (props.internalStaff as any[]) || []; // NEW: Retrieve Internal Staff
    const isUserExternal = auth.user?.role === 'eksternal';

    const trans = props.trans_general as Record<string, string>;
    const currentLocale = props.locale as string;
    const dateLocale = currentLocale === 'id' ? 'id-ID' : 'en-GB';

    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'keterangan_status', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [hasUserSorted, setHasUserSorted] = React.useState(false);

    const [statusFilter, setStatusFilter] = useState<'sudah' | 'belum' | ''>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [shipmentType, setShipmentType] = useState<'Import' | 'Export'>('Import');
    const [blNumber, setBlNumber] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(''); // NEW: Selected Staff State
    const [hsCodes, setHsCodes] = useState<HsCodeItem[]>([{ id: nanoid(), code: '', link: '', file: null }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSections, setSelectedSections] = useState<number[]>([]); // NEW: Selected Checklist Sections
    const [handlerFilter, setHandlerFilter] = useState<string>('all');

    const [filterColumn, setFilterColumn] = useState<'spk_code' | 'nama_customer' | 'jalur' | 'keterangan_status' | 'handler_name'>('handler_name');
    const [routeFilter, setRouteFilter] = useState<string>('all');
    const [statusLabelFilter, setStatusLabelFilter] = useState<string>('all');

    const [filterValue, setFilterValue] = useState('');

    const getInternalHandlerName = (item: any) => {
        return String(item.internal_handler_name ?? item.assigned_pic_name ?? item.pic_internal_name ?? item.nama_user_internal ?? '').trim();
    };

    const filteredData = React.useMemo(() => {
        let result = [...(data as any[])];

        if (filterColumn === 'jalur') {
            if (routeFilter !== 'all') {
                result = result.filter((item) => {
                    const jalur = String(item.jalur ?? '')
                        .toLowerCase()
                        .trim();

                    if (routeFilter === 'merah') {
                        return jalur === 'merah';
                    }

                    if (routeFilter === 'hijau') {
                        return jalur === 'hijau';
                    }

                    if (routeFilter === 'belum_selesai') {
                        return jalur === '' || jalur === '-' || jalur === 'belum selesai' || jalur === 'pending';
                    }

                    return true;
                });
            }
        } else if (filterColumn === 'keterangan_status') {
            if (statusLabelFilter !== 'all') {
                result = result.filter((item) => {
                    const status = String(item.status_label ?? '')
                        .toLowerCase()
                        .trim();
                    return status === statusLabelFilter.toLowerCase().trim();
                });
            }
        } else if (filterColumn === 'handler_name') {
            if (handlerFilter !== 'all') {
                result = result.filter((item) => {
                    const handler = getInternalHandlerName(item).toLowerCase().trim();
                    return handler === handlerFilter.toLowerCase().trim();
                });
            }
        } else if (filterValue.trim() !== '') {
            const keyword = filterValue.toLowerCase().trim();

            result = result.filter((item) => {
                if (filterColumn === 'spk_code') {
                    return String(item.spk_code ?? '')
                        .toLowerCase()
                        .includes(keyword);
                }

                if (filterColumn === 'nama_customer') {
                    return String(item.nama_customer ?? '')
                        .toLowerCase()
                        .includes(keyword);
                }

                if (filterColumn === 'progress') {
                    return String(item.progress ?? '').includes(keyword);
                }

                return true;
            });
        }

        return result;
    }, [data, filterColumn, filterValue, routeFilter, statusLabelFilter, statusFilter, userRole, handlerFilter]);

    const uniqueStatusOptions = React.useMemo(() => {
        const statuses = [...new Set((data as any[]).map((item) => String(item.status_label ?? '').trim()).filter((item) => item !== ''))];

        return statuses;
    }, [data]);

    const uniqueHandlerOptions = React.useMemo(() => {
        const handlersFromData = (data as any[]).map((item) => getInternalHandlerName(item)).filter((name) => name !== '');

        const handlersFromStaff = internalStaff.map((staff: any) => String(staff.name ?? '').trim()).filter((name: string) => name !== '');

        return [...new Set([...handlersFromData, ...handlersFromStaff])];
    }, [data, internalStaff]);

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: (updater) => {
            setHasUserSorted(true);
            setSorting(updater);
        },
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

    useEffect(() => {
        if (isUserExternal && externalCustomers.length > 0) {
            setSelectedCustomer(String(externalCustomers[0].id_customer));
        }
    }, [isUserExternal, externalCustomers]);

    const handleReset = () => {
        setFilterValue('');
        setFilterColumn('handler_name');
        setStatusFilter('');
        setRouteFilter('all');
        setStatusLabelFilter('all');
        setHandlerFilter('all');
        table.resetSorting();
        setSorting([{ id: 'keterangan_status', desc: true }]);
        setHasUserSorted(false);
    };

    const addHsCodeField = () => {
        setHsCodes([...hsCodes, { id: nanoid(), code: '', link: '', file: null }]);
    };

    const removeHsCodeField = (id: string) => {
        setHsCodes(hsCodes.filter((item) => item.id !== id));
    };

    const updateHsCode = (id: string, field: keyof HsCodeItem, value: any) => {
        setHsCodes(hsCodes.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleFileInPaste = (e: React.ClipboardEvent, itemId: string) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const extension = blob.type.split('/')[1] || 'png';
                    const file = new File([blob], `pasted-image-${Date.now()}.${extension}`, { type: blob.type });
                    updateHsCode(itemId, 'file', file);
                    return;
                }
            }
        }
    };

    const handleSaveShipment = () => {
        // A. Validasi Sederhana
        if (!blNumber || !selectedCustomer) {
            alert(trans.alert_complete_data); // Translate Alert
            return;
        }

        const invalidHs = hsCodes.find((item) => !item.code);
        if (invalidHs) {
            alert(trans.alert_hs_code); // Translate Alert
            return;
        }

        // C. Buat Object FormData
        const formData = new FormData();

        // Append data tunggal
        formData.append('shipment_type', shipmentType);
        formData.append('bl_number', blNumber);
        formData.append('id_customer', selectedCustomer);

        // NEW: Append Assigned PIC if selected
        if (selectedStaff) {
            formData.append('assigned_pic', selectedStaff);
        }

        // NEW: Append Selected Checklist Sections
        selectedSections.forEach((id, index) => {
            formData.append(`selected_sections[${index}]`, String(id));
        });

        // Append Array HS Codes
        hsCodes.forEach((item, index) => {
            // 1. Kode HS
            formData.append(`hs_codes[${index}][code]`, item.code);

            // 2. Link (Kirim kosong karena inputnya sudah dihapus di UI)
            // Ini penting agar validasi backend 'nullable|string' tetap lolos
            formData.append(`hs_codes[${index}][link]`, '');

            // 3. File Gambar (Jika User mengupload/paste gambar)
            if (item.file) {
                formData.append(`hs_codes[${index}][file]`, item.file);
            }
        });

        // D. Kirim Request ke Backend
        setIsSubmitting(true);
        router.post('/shipping', formData, {
            forceFormData: true, // Wajib true agar file terkirim sebagai multipart/form-data
            onSuccess: () => {
                // Reset form jika sukses
                setIsDialogOpen(false);
                setBlNumber('');
                setHsCodes([{ id: nanoid(), code: '', link: '', file: null }]);
                setSelectedSections([]); // Reset selected sections
                // Opsional: toast.success('Data berhasil disimpan');
            },
            onError: (errors) => {
                console.error('Gagal menyimpan:', errors);
                // Translate Alert Error
                if (errors.bl_number) alert(`BL Number: ${errors.bl_number}`);
                else if (errors.id_customer) alert(`Customer: ${errors.id_customer}`);
                else if (errors['hs_codes.0.code']) alert(trans.alert_hs_code_first);
                else if (errors['hs_codes.0.file']) alert(trans.alert_file_problem);
                else alert(trans.alert_save_error);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div>
            <div className="flex hidden items-center gap-2 pb-4 md:block">
                <div className="flex gap-2">
                    <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder={trans.select_column} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="spk_code">{trans.spk_number}</SelectItem>
                            <SelectItem value="nama_customer">{trans.customer_name}</SelectItem>
                            <SelectItem value="keterangan_status">{trans.status_description}</SelectItem>
                            <SelectItem value="jalur">{trans.channel}</SelectItem>
                            <SelectItem value="handler_name">{trans.handled_by || 'Handled By'}</SelectItem>
                        </SelectContent>
                    </Select>

                    {filterColumn === 'jalur' ? (
                        <Select value={routeFilter} onValueChange={setRouteFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder={trans.select_channel || 'Pilih Penjaluran'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                <SelectItem value="belum_selesai">{trans.not_finished || 'Belum Selesai'}</SelectItem>
                                <SelectItem value="merah">{trans.red || 'Merah'}</SelectItem>
                                <SelectItem value="hijau">{trans.green || 'Hijau'}</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : filterColumn === 'keterangan_status' ? (
                        <Select value={statusLabelFilter} onValueChange={setStatusLabelFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder={trans.select_status || 'Pilih Status'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                {uniqueStatusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : filterColumn === 'handler_name' ? (
                        <Select value={handlerFilter} onValueChange={setHandlerFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder={trans.select_handler || 'Pilih Handler'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                {uniqueHandlerOptions.map((handler) => (
                                    <SelectItem key={handler} value={handler}>
                                        {handler}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder={trans.typing_keyword}
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-[250px]"
                        />
                    )}

                    <Button variant="outline" className="h-auto" onClick={handleReset}>
                        {trans.reset}
                    </Button>
                </div>

                <div className="flex gap-2 pt-4">
                    <DataTableViewOptions table={table} />
                    {userRole && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-9 font-semibold">{trans.add_shipment}</Button>
                            </DialogTrigger>

                            <DialogContent className="border-border bg-background text-foreground max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground text-xl font-bold">{trans.shipment_data}</DialogTitle>
                                    <DialogDescription className="sr-only">Form input data shipment</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    {/* Shipment Type Toggle */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-semibold">{trans.shipment_type}</Label>
                                        <div className="flex w-full gap-2">
                                            <Button
                                                type="button"
                                                variant={shipmentType === 'Import' ? 'default' : 'outline'}
                                                className="w-1/2 font-bold"
                                                onClick={() => setShipmentType('Import')}
                                            >
                                                {trans.import}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={shipmentType === 'Export' ? 'default' : 'outline'}
                                                className="w-1/2 font-bold"
                                                onClick={() => setShipmentType('Export')}
                                            >
                                                {trans.export}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Input Dynamic Label (BL vs SI) */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-semibold">
                                            {shipmentType === 'Import' ? trans.input_bl : trans.input_si}
                                        </Label>
                                        <Input
                                            placeholder={shipmentType === 'Import' ? trans.placeholder_bl : trans.placeholder_si}
                                            value={blNumber}
                                            onChange={(e) => setBlNumber(e.target.value)}
                                            className="bg-background border-input text-foreground focus:ring-primary"
                                        />
                                    </div>

                                    {/* Input Customer */}
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-semibold">{trans.input_customer}</Label>
                                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={isUserExternal}>
                                            <SelectTrigger className="bg-background border-input text-foreground">
                                                <SelectValue placeholder={trans.select_customer_placeholder} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                                {externalCustomers.length > 0 ? (
                                                    externalCustomers.map((cust: any) => (
                                                        <SelectItem key={cust.id_customer} value={String(cust.id_customer)}>
                                                            {cust.nama}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="text-muted-foreground p-2 text-center text-sm">{trans.data_not_found}</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {isUserExternal && <p className="text-muted-foreground text-[10px] italic">{trans.auto_selected_msg}</p>}
                                    </div>

                                    {auth.user?.role === 'internal' && auth.user?.role_internal === 'supervisor' && (
                                        <div className="space-y-2">
                                            <Label className="font-semibold">{trans.assign_staff || 'Assign Staff'}</Label>
                                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={trans.select_staff_placeholder || 'Select Staff'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {internalStaff.length > 0 ? (
                                                        internalStaff.map((staff: any) => (
                                                            <SelectItem key={staff.id_user} value={String(staff.id_user)}>
                                                                {staff.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-center text-sm text-gray-500">{trans.data_not_found}</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Checklist Sections (Optional) */}
                                    {!isUserExternal && (props.checklistSections as any[])?.length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="text-foreground font-semibold">
                                                {trans.optional_sections || 'Tambahkan Section Opsional?'}
                                            </Label>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {(props.checklistSections as any[]).map((sec) => (
                                                    <div key={sec.id_section} className="flex items-center space-x-2 rounded-md border p-2 transition-colors hover:bg-muted/50">
                                                        <Checkbox
                                                            id={`sec-${sec.id_section}`}
                                                            checked={selectedSections.includes(sec.id_section)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedSections([...selectedSections, sec.id_section]);
                                                                } else {
                                                                    setSelectedSections(selectedSections.filter((id) => id !== sec.id_section));
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`sec-${sec.id_section}`}
                                                            className="text-foreground cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            {sec.section_name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* HS Code Section */}
                                    <div className="space-y-4">
                                        <div className="border-border flex items-center justify-between border-b pb-2">
                                            <Label className="text-foreground text-base font-bold">{trans.hs_code_data}</Label>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {hsCodes.map((item, index) => (
                                                <div
                                                    key={item.id}
                                                    className="border-border bg-card group focus-within:ring-primary/20 relative rounded-lg border p-4 shadow-sm transition-all focus-within:ring-2"
                                                    onPaste={(e) => handleFileInPaste(e, item.id)}
                                                >
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHsCodeField(item.id)}
                                                            className="text-destructive absolute top-3 right-3 transition-colors hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <div className="grid gap-3 pt-1">
                                                        <div className="space-y-1">
                                                            <Label className="text-foreground text-sm">{trans.input_hs_code}</Label>
                                                            <Input
                                                                placeholder={trans.placeholder_hs_code}
                                                                value={item.code}
                                                                onChange={(e) => updateHsCode(item.id, 'code', e.target.value)}
                                                                className="bg-background border-input text-foreground"
                                                            />
                                                        </div>

                                                        {/* File Upload / Image Preview */}
                                                        <div className="space-y-2">
                                                            <Label className="text-foreground text-sm">{trans.insw_link_ref}</Label>
                                                            {item.file ? (
                                                                <div className="border-border bg-muted/50 relative flex items-center justify-center rounded-md border border-dashed p-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateHsCode(item.id, 'file', null)}
                                                                        className="bg-destructive absolute -top-2 -right-2 rounded-full p-1 text-white shadow-md"
                                                                    >
                                                                        <X className="h-4 w-4 stroke-[2.5]" />
                                                                    </button>
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        {item.file.type.startsWith('image/') ? (
                                                                            <img
                                                                                src={URL.createObjectURL(item.file)}
                                                                                alt="Preview"
                                                                                className="border-border max-h-32 rounded border object-contain"
                                                                            />
                                                                        ) : (
                                                                            <ImageIcon className="text-muted-foreground h-10 w-10" />
                                                                        )}
                                                                        <span className="text-muted-foreground max-w-[200px] truncate text-xs font-medium">
                                                                            {item.file.name}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-2">
                                                                    <Input
                                                                        type="file"
                                                                        className="hidden"
                                                                        id={`file-${item.id}`}
                                                                        accept="image/*"
                                                                        onChange={(e) => updateHsCode(item.id, 'file', e.target.files?.[0] || null)}
                                                                    />
                                                                    <label
                                                                        htmlFor={`file-${item.id}`}
                                                                        className="bg-primary/5 text-primary border-primary/20 hover:border-primary hover:bg-primary/10 flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-sm font-bold transition-all"
                                                                        onDragOver={(e) => {
                                                                            e.preventDefault();
                                                                            e.currentTarget.classList.add('bg-primary/20', 'border-primary');
                                                                        }}
                                                                        onDragLeave={(e) => {
                                                                            e.preventDefault();
                                                                            e.currentTarget.classList.remove('bg-primary/20', 'border-primary');
                                                                        }}
                                                                        onDrop={(e) => {
                                                                            e.preventDefault();
                                                                            e.currentTarget.classList.remove('bg-primary/20', 'border-primary');
                                                                            const file = e.dataTransfer.files[0];
                                                                            if (file && file.type.startsWith('image/')) {
                                                                                updateHsCode(item.id, 'file', file);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <ImageIcon className="h-6 w-6" />
                                                                        <span className="text-xs">
                                                                            {trans.choose_image}{' '}
                                                                            <span className="hidden opacity-60 md:inline">
                                                                                / Drag & Drop / Ctrl+V
                                                                            </span>
                                                                        </span>
                                                                    </label>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className="border-border bg-background text-foreground hover:bg-accent flex h-10 w-full items-center justify-center gap-2"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();

                                                                            if (!window.isSecureContext) {
                                                                                alert('Fitur paste hanya berfungsi di link HTTPS (koneksi aman).');
                                                                                return;
                                                                            }

                                                                            if (!navigator.clipboard || !navigator.clipboard.read) {
                                                                                alert('Browser ini tidak mendukung fitur paste otomatis.');
                                                                                return;
                                                                            }

                                                                            try {
                                                                                const clipboardItems = await navigator.clipboard.read();
                                                                                let imageFound = false;
                                                                                for (const clipItem of clipboardItems) {
                                                                                    const imageType = clipItem.types.find((type) =>
                                                                                        type.toLowerCase().includes('image'),
                                                                                    );
                                                                                    if (imageType) {
                                                                                        const blob = await clipItem.getType(imageType);
                                                                                        let extension = imageType.split('/')[1] || 'png';
                                                                                        if (extension.includes('jpeg')) extension = 'jpg';
                                                                                        if (extension.includes('+'))
                                                                                            extension = extension.split('+')[0];

                                                                                        const fileName = `clipboard-${Date.now()}.${extension}`;
                                                                                        const file = new File([blob], fileName, {
                                                                                            type: imageType,
                                                                                        });
                                                                                        updateHsCode(item.id, 'file', file);
                                                                                        imageFound = true;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                                if (!imageFound) alert(trans.alert_no_clipboard);
                                                                            } catch (err: any) {
                                                                                console.error(err);
                                                                                if (err.name === 'NotAllowedError') {
                                                                                    alert('Izin baca clipboard ditolak. Silakan izinkan di browser.');
                                                                                } else {
                                                                                    alert(trans.alert_clipboard_error);
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Clipboard className="h-4 w-4" />
                                                                        {trans.paste_clipboard}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="border-primary/30 text-primary hover:bg-primary/10 flex w-full items-center gap-2"
                                        onClick={addHsCodeField}
                                    >
                                        <CopyPlus className="h-4 w-4" />
                                        {trans.add_another_hs}
                                    </Button>

                                    <Button className="w-full font-bold shadow-lg" onClick={handleSaveShipment} disabled={isSubmitting}>
                                        {isSubmitting ? trans.saving : trans.save}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* --- MOBILE VIEW: CARD LAYOUT --- */}
            <div className="px-4 py-4 md:hidden">
                {/* Row 1: pilih kolom + tombol tambah */}
                <div className="mb-3 flex w-full items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <Select value={filterColumn} onValueChange={(val) => setFilterColumn(val as any)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={trans.select_column} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="spk_code">{trans.spk_number}</SelectItem>
                                <SelectItem value="nama_customer">{trans.customer_name}</SelectItem>
                                <SelectItem value="keterangan_status">{trans.status_description}</SelectItem>
                                <SelectItem value="jalur">{trans.channel}</SelectItem>
                                <SelectItem value="handler_name">{trans.handled_by || 'Handled By'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {userRole && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" className="h-10 w-10 shrink-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    )}
                </div>

                {/* Row 2: filter dinamis */}
                <div className="mb-3">
                    {filterColumn === 'jalur' ? (
                        <Select value={routeFilter} onValueChange={setRouteFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={trans.select_channel || 'Pilih Penjaluran'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                <SelectItem value="belum_selesai">{trans.not_finished || 'Belum Selesai'}</SelectItem>
                                <SelectItem value="merah">{trans.red || 'Merah'}</SelectItem>
                                <SelectItem value="hijau">{trans.green || 'Hijau'}</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : filterColumn === 'keterangan_status' ? (
                        <Select value={statusLabelFilter} onValueChange={setStatusLabelFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={trans.select_status || 'Pilih Status'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                {uniqueStatusOptions.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : filterColumn === 'handler_name' ? (
                        <Select value={handlerFilter} onValueChange={setHandlerFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={trans.select_handler || 'Pilih Handler'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{trans.all || 'Semua'}</SelectItem>
                                {uniqueHandlerOptions.map((handler) => (
                                    <SelectItem key={handler} value={handler}>
                                        {handler}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder={trans.typing_keyword}
                            value={filterValue}
                            onChange={(event) => setFilterValue(event.target.value)}
                            className="w-full"
                        />
                    )}
                </div>

                {/* Row 3: reset */}
                <div className="mb-4">
                    <Button variant="outline" className="w-full" onClick={handleReset}>
                        {trans.reset}
                    </Button>
                </div>

                <div className="flex flex-col gap-4">
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => {
                            const original = row.original as any;

                            const dateObj = original.tanggal_status ? new Date(original.tanggal_status) : null;
                            const dateStr = dateObj
                                ? dateObj.toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                })
                                : '-';
                            const timeStr = dateObj
                                ? dateObj.toLocaleTimeString(currentLocale === 'id' ? 'id-ID' : 'en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                })
                                : '';

                            return (
                                <div
                                    key={row.id}
                                    className="border-border bg-card active:bg-accent cursor-pointer rounded-lg border p-4 shadow-sm transition-colors"
                                    onClick={() => router.visit(`/shipping/${original.id}`)}
                                >
                                    <div className="border-border mb-2 flex items-center justify-between border-b pb-2">
                                        <span className="text-foreground font-mono text-base font-medium">{original.spk_code || '-'}</span>
                                        <span
                                            className={`text-sm font-bold ${original.jalur?.toLowerCase() === 'hijau'
                                                ? 'text-emerald-500'
                                                : original.jalur?.toLowerCase() === 'merah'
                                                    ? 'text-rose-500'
                                                    : 'text-amber-500'
                                                }`}
                                        >
                                            {original.jalur || '-'}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase">{trans.customer_name}</p>
                                            <p className="text-foreground font-bold">{original.nama_customer || '-'}</p>
                                        </div>

                                        <div>
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase">{trans.status_description}</p>
                                            <div className="text-foreground/90 text-sm">
                                                <span className="text-primary font-medium">{original.status_label || '-'}</span>
                                                {original.nama_user && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        {trans.by} <strong className="text-foreground">{original.nama_user}</strong>
                                                    </span>
                                                )}
                                                {dateObj && (
                                                    <span className="text-muted-foreground mt-1 block text-xs">
                                                        {trans.at}{' '}
                                                        <strong className="text-foreground">
                                                            {dateStr} {timeStr} WIB
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                                    {trans.progress}
                                                </span>
                                                <span className="text-foreground text-[11px] font-extrabold">{original.progress || 0}%</span>
                                            </div>
                                            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out ${original.progress === 100
                                                        ? 'bg-emerald-500'
                                                        : (original.progress || 0) >= 80
                                                            ? 'bg-indigo-500'
                                                            : (original.progress || 0) >= 40
                                                                ? 'bg-blue-500'
                                                                : 'bg-sky-400'
                                                        }`}
                                                    style={{ width: `${original.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {original.deadline_date && (
                                            <div className="mt-1 flex items-center gap-1 rounded border border-rose-500/20 bg-rose-500/10 p-1.5">
                                                <span className="text-sm font-bold text-rose-500">ⓘ</span>
                                                <span className="text-[10px] font-bold tracking-tight text-rose-500 uppercase">
                                                    {trans.submit_before} {new Date(original.deadline_date).toLocaleDateString(dateLocale)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-gray-500">No results found.</div>
                    )}
                </div>
            </div>

            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                            <button className="flex items-center gap-1" onClick={() => header.column.toggleSorting()}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {hasUserSorted &&
                                                    (header.column.getIsSorted() === 'asc'
                                                        ? '⬆️'
                                                        : header.column.getIsSorted() === 'desc'
                                                            ? '⬇️'
                                                            : '')}
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />
        </div>
    );
}
