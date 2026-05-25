/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Edit, PackagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Company {
    id_perusahaan: number;
    nama_perusahaan: string;
}

interface MasterSection {
    id_section: number;
    section_name: string;
    section_order: number;
}

interface MasterDocument {
    id_dokumen: number;
    id_section: number | null;
    nama_file: string;
}

interface PackageDocument {
    id: number;
    id_dokumen: number;
    nama_file_snapshot: string;
    document_order: number;
}

interface PackageSection {
    id: number;
    id_section: number;
    section_name_snapshot: string;
    section_order: number;
    documents: PackageDocument[];
}

interface ShippingPackage {
    id: number;
    name: string;
    shipment_type: 'Import' | 'Export';
    is_active: boolean;
    sections: PackageSection[];
}

interface EditorData {
    packages: ShippingPackage[];
    sections: MasterSection[];
    documents: MasterDocument[];
}

interface PageProps {
    companies: Company[];
    canSelectCompany: boolean;
    initialCompanyId: number | null;
    initialData: EditorData;
}

const emptyForm = {
    id: null as number | null,
    name: '',
    shipment_type: 'Export' as 'Import' | 'Export',
    is_active: true,
    selectedSections: [] as number[],
    selectedDocs: {} as Record<number, number[]>,
};

export default function ShippingPackagesPage({ companies, canSelectCompany, initialCompanyId, initialData }: PageProps) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Master Package Shipping', href: '/shipping-packages' }];
    const { auth } = usePage<any>().props;

    const [selectedCompany, setSelectedCompany] = useState<string>(initialCompanyId ? String(initialCompanyId) : '');
    const [packages, setPackages] = useState<ShippingPackage[]>(initialData.packages || []);
    const [sections, setSections] = useState<MasterSection[]>(initialData.sections || []);
    const [documents, setDocuments] = useState<MasterDocument[]>(initialData.documents || []);
    const [form, setForm] = useState(emptyForm);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ShippingPackage | null>(null);

    const permissions = auth?.user?.permissions || [];
    const canCreate = permissions.includes('create-shipping-package');
    const canUpdate = permissions.includes('update-shipping-package');
    const canDelete = permissions.includes('delete-shipping-package');
    const canSave = form.id ? canUpdate : canCreate;
    const hasRowActions = canUpdate || canDelete;

    useEffect(() => {
        if (canSelectCompany && companies.length > 0 && !selectedCompany) {
            setSelectedCompany(String(companies[0].id_perusahaan));
        }
    }, [canSelectCompany, companies, selectedCompany]);

    useEffect(() => {
        if (canSelectCompany && selectedCompany) {
            fetchCompanyData(selectedCompany);
        }
    }, [canSelectCompany, selectedCompany]);

    const documentsBySection = useMemo(() => {
        const grouped = new Map<number, MasterDocument[]>();

        documents.forEach((document) => {
            if (document.id_section == null) return;
            const current = grouped.get(document.id_section) || [];
            current.push(document);
            grouped.set(document.id_section, current);
        });

        return grouped;
    }, [documents]);

    const fetchCompanyData = async (companyId: string) => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/shipping-packages/companies/${companyId}/data`);
            setPackages(response.data.packages || []);
            setSections(response.data.sections || []);
            setDocuments(response.data.documents || []);
            setForm(emptyForm);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal mengambil data package.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewPackage = () => {
        setForm(emptyForm);
    };

    const handleEditPackage = (shippingPackage: ShippingPackage) => {
        const selectedDocs = shippingPackage.sections.reduce<Record<number, number[]>>((acc, section) => {
            acc[section.id_section] = section.documents.map((document) => document.id_dokumen);
            return acc;
        }, {});

        setForm({
            id: shippingPackage.id,
            name: shippingPackage.name,
            shipment_type: shippingPackage.shipment_type,
            is_active: shippingPackage.is_active,
            selectedSections: shippingPackage.sections.map((section) => section.id_section),
            selectedDocs,
        });
    };

    const toggleSection = (idSection: number, checked: boolean) => {
        setForm((current) => {
            if (checked) {
                if (current.selectedSections.includes(idSection)) return current;

                return {
                    ...current,
                    selectedSections: [...current.selectedSections, idSection],
                    selectedDocs: {
                        ...current.selectedDocs,
                        [idSection]: current.selectedDocs[idSection] || [],
                    },
                };
            }

            const nextDocs = { ...current.selectedDocs };
            delete nextDocs[idSection];

            return {
                ...current,
                selectedSections: current.selectedSections.filter((sectionId) => sectionId !== idSection),
                selectedDocs: nextDocs,
            };
        });
    };

    const toggleDocument = (idSection: number, idDokumen: number, checked: boolean) => {
        setForm((current) => {
            const currentDocs = current.selectedDocs[idSection] || [];
            const nextDocs = checked ? [...currentDocs, idDokumen] : currentDocs.filter((documentId) => documentId !== idDokumen);

            return {
                ...current,
                selectedDocs: {
                    ...current.selectedDocs,
                    [idSection]: nextDocs,
                },
            };
        });
    };

    const buildPayload = () => {
        const sectionOrderById = new Map(sections.map((section, index) => [section.id_section, section.section_order || index + 1]));

        return {
            id_perusahaan: canSelectCompany ? selectedCompany : initialCompanyId,
            name: form.name.trim(),
            shipment_type: form.shipment_type,
            is_active: form.is_active,
            sections: form.selectedSections.map((idSection) => ({
                id_section: idSection,
                section_order: sectionOrderById.get(idSection) || 0,
                documents: form.selectedDocs[idSection] || [],
            })),
        };
    };

    const handleSave = async () => {
        if (canSelectCompany && !selectedCompany) {
            toast.error('Perusahaan wajib dipilih.');
            return;
        }

        if (!form.name.trim()) {
            toast.error('Nama package wajib diisi.');
            return;
        }

        if (form.selectedSections.length === 0) {
            toast.error('Minimal satu section wajib dipilih.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = buildPayload();

            if (form.id) {
                await axios.put(`/shipping-packages/${form.id}`, payload);
                toast.success('Package berhasil diperbarui.');
            } else {
                await axios.post('/shipping-packages', payload);
                toast.success('Package berhasil dibuat.');
            }

            if (canSelectCompany && selectedCompany) {
                await fetchCompanyData(selectedCompany);
            } else {
                const response = await axios.get(`/shipping-packages/companies/${initialCompanyId}/data`);
                setPackages(response.data.packages || []);
                setSections(response.data.sections || []);
                setDocuments(response.data.documents || []);
                setForm(emptyForm);
            }
        } catch (error: any) {
            const errors = error.response?.data?.errors;
            if (errors) {
                Object.values(errors)
                    .flat()
                    .forEach((message: any) => toast.error(String(message)));
            } else {
                toast.error(error.response?.data?.message || 'Gagal menyimpan package.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await axios.delete(`/shipping-packages/${deleteTarget.id}`, {
                data: {
                    id_perusahaan: canSelectCompany ? selectedCompany : initialCompanyId,
                },
            });
            toast.success('Package berhasil dihapus.');
            setDeleteTarget(null);

            if (canSelectCompany && selectedCompany) {
                await fetchCompanyData(selectedCompany);
            } else {
                const response = await axios.get(`/shipping-packages/companies/${initialCompanyId}/data`);
                setPackages(response.data.packages || []);
                setSections(response.data.sections || []);
                setDocuments(response.data.documents || []);
                setForm(emptyForm);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menghapus package.');
        }
    };

    const selectedSectionModels = sections.filter((section) => form.selectedSections.includes(section.id_section));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Master Package Shipping" />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Master Package Shipping</h1>
                        <p className="text-muted-foreground text-sm">Atur section dan dokumen yang digenerate saat shipping dibuat.</p>
                    </div>

                    {canSelectCompany && (
                        <div className="flex min-w-0 flex-col gap-1 md:w-[320px]">
                            <Label>Perusahaan</Label>
                            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih perusahaan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id_perusahaan} value={String(company.id_perusahaan)}>
                                            {company.nama_perusahaan}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <CardTitle className="text-base">Daftar Package</CardTitle>
                            {canCreate && (
                                <Button type="button" size="sm" onClick={handleNewPackage}>
                                    <PackagePlus data-icon="inline-start" />
                                    Baru
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-muted-foreground py-8 text-center text-sm">Loading package...</div>
                            ) : packages.length === 0 ? (
                                <div className="text-muted-foreground py-8 text-center text-sm">Belum ada package.</div>
                            ) : (
                                <div className="overflow-hidden rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Package</TableHead>
                                                <TableHead className="w-[110px]">Tipe</TableHead>
                                                {hasRowActions && <TableHead className="w-[92px] text-right">Aksi</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {packages.map((shippingPackage) => (
                                                <TableRow key={shippingPackage.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium">{shippingPackage.name}</span>
                                                            <span className="text-muted-foreground text-xs">
                                                                {shippingPackage.sections.length} section
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="secondary">{shippingPackage.shipment_type}</Badge>
                                                            {!shippingPackage.is_active && <Badge variant="outline">Nonaktif</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    {hasRowActions && (
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                {canUpdate && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleEditPackage(shippingPackage)}
                                                                        title="Edit package"
                                                                    >
                                                                        <Edit />
                                                                    </Button>
                                                                )}
                                                                {canDelete && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setDeleteTarget(shippingPackage)}
                                                                        title="Hapus package"
                                                                    >
                                                                        <Trash2 />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{form.id ? 'Edit Package' : 'Package Baru'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-5">
                                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_130px]">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="package_name">Nama Package</Label>
                                        <Input
                                            id="package_name"
                                            value={form.name}
                                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                            placeholder="Contoh: EMKL + Karantina"
                                            disabled={!canSave}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label>Tipe Shipping</Label>
                                        <Select
                                            value={form.shipment_type}
                                            onValueChange={(value) =>
                                                setForm((current) => ({ ...current, shipment_type: value as 'Import' | 'Export' }))
                                            }
                                            disabled={!canSave}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih tipe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Import">Import</SelectItem>
                                                <SelectItem value="Export">Export</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label>Status</Label>
                                        <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                                            <Checkbox
                                                id="is_active"
                                                checked={form.is_active}
                                                onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked as boolean }))}
                                                disabled={!canSave}
                                            />
                                            <Label htmlFor="is_active" className="cursor-pointer text-sm">
                                                Aktif
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <h2 className="text-sm font-semibold">Section</h2>
                                            <p className="text-muted-foreground text-xs">Section terpilih akan dibuat walaupun dokumennya kosong.</p>
                                        </div>

                                        <div className="max-h-[520px] overflow-auto rounded-md border">
                                            {sections.map((section) => (
                                                <label
                                                    key={section.id_section}
                                                    htmlFor={`section-${section.id_section}`}
                                                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0"
                                                >
                                                    <Checkbox
                                                        id={`section-${section.id_section}`}
                                                        checked={form.selectedSections.includes(section.id_section)}
                                                        onCheckedChange={(checked) => toggleSection(section.id_section, checked as boolean)}
                                                        disabled={!canSave}
                                                    />
                                                    <span className="text-sm">{section.section_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <h2 className="text-sm font-semibold">Dokumen Mandatory Package</h2>
                                            <p className="text-muted-foreground text-xs">
                                                Pilih dokumen yang otomatis dibuat di dalam setiap section.
                                            </p>
                                        </div>

                                        {selectedSectionModels.length === 0 ? (
                                            <div className="text-muted-foreground rounded-md border py-10 text-center text-sm">
                                                Pilih section terlebih dahulu.
                                            </div>
                                        ) : (
                                            <div className="max-h-[520px] overflow-auto rounded-md border">
                                                {selectedSectionModels.map((section) => {
                                                    const sectionDocuments = documentsBySection.get(section.id_section) || [];

                                                    return (
                                                        <div key={section.id_section} className="border-b p-4 last:border-b-0">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <h3 className="text-sm font-semibold">{section.section_name}</h3>
                                                                <Badge variant="outline">{sectionDocuments.length} dokumen master</Badge>
                                                            </div>

                                                            {sectionDocuments.length === 0 ? (
                                                                <p className="text-muted-foreground text-sm">Section ini akan dibuat kosong.</p>
                                                            ) : (
                                                                <div className="grid gap-2 md:grid-cols-2">
                                                                    {sectionDocuments.map((document) => (
                                                                        <label
                                                                            key={document.id_dokumen}
                                                                            htmlFor={`doc-${section.id_section}-${document.id_dokumen}`}
                                                                            className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border p-3"
                                                                        >
                                                                            <Checkbox
                                                                                id={`doc-${section.id_section}-${document.id_dokumen}`}
                                                                                checked={(form.selectedDocs[section.id_section] || []).includes(
                                                                                    document.id_dokumen,
                                                                                )}
                                                                                onCheckedChange={(checked) =>
                                                                                    toggleDocument(
                                                                                        section.id_section,
                                                                                        document.id_dokumen,
                                                                                        checked as boolean,
                                                                                    )
                                                                                }
                                                                                disabled={!canSave}
                                                                            />
                                                                            <span className="text-sm">{document.nama_file}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
                                    <Button type="button" variant="outline" onClick={handleNewPackage} disabled={isSaving}>
                                        Reset
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={!canSave || isSaving || (canSelectCompany && !selectedCompany)}
                                    >
                                        {isSaving ? 'Saving...' : 'Simpan Package'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Package</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus package <strong>{deleteTarget?.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                            Batal
                        </Button>
                        {canDelete && (
                            <Button type="button" variant="destructive" className="text-white" onClick={handleDelete}>
                                Hapus
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
