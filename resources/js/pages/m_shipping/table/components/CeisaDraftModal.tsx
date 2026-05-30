/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertTriangle,
    Boxes,
    CheckCircle2,
    FileText,
    Package,
    Plus,
    RefreshCw,
    Save,
    Ship,
    SlidersHorizontal,
    Trash2,
    UserRound,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type DraftTab = 'header' | 'entities' | 'documents' | 'transport' | 'goods' | 'advanced';

interface CeisaDraftModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payloadText: string;
    onPayloadTextChange: (value: string) => void;
    warnings: string[];
    nomorAju: string;
    documentType: string;
    isPreparing: boolean;
    isSubmitting: boolean;
    onRegenerate: () => void;
    onSubmit: () => void;
}

interface Requirement {
    group: string;
    label: string;
    ok: boolean;
}

const tabConfig: Array<{ key: DraftTab; label: string; icon: any }> = [
    { key: 'header', label: 'Header', icon: SlidersHorizontal },
    { key: 'entities', label: 'Entitas', icon: UserRound },
    { key: 'documents', label: 'Dokumen', icon: FileText },
    { key: 'transport', label: 'Pengangkut', icon: Ship },
    { key: 'goods', label: 'Barang', icon: Boxes },
    { key: 'advanced', label: 'JSON', icon: Package },
];

const documentOptions = [
    { value: '380', label: '380 - Invoice' },
    { value: '217', label: '217 - Packing List' },
    { value: '704', label: '704 - Master B/L' },
    { value: '705', label: '705 - B/L' },
    { value: '740', label: '740 - AWB' },
    { value: '741', label: '741 - Master AWB' },
    { value: '860', label: '860 - Certificate of Origin' },
    { value: '888', label: '888 - Perizinan/Lartas' },
];

const incotermOptions = ['CIF', 'FOB', 'CFR', 'EXW', 'FCA', 'DAP'];
const valutaOptions = ['USD', 'IDR', 'EUR', 'SGD', 'CNY', 'JPY'];
const satuanOptions = ['PCE', 'KGM', 'TNE', 'LTR', 'MTQ', 'SET', 'BG', 'CTN', 'DR', 'ROL'];
const kemasanOptions = ['PK', 'CT', 'BG', 'BX', 'DR', 'PL', 'BL', 'RO', 'SA', 'CS'];
const jenisImporOptions = [
    { value: '01', label: '01 - Umum' },
    { value: '02', label: '02 - Re-Impor' },
    { value: '03', label: '03 - Sementara' },
    { value: '08', label: '08 - KITE' },
    { value: '09', label: '09 - Pembebasan' },
];
const caraBayarOptions = [
    { value: 'KMD', label: 'KMD - Pembayaran Kemudian' },
    { value: 'PMK', label: 'PMK - Pembayaran Dimuka' },
    { value: 'SLC', label: 'SLC - Sight L/C' },
    { value: 'RLC', label: 'RLC - Red Clause L/C' },
    { value: 'IMB', label: 'IMB - Documentary Bills' },
    { value: 'IOA', label: 'IOA - Open Account' },
    { value: 'KON', label: 'KON - Konsinyasi' },
    { value: 'LAI', label: 'LAI - Lainnya' },
];
const tutupPuOptions = [
    { value: '11', label: '11 - BC 1.1' },
    { value: '12', label: '12 - BC 1.2' },
    { value: '14', label: '14 - BC 1.4' },
];

const inputClass =
    'h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-800 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const selectClass =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';

function parsePayload(payloadText: string): { payload: Record<string, any>; error: string | null } {
    try {
        const parsed = JSON.parse(payloadText || '{}');

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { payload: {}, error: 'Payload harus berupa JSON object.' };
        }

        return { payload: parsed, error: null };
    } catch (error) {
        return { payload: {}, error: (error as Error).message };
    }
}

function clonePayload(payload: Record<string, any>): Record<string, any> {
    return JSON.parse(JSON.stringify(payload || {}));
}

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return !Number.isNaN(value);

    return String(value).trim() !== '';
}

function positiveNumber(value: unknown): boolean {
    return Number(value) > 0;
}

function numberValue(value: string): number {
    if (value === '') return 0;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function ensureArray(payload: Record<string, any>, key: string): any[] {
    if (!Array.isArray(payload[key])) {
        payload[key] = [];
    }

    return payload[key];
}

function toPayloadText(payload: Record<string, any>): string {
    return JSON.stringify(payload, null, 2);
}

function entityTemplate(kodeEntitas: string): Record<string, any> {
    const common = {
        seriEntitas: 1,
        kodeEntitas,
        namaEntitas: '',
        alamatEntitas: '',
    };

    if (kodeEntitas === '1') {
        return {
            ...common,
            nomorIdentitas: '',
            kodeJenisIdentitas: '6',
            nitku: '',
            nibEntitas: '',
            kodeStatus: '01',
            kodeJenisApi: '01',
        };
    }

    if (kodeEntitas === '7') {
        return {
            ...common,
            nomorIdentitas: '',
            kodeJenisIdentitas: '6',
            nitku: '',
            kodeAfiliasi: 'TAH',
        };
    }

    if (kodeEntitas === '4') {
        return {
            ...common,
            nomorIdentitas: '',
            kodeJenisIdentitas: '6',
            nitku: '',
            nibEntitas: '',
            kodeNegara: 'ID',
            kodeStatus: '01',
            kodeJenisApi: '01',
        };
    }

    return {
        ...common,
        kodeNegara: '',
    };
}

function buildRequirements(payload: Record<string, any>): Requirement[] {
    const entitas = Array.isArray(payload.entitas) ? payload.entitas : [];
    const dokumen = Array.isArray(payload.dokumen) ? payload.dokumen : [];
    const barang = Array.isArray(payload.barang) ? payload.barang : [];
    const kemasan = Array.isArray(payload.kemasan) ? payload.kemasan : [];

    const importir = entitas.find((item: any) => item?.kodeEntitas === '1');
    const pemilik = entitas.find((item: any) => item?.kodeEntitas === '7');
    const penjual = entitas.find((item: any) => item?.kodeEntitas === '10');
    const invoice = dokumen.find((item: any) => item?.kodeDokumen === '380');
    const blAwb = dokumen.find((item: any) => ['705', '740'].includes(item?.kodeDokumen));
    const firstBarang = barang[0] || {};
    const firstKemasan = kemasan[0] || {};

    return [
        { group: 'Header', label: 'Kode kantor', ok: hasValue(payload.kodeKantor) },
        { group: 'Header', label: 'Pelabuhan muat', ok: hasValue(payload.kodePelMuat) },
        { group: 'Header', label: 'Pelabuhan tujuan', ok: hasValue(payload.kodePelTujuan) },
        { group: 'Header', label: 'Jenis impor', ok: hasValue(payload.kodeJenisImpor) },
        { group: 'Header', label: 'Cara bayar', ok: hasValue(payload.kodeCaraBayar) },
        { group: 'Header', label: 'NDPBM/Kurs', ok: positiveNumber(payload.ndpbm) },
        { group: 'Header', label: 'Penandatangan', ok: hasValue(payload.namaTtd) && hasValue(payload.jabatanTtd) && hasValue(payload.kotaTtd) },
        {
            group: 'Entitas',
            label: 'Importir lengkap',
            ok:
                hasValue(importir?.namaEntitas) &&
                hasValue(importir?.alamatEntitas) &&
                hasValue(importir?.nomorIdentitas) &&
                hasValue(importir?.nibEntitas),
        },
        {
            group: 'Entitas',
            label: 'Pemilik barang',
            ok: hasValue(pemilik?.namaEntitas) && hasValue(pemilik?.alamatEntitas) && hasValue(pemilik?.nomorIdentitas),
        },
        {
            group: 'Entitas',
            label: 'Penjual luar negeri',
            ok: hasValue(penjual?.namaEntitas) && hasValue(penjual?.alamatEntitas) && hasValue(penjual?.kodeNegara),
        },
        {
            group: 'Dokumen',
            label: 'Invoice 380',
            ok: hasValue(invoice?.nomorDokumen) && hasValue(invoice?.tanggalDokumen),
        },
        {
            group: 'Dokumen',
            label: 'B/L 705 atau AWB 740',
            ok: hasValue(blAwb?.nomorDokumen) && hasValue(blAwb?.tanggalDokumen),
        },
        {
            group: 'Kemasan',
            label: 'Kemasan',
            ok: hasValue(firstKemasan?.kodeJenisKemasan) && positiveNumber(firstKemasan?.jumlahKemasan),
        },
        {
            group: 'Barang',
            label: 'Barang utama',
            ok:
                hasValue(firstBarang?.posTarif) &&
                hasValue(firstBarang?.uraian) &&
                positiveNumber(firstBarang?.jumlahSatuan) &&
                hasValue(firstBarang?.kodeSatuanBarang) &&
                hasValue(firstBarang?.merk) &&
                hasValue(firstBarang?.tipe),
        },
    ];
}

function fieldLabel(label: string, required = false) {
    return (
        <Label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-zinc-400">
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
        </Label>
    );
}

export function CeisaDraftModal({
    open,
    onOpenChange,
    payloadText,
    onPayloadTextChange,
    warnings,
    nomorAju,
    documentType,
    isPreparing,
    isSubmitting,
    onRegenerate,
    onSubmit,
}: CeisaDraftModalProps) {
    const [activeTab, setActiveTab] = useState<DraftTab>('header');
    const { payload, error: jsonError } = useMemo(() => parsePayload(payloadText), [payloadText]);
    const requirements = useMemo(() => buildRequirements(payload), [payload]);
    const missingRequirements = requirements.filter((item) => !item.ok);
    const completedCount = requirements.length - missingRequirements.length;

    const commitPayload = (mutator: (next: Record<string, any>) => void) => {
        if (jsonError) return;

        const next = clonePayload(payload);
        mutator(next);
        onPayloadTextChange(toPayloadText(next));
    };

    const tabHasMissing = (tab: DraftTab): boolean => {
        const groupsByTab: Record<DraftTab, string[]> = {
            header: ['Header'],
            entities: ['Entitas'],
            documents: ['Dokumen'],
            transport: ['Kemasan', 'Pengangkut'],
            goods: ['Barang'],
            advanced: [],
        };

        return missingRequirements.some((item) => groupsByTab[tab].includes(item.group));
    };

    const updateHeader = (field: string, value: any) => {
        commitPayload((next) => {
            next[field] = value;

            if (field === 'kodeCaraBayar') {
                next.kodeJenisNilai = value;
            }

            if (['fob', 'freight', 'asuransi'].includes(field)) {
                const fob = Number(next.fob || 0);
                const freight = Number(next.freight || 0);
                const asuransi = Number(next.asuransi || 0);
                next.cif = Number((fob + freight + asuransi).toFixed(4));
                next.nilaiBarang = next.cif;

                const ikb = ensureArray(next, 'informasiKomponenBiaya');
                if (!ikb[0]) ikb[0] = {};
                ikb[0].hargaInvoice = fob;
                ikb[0].biayaTransportasi = freight;
                ikb[0].asuransi = asuransi;
            }
        });
    };

    const updateEntity = (kodeEntitas: string, field: string, value: any) => {
        commitPayload((next) => {
            const entitas = ensureArray(next, 'entitas');
            let index = entitas.findIndex((item) => item?.kodeEntitas === kodeEntitas);

            if (index < 0) {
                entitas.push(entityTemplate(kodeEntitas));
                index = entitas.length - 1;
            }

            entitas[index][field] = value;
            entitas.forEach((item, itemIndex) => {
                item.seriEntitas = itemIndex + 1;
            });
        });
    };

    const updateDocument = (index: number, field: string, value: any) => {
        commitPayload((next) => {
            const dokumen = ensureArray(next, 'dokumen');
            if (!dokumen[index]) return;

            dokumen[index][field] = value;
        });
    };

    const addDocument = (kodeDokumen = '380') => {
        commitPayload((next) => {
            const dokumen = ensureArray(next, 'dokumen');
            dokumen.push({
                seriDokumen: dokumen.length + 1,
                kodeDokumen,
                nomorDokumen: '',
                tanggalDokumen: new Date().toISOString().slice(0, 10),
            });
        });
    };

    const removeDocument = (index: number) => {
        commitPayload((next) => {
            const dokumen = ensureArray(next, 'dokumen');
            dokumen.splice(index, 1);
            dokumen.forEach((item, itemIndex) => {
                item.seriDokumen = itemIndex + 1;
            });
        });
    };

    const updateFirstArrayRow = (arrayKey: string, field: string, value: any) => {
        commitPayload((next) => {
            const rows = ensureArray(next, arrayKey);
            if (!rows[0]) rows[0] = {};
            rows[0][field] = value;
        });
    };

    const updateKontainer = (index: number, field: string, value: any) => {
        commitPayload((next) => {
            const kontainer = ensureArray(next, 'kontainer');
            if (!kontainer[index]) return;

            kontainer[index][field] = value;
            next.jumlahKontainer = kontainer.length;
        });
    };

    const addKontainer = () => {
        commitPayload((next) => {
            const kontainer = ensureArray(next, 'kontainer');
            kontainer.push({
                seriKontainer: kontainer.length + 1,
                kodeJenisKontainer: '8',
                kodeTipeKontainer: '1',
                kodeUkuranKontainer: '20',
                nomorKontainer: '',
            });
            next.jumlahKontainer = kontainer.length;
        });
    };

    const removeKontainer = (index: number) => {
        commitPayload((next) => {
            const kontainer = ensureArray(next, 'kontainer');
            kontainer.splice(index, 1);
            kontainer.forEach((item, itemIndex) => {
                item.seriKontainer = itemIndex + 1;
            });
            next.jumlahKontainer = kontainer.length;
        });
    };

    const updateBarang = (index: number, field: string, value: any) => {
        commitPayload((next) => {
            const barang = ensureArray(next, 'barang');
            if (!barang[index]) return;

            barang[index][field] = value;

            if (['fob', 'freight', 'asuransi'].includes(field)) {
                const fob = Number(barang[index].fob || 0);
                const freight = Number(barang[index].freight || 0);
                const asuransi = Number(barang[index].asuransi || 0);
                barang[index].cif = Number((fob + freight + asuransi).toFixed(4));
            }
        });
    };

    const addBarang = () => {
        commitPayload((next) => {
            const barang = ensureArray(next, 'barang');
            barang.push({
                seriBarang: barang.length + 1,
                posTarif: '',
                uraian: '',
                jumlahSatuan: 1,
                kodeSatuanBarang: 'PCE',
                hargaSatuan: 0,
                fob: 0,
                freight: 0,
                asuransi: 0,
                cif: 0,
                netto: 0,
                beratBersih: 0,
                jumlahKemasan: 1,
                kodeJenisKemasan: 'PK',
                merk: '',
                tipe: 'BARU',
                kodeKondisiBarang: '1',
                kodeNegaraAsal: '',
                saldoAwal: 1,
                saldoAkhir: 1,
                metodePenentuanNilai: 'Metode 1',
                statementPerbedaanHarga: 'T',
                pernyataanLartas: 'Y',
                barangTarif: [],
                barangVd: [],
            });
        });
    };

    const removeBarang = (index: number) => {
        commitPayload((next) => {
            const barang = ensureArray(next, 'barang');
            barang.splice(index, 1);
            barang.forEach((item, itemIndex) => {
                item.seriBarang = itemIndex + 1;
            });
        });
    };

    const entitas = Array.isArray(payload.entitas) ? payload.entitas : [];
    const dokumen = Array.isArray(payload.dokumen) ? payload.dokumen : [];
    const pengangkut = Array.isArray(payload.pengangkut) ? payload.pengangkut : [];
    const kemasan = Array.isArray(payload.kemasan) ? payload.kemasan : [];
    const kontainer = Array.isArray(payload.kontainer) ? payload.kontainer : [];
    const barang = Array.isArray(payload.barang) ? payload.barang : [];
    const importir = entitas.find((item: any) => item?.kodeEntitas === '1') || {};
    const pemilik = entitas.find((item: any) => item?.kodeEntitas === '7') || {};
    const pengirim = entitas.find((item: any) => item?.kodeEntitas === '9') || {};
    const penjual = entitas.find((item: any) => item?.kodeEntitas === '10') || {};
    const ppjk = entitas.find((item: any) => item?.kodeEntitas === '4') || {};
    const transport = pengangkut[0] || {};
    const packageRow = kemasan[0] || {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-6xl dark:border-zinc-800 dark:bg-zinc-900">
                <DialogHeader className="shrink-0 border-b px-6 py-4 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-2 text-left text-lg font-bold text-slate-900 dark:text-white">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Draft Dokumen CEISA
                    </DialogTitle>
                    <DialogDescription className="text-left text-xs text-slate-500 dark:text-zinc-400">
                        Submit dari modal ini selalu draft. Lengkapi field wajib sebelum kirim.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
                    <aside className="border-b bg-slate-50/70 p-4 lg:border-r lg:border-b-0 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Nomor Aju</div>
                                <div className="mt-1 text-sm font-bold break-all text-slate-900 dark:text-white">
                                    {nomorAju || payload.nomorAju || '-'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Tipe Dokumen</div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                    {documentType || payload.kodeDokumen || '-'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kelengkapan</div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                    {completedCount}/{requirements.length} wajib
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 lg:flex-col">
                            {tabConfig.map((tab) => {
                                const Icon = tab.icon;
                                const hasMissing = tabHasMissing(tab.key);

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex h-10 items-center justify-between rounded-lg border px-3 text-xs font-bold transition ${
                                            activeTab === tab.key
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-900'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                        </span>
                                        {tab.key !== 'advanced' &&
                                            (hasMissing ? (
                                                <XCircle className="h-3.5 w-3.5 text-amber-500" />
                                            ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            ))}
                                    </button>
                                );
                            })}
                        </div>

                        {missingRequirements.length > 0 && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                                    <AlertTriangle className="h-4 w-4" />
                                    Belum lengkap
                                </div>
                                <div className="space-y-1">
                                    {missingRequirements.slice(0, 8).map((item) => (
                                        <div
                                            key={`${item.group}-${item.label}`}
                                            className="text-[11px] font-medium text-amber-800 dark:text-amber-200"
                                        >
                                            {item.group}: {item.label}
                                        </div>
                                    ))}
                                    {missingRequirements.length > 8 && (
                                        <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                                            +{missingRequirements.length - 8} field lain
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>

                    <div className="min-h-0 overflow-y-auto px-6 py-4">
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            isFinal=false. Data akan masuk sebagai draft CEISA, bukan submit final.
                        </div>

                        {jsonError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                                JSON belum valid: {jsonError}
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-200">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Catatan sistem
                                </div>
                                <div className="space-y-1.5">
                                    {warnings.map((warning, index) => (
                                        <div key={`${warning}-${index}`} className="text-xs text-slate-500 dark:text-zinc-400">
                                            {warning}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'header' && (
                            <div className="space-y-5">
                                <div>
                                    <div className="mb-3 text-xs font-bold text-slate-800 dark:text-zinc-100">Header Dokumen</div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="space-y-1.5">
                                            {fieldLabel('Kode Kantor', true)}
                                            <Input
                                                value={payload.kodeKantor || ''}
                                                onChange={(e) => updateHeader('kodeKantor', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Kode TPS')}
                                            <Input
                                                value={payload.kodeTps || ''}
                                                onChange={(e) => updateHeader('kodeTps', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Valuta', true)}
                                            <select
                                                value={payload.kodeValuta || 'USD'}
                                                onChange={(e) => updateHeader('kodeValuta', e.target.value)}
                                                className={selectClass}
                                            >
                                                {valutaOptions.map((value) => (
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Pelabuhan Muat', true)}
                                            <Input
                                                value={payload.kodePelMuat || ''}
                                                onChange={(e) => updateHeader('kodePelMuat', e.target.value.toUpperCase())}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Pelabuhan Tujuan', true)}
                                            <Input
                                                value={payload.kodePelTujuan || ''}
                                                onChange={(e) => updateHeader('kodePelTujuan', e.target.value.toUpperCase())}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Tanggal Tiba', true)}
                                            <Input
                                                type="date"
                                                value={payload.tanggalTiba || ''}
                                                onChange={(e) => updateHeader('tanggalTiba', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jenis Impor', true)}
                                            <select
                                                value={payload.kodeJenisImpor || ''}
                                                onChange={(e) => updateHeader('kodeJenisImpor', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Pilih</option>
                                                {jenisImporOptions.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Cara Bayar', true)}
                                            <select
                                                value={payload.kodeCaraBayar || ''}
                                                onChange={(e) => updateHeader('kodeCaraBayar', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Pilih</option>
                                                {caraBayarOptions.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Tutup PU')}
                                            <select
                                                value={payload.kodeTutupPu || ''}
                                                onChange={(e) => updateHeader('kodeTutupPu', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Pilih</option>
                                                {tutupPuOptions.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 text-xs font-bold text-slate-800 dark:text-zinc-100">Nilai Pabean</div>
                                    <div className="grid gap-3 md:grid-cols-4">
                                        <div className="space-y-1.5">
                                            {fieldLabel('Incoterm', true)}
                                            <select
                                                value={payload.kodeIncoterm || 'CIF'}
                                                onChange={(e) => updateHeader('kodeIncoterm', e.target.value)}
                                                className={selectClass}
                                            >
                                                {incotermOptions.map((value) => (
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('NDPBM / Kurs', true)}
                                            <Input
                                                type="number"
                                                value={payload.ndpbm ?? 0}
                                                onChange={(e) => updateHeader('ndpbm', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('FOB', true)}
                                            <Input
                                                type="number"
                                                value={payload.fob ?? 0}
                                                onChange={(e) => updateHeader('fob', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Freight', true)}
                                            <Input
                                                type="number"
                                                value={payload.freight ?? 0}
                                                onChange={(e) => updateHeader('freight', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Asuransi', true)}
                                            <Input
                                                type="number"
                                                value={payload.asuransi ?? 0}
                                                onChange={(e) => updateHeader('asuransi', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('CIF')}
                                            <Input
                                                type="number"
                                                value={payload.cif ?? 0}
                                                onChange={(e) => updateHeader('cif', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Bruto KG')}
                                            <Input
                                                type="number"
                                                value={payload.bruto ?? 0}
                                                onChange={(e) => updateHeader('bruto', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Netto KG', true)}
                                            <Input
                                                type="number"
                                                value={payload.netto ?? 0}
                                                onChange={(e) => updateHeader('netto', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 text-xs font-bold text-slate-800 dark:text-zinc-100">Penandatangan</div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="space-y-1.5">
                                            {fieldLabel('Nama', true)}
                                            <Input
                                                value={payload.namaTtd || ''}
                                                onChange={(e) => updateHeader('namaTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jabatan', true)}
                                            <Input
                                                value={payload.jabatanTtd || ''}
                                                onChange={(e) => updateHeader('jabatanTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Kota', true)}
                                            <Input
                                                value={payload.kotaTtd || ''}
                                                onChange={(e) => updateHeader('kotaTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'entities' && (
                            <div className="space-y-5">
                                <EntitySection title="Importir" required>
                                    <EntityFields
                                        entity={importir}
                                        onChange={(field, value) => updateEntity('1', field, value)}
                                        fields={[
                                            'namaEntitas',
                                            'alamatEntitas',
                                            'nomorIdentitas',
                                            'nitku',
                                            'nibEntitas',
                                            'kodeStatus',
                                            'kodeJenisApi',
                                        ]}
                                    />
                                </EntitySection>
                                <EntitySection title="Pemilik Barang" required>
                                    <EntityFields
                                        entity={pemilik}
                                        onChange={(field, value) => updateEntity('7', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nitku', 'kodeAfiliasi']}
                                    />
                                </EntitySection>
                                <EntitySection title="Pengirim / Shipper">
                                    <EntityFields
                                        entity={pengirim}
                                        onChange={(field, value) => updateEntity('9', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'kodeNegara']}
                                    />
                                </EntitySection>
                                <EntitySection title="Penjual" required>
                                    <EntityFields
                                        entity={penjual}
                                        onChange={(field, value) => updateEntity('10', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'kodeNegara']}
                                    />
                                </EntitySection>
                                <EntitySection title="PPJK">
                                    <EntityFields
                                        entity={ppjk}
                                        onChange={(field, value) => updateEntity('4', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nitku', 'nibEntitas', 'kodeNegara']}
                                    />
                                </EntitySection>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">Dokumen Pendukung</div>
                                        <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                            Invoice 380 dan B/L 705 atau AWB 740 wajib untuk draft import.
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addDocument()}
                                        className="h-8 gap-2 rounded-lg text-[11px] font-bold"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Tambah
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {dokumen.map((row: any, index: number) => (
                                        <div
                                            key={`${row.kodeDokumen}-${index}`}
                                            className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[160px_1fr_170px_40px] dark:border-zinc-800"
                                        >
                                            <div className="space-y-1.5">
                                                {fieldLabel('Jenis', ['380', '705', '740'].includes(row.kodeDokumen))}
                                                <select
                                                    value={row.kodeDokumen || ''}
                                                    onChange={(e) => updateDocument(index, 'kodeDokumen', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    <option value="">Pilih</option>
                                                    {documentOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Nomor Dokumen', ['380', '705', '740'].includes(row.kodeDokumen))}
                                                <Input
                                                    value={row.nomorDokumen || ''}
                                                    onChange={(e) => updateDocument(index, 'nomorDokumen', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Tanggal Dokumen', ['380', '705', '740'].includes(row.kodeDokumen))}
                                                <Input
                                                    type="date"
                                                    value={row.tanggalDokumen || ''}
                                                    onChange={(e) => updateDocument(index, 'tanggalDokumen', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeDocument(index)}
                                                    className="h-9 w-9 p-0 text-rose-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'transport' && (
                            <div className="space-y-5">
                                <div>
                                    <div className="mb-3 text-xs font-bold text-slate-800 dark:text-zinc-100">Pengangkut</div>
                                    <div className="grid gap-3 md:grid-cols-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            {fieldLabel('Nama Sarana Pengangkut')}
                                            <Input
                                                value={transport.namaPengangkut || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'namaPengangkut', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Voyage / Flight')}
                                            <Input
                                                value={transport.nomorPengangkut || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'nomorPengangkut', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Bendera')}
                                            <Input
                                                value={transport.kodeBendera || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'kodeBendera', e.target.value.toUpperCase())}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 text-xs font-bold text-slate-800 dark:text-zinc-100">Kemasan</div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jenis Kemasan', true)}
                                            <select
                                                value={packageRow.kodeJenisKemasan || 'PK'}
                                                onChange={(e) => updateFirstArrayRow('kemasan', 'kodeJenisKemasan', e.target.value)}
                                                className={selectClass}
                                            >
                                                {kemasanOptions.map((value) => (
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jumlah Kemasan', true)}
                                            <Input
                                                type="number"
                                                value={packageRow.jumlahKemasan ?? 1}
                                                onChange={(e) => updateFirstArrayRow('kemasan', 'jumlahKemasan', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Merk Kemasan')}
                                            <Input
                                                value={packageRow.merkKemasan || ''}
                                                onChange={(e) => updateFirstArrayRow('kemasan', 'merkKemasan', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">Kontainer</div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addKontainer}
                                            className="h-8 gap-2 rounded-lg text-[11px] font-bold"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Tambah
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {kontainer.length === 0 && (
                                            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-zinc-800">
                                                Belum ada kontainer.
                                            </div>
                                        )}
                                        {kontainer.map((row: any, index: number) => (
                                            <div
                                                key={index}
                                                className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_120px_120px_40px] dark:border-zinc-800"
                                            >
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Nomor Kontainer')}
                                                    <Input
                                                        value={row.nomorKontainer || ''}
                                                        onChange={(e) => updateKontainer(index, 'nomorKontainer', e.target.value.toUpperCase())}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Ukuran')}
                                                    <select
                                                        value={row.kodeUkuranKontainer || '20'}
                                                        onChange={(e) => updateKontainer(index, 'kodeUkuranKontainer', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        <option value="20">20</option>
                                                        <option value="40">40</option>
                                                        <option value="45">45</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Jenis')}
                                                    <Input
                                                        value={row.kodeJenisKontainer || '8'}
                                                        onChange={(e) => updateKontainer(index, 'kodeJenisKontainer', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeKontainer(index)}
                                                        className="h-9 w-9 p-0 text-rose-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'goods' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">Barang & HS Code</div>
                                        <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                            Minimal satu barang dengan HS code, uraian, satuan, dan jumlah.
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addBarang}
                                        className="h-8 gap-2 rounded-lg text-[11px] font-bold"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Tambah
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {barang.map((row: any, index: number) => (
                                        <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs font-bold text-slate-700 dark:text-zinc-200">Barang {index + 1}</div>
                                                {barang.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeBarang(index)}
                                                        className="h-8 gap-1.5 text-rose-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Hapus
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-4">
                                                <div className="space-y-1.5">
                                                    {fieldLabel('HS Code', true)}
                                                    <Input
                                                        value={row.posTarif || ''}
                                                        onChange={(e) => updateBarang(index, 'posTarif', e.target.value.replace(/\D/g, ''))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    {fieldLabel('Uraian', true)}
                                                    <Input
                                                        value={row.uraian || ''}
                                                        onChange={(e) => updateBarang(index, 'uraian', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Negara Asal')}
                                                    <Input
                                                        value={row.kodeNegaraAsal || ''}
                                                        onChange={(e) => updateBarang(index, 'kodeNegaraAsal', e.target.value.toUpperCase())}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Jumlah', true)}
                                                    <Input
                                                        type="number"
                                                        value={row.jumlahSatuan ?? 1}
                                                        onChange={(e) => updateBarang(index, 'jumlahSatuan', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Satuan', true)}
                                                    <select
                                                        value={row.kodeSatuanBarang || 'PCE'}
                                                        onChange={(e) => updateBarang(index, 'kodeSatuanBarang', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {satuanOptions.map((value) => (
                                                            <option key={value} value={value}>
                                                                {value}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Harga Satuan')}
                                                    <Input
                                                        type="number"
                                                        value={row.hargaSatuan ?? 0}
                                                        onChange={(e) => updateBarang(index, 'hargaSatuan', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Netto KG')}
                                                    <Input
                                                        type="number"
                                                        value={row.netto ?? 0}
                                                        onChange={(e) => updateBarang(index, 'netto', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('FOB')}
                                                    <Input
                                                        type="number"
                                                        value={row.fob ?? 0}
                                                        onChange={(e) => updateBarang(index, 'fob', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Freight')}
                                                    <Input
                                                        type="number"
                                                        value={row.freight ?? 0}
                                                        onChange={(e) => updateBarang(index, 'freight', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Asuransi')}
                                                    <Input
                                                        type="number"
                                                        value={row.asuransi ?? 0}
                                                        onChange={(e) => updateBarang(index, 'asuransi', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('CIF')}
                                                    <Input
                                                        type="number"
                                                        value={row.cif ?? 0}
                                                        onChange={(e) => updateBarang(index, 'cif', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Merk', true)}
                                                    <Input
                                                        value={row.merk || ''}
                                                        onChange={(e) => updateBarang(index, 'merk', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Tipe', true)}
                                                    <Input
                                                        value={row.tipe || 'BARU'}
                                                        onChange={(e) => updateBarang(index, 'tipe', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-zinc-200">Payload JSON</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onRegenerate}
                                        disabled={isPreparing || isSubmitting}
                                        className="h-8 gap-2 rounded-lg text-[11px] font-bold"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isPreparing ? 'animate-spin' : ''}`} />
                                        Nomor Baru
                                    </Button>
                                </div>
                                <Textarea
                                    value={payloadText}
                                    onChange={(event) => onPayloadTextChange(event.target.value)}
                                    spellCheck={false}
                                    className="min-h-[520px] resize-y rounded-xl border-slate-200 bg-slate-950 font-mono text-xs leading-relaxed text-slate-100 selection:bg-blue-500/40 focus:ring-blue-500/20 dark:border-zinc-800"
                                    placeholder="{ }"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t bg-slate-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-lg">
                        Tutup
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onRegenerate}
                        disabled={isPreparing || isSubmitting}
                        className="gap-2 rounded-lg"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPreparing ? 'animate-spin' : ''}`} />
                        Nomor Baru
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isPreparing || isSubmitting || !payloadText || !!jsonError || missingRequirements.length > 0}
                        className="gap-2 rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Kirim Draft CEISA
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EntitySection({ title, required, children }: { title: string; required?: boolean; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-100">
                {title}
                {required && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        Wajib
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

function EntityFields({
    entity,
    fields,
    onChange,
}: {
    entity: Record<string, any>;
    fields: string[];
    onChange: (field: string, value: string) => void;
}) {
    const labels: Record<string, string> = {
        namaEntitas: 'Nama',
        alamatEntitas: 'Alamat',
        nomorIdentitas: 'Nomor Identitas',
        nitku: 'NITKU',
        nibEntitas: 'NIB',
        kodeStatus: 'Status',
        kodeJenisApi: 'Jenis API',
        kodeAfiliasi: 'Afiliasi',
        kodeNegara: 'Negara',
    };

    return (
        <div className="grid gap-3 md:grid-cols-3">
            {fields.map((field) => (
                <div key={field} className={`space-y-1.5 ${field === 'alamatEntitas' ? 'md:col-span-2' : ''}`}>
                    {fieldLabel(
                        labels[field] || field,
                        ['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nibEntitas', 'kodeNegara'].includes(field),
                    )}
                    <Input
                        value={entity?.[field] || ''}
                        onChange={(event) => onChange(field, field === 'kodeNegara' ? event.target.value.toUpperCase() : event.target.value)}
                        className={inputClass}
                    />
                </div>
            ))}
        </div>
    );
}
