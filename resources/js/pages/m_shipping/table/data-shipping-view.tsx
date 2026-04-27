/* eslint-disable @typescript-eslint/no-explicit-any */
import { usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp, FileDown, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

type FlashMessage = {
    success?: string | null;
    error?: string | null;
};

type SpkItem = {
    id: number;
    spk_code: string;
    shipment_type?: string | null;
    internal_can_upload?: boolean;
    penjaluran?: string | null;
    register_number?: string | null;
    register_date?: string | null;

    shipper?: string | null;
    consignee?: string | null;
    vessel?: string | null;
    aju?: string | null;
    j_o?: string | null;
    party_summary?: string | null;
};

type DocumentItem = {
    id: number;
    id_dokumen?: number;
    id_spk?: number;
    id_section?: number;
    section_name?: string | null;
    nama_file: string | null;
    url_path_file?: string | null;
    verify?: boolean | null;
    is_updated?: boolean;

    updated_at: string | null;
    updated_at_full?: string | null;

    upload_date?: string | null;
    upload_date_full?: string | null;

    verified_date?: string | null;
    verified_date_full?: string | null;

    ori_date?: string | null;
    ori_date_full?: string | null;
};

interface Props {
    spk?: SpkItem;
    documents?: DocumentItem[];
    flash?: FlashMessage;
    userRole?: string;
}

export default function DataShippingFormView({ spk, documents = [], flash }: Props) {
    const { props } = usePage();
    const trans = (props as any).trans_general || {};

    const groupedDocuments = useMemo(() => {
        const groups = new Map<string, DocumentItem[]>();

        documents.forEach((doc) => {
            const key = doc.id_dokumen != null ? String(doc.id_dokumen) : `${doc.section_name ?? ''}|${doc.nama_file ?? ''}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }

            groups.get(key)?.push(doc);
        });

        return Array.from(groups.values()).map((group) => {
            const sorted = [...group].sort((a, b) => {
                const aTime = a.updated_at_full
                    ? new Date(a.updated_at_full.replace(' WIB', '')).getTime()
                    : a.updated_at
                      ? new Date(a.updated_at).getTime()
                      : 0;

                const bTime = b.updated_at_full
                    ? new Date(b.updated_at_full.replace(' WIB', '')).getTime()
                    : b.updated_at
                      ? new Date(b.updated_at).getTime()
                      : 0;

                return bTime - aTime;
            });

            return {
                current: sorted[0], // versi terbaru
                history: sorted, // semua versi
            };
        });
    }, [documents]);

    const [openFileIds, setOpenFileIds] = useState<number[]>([]);
    const [openDownloadOptions, setOpenDownloadOptions] = useState(false);

    const toggleFile = (id: number) => {
        setOpenFileIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const totalDocs = groupedDocuments.length;
    const verifiedCount = groupedDocuments.filter((item) => item.current.verify === true).length;
    const pendingCount = groupedDocuments.filter((item) => item.current.verify !== true).length;
    const updatedCount = groupedDocuments.filter((item) => item.current.is_updated === true).length;

    const progressPercentage = totalDocs === 0 ? 0 : Math.round((verifiedCount / totalDocs) * 100);

    return (
        <div className="animate-in fade-in w-full bg-slate-50 p-3 font-sans text-sm text-slate-900 duration-500 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="mx-auto w-full max-w-7xl space-y-5">
                <div className="flex justify-stretch sm:justify-end">
                    <div className="relative w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setOpenDownloadOptions((prev) => !prev)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 sm:w-auto"
                        >
                            <FileDown className="h-4 w-4" />
                            {trans.download_pdf || 'Download PDF'}
                            {openDownloadOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {openDownloadOptions && (
                            <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:min-w-[260px] dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="flex flex-col gap-2">
                                    <a
                                        href={`/shipping/${spk?.id}/pdf?template=false`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        {trans.overview_spk || 'Overview SPK'}
                                    </a>

                                    <a
                                        href={`/shipping/${spk?.id}/pdf?template=true&karantina=true`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        {trans.spk_template_karantina || 'SPK Template Karantina'}
                                    </a>

                                    <a
                                        href={`/shipping/${spk?.id}/pdf?template=true&karantina=false`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        {trans.spk_template_non_karantina || 'SPK Template Non Karantina'}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CARD INFORMASI */}
                <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-5">
                        <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                            {trans.shipment_document_view || 'Shipment Document View'}
                        </div>

                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {trans.shipment_document_data || 'Shipment Document Data'}
                        </h1>
                    </div>

                    {(() => {
                        const leftItems = [
                            {
                                label: trans.shipper_label || 'SHIPPER',
                                value: spk?.shipper,
                            },
                            {
                                label: trans.consignee_label || "C'NEE",
                                value: spk?.consignee,
                            },
                            {
                                label: trans.bl_number_label || 'B/L NUMBER',
                                value: spk?.spk_code,
                            },
                        ].filter((item) => item.value && item.value !== '-');

                        const rightItems = [
                            {
                                label: trans.vessel_label || 'VESSEL',
                                value: spk?.vessel,
                            },
                            {
                                label: trans.part_label || 'PARTY',
                                value: spk?.party_summary ? spk.party_summary.split(',').map((item) => item.trim()) : null,
                            },
                            {
                                label: trans.aju_label || 'AJU',
                                value: spk?.aju,
                            },
                            {
                                label: trans.jo_label || 'J.O',
                                value: spk?.j_o,
                            },
                        ].filter((item) => item.value && item.value !== '-');

                        return (
                            <div className="max-w-8xl mx-auto px-2 sm:px-0">
                                <div className="flex flex-col gap-6 md:flex-row md:justify-between md:gap-16">
                                    <div className="space-y-3">
                                        {leftItems.map((item) => (
                                            <div key={item.label} className="flex items-start gap-3">
                                                <span className="min-w-[110px] text-sm font-bold text-slate-700 uppercase dark:text-zinc-300">
                                                    {item.label}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">:</span>
                                                <span className="text-base font-semibold text-slate-900 dark:text-white">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        {rightItems.map((item) => (
                                            <div key={item.label} className="flex items-start gap-3">
                                                <span className="min-w-[110px] text-sm font-bold text-slate-700 uppercase dark:text-zinc-300">
                                                    {item.label}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">:</span>
                                                <span className="text-base font-semibold text-slate-900 dark:text-white">
                                                    {Array.isArray(item.value) ? (
                                                        <ul className="list-disc space-y-1 pl-4">
                                                            {item.value.map((party, index) => (
                                                                <li key={index}>{party}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        item.value
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* CARD PROGRESS */}
                <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                            <div className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                                {trans.document_progress || 'Document Progress'}
                            </div>
                            <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                {progressPercentage === 100
                                    ? trans.progress_completed || 'Completed'
                                    : progressPercentage > 0
                                      ? trans.progress_in_process || 'In Progress'
                                      : trans.progress_not_started || 'Not Started'}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-zinc-400">
                                {trans.verified || 'Verified'} {verifiedCount} {trans.of || 'of'} {totalDocs}{' '}
                                {trans.document?.toLowerCase?.() || 'documents'}
                            </div>
                        </div>

                        <div
                            className={`inline-flex h-16 min-w-[72px] items-center justify-center rounded-2xl px-4 text-xl font-extrabold shadow-sm ${
                                progressPercentage === 100
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                        >
                            {progressPercentage}%
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                            <span>{trans.progress_bar_label || 'Overall Progress'}</span>
                            <span>{progressPercentage}%</span>
                        </div>

                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-zinc-800">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    progressPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-400">
                        <span>
                            {trans.updated_documents || 'Updated'}: <strong className="text-slate-700 dark:text-zinc-200">{updatedCount}</strong>
                        </span>
                        <span>
                            {trans.pending || 'Pending'}: <strong className="text-slate-700 dark:text-zinc-200">{pendingCount}</strong>
                        </span>
                    </div>
                </div>

                {(flash?.success || flash?.error) && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                            flash?.error
                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                        }`}
                    >
                        {flash?.success || flash?.error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">{trans.total_documents || 'Total Dokumen'}</div>
                        <div className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">{totalDocs}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">{trans.updated_documents || 'Sudah Diupdate'}</div>
                        <div className="mt-3 text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl dark:text-blue-400">{updatedCount}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">{trans.verified || 'Verified'}</div>
                        <div className="mt-3 text-4xl font-extrabold tracking-tight text-emerald-600 sm:text-5xl dark:text-emerald-400">
                            {verifiedCount}
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">{trans.pending || 'Pending'}</div>
                        <div className="mt-3 text-4xl font-extrabold tracking-tight text-amber-600 sm:text-5xl dark:text-amber-400">
                            {pendingCount}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b px-5 py-4 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{trans.spk_document_list || 'List Dokumen SPK'}</h2>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.no || 'No'}
                                    </th>
                                    <th className="border-b px-4 py-3 text-left text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.file_name || 'Nama File'}
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.upload_date || 'Upload Date'}
                                    </th>

                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.verified_date || 'Verified Date'}
                                    </th>

                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.ori_date || 'ORI Date'}
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.updated || 'Updated'}
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.status || 'Status'}
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        {trans.action || 'Aksi'}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {groupedDocuments.length > 0 ? (
                                    groupedDocuments.map((item, index) => {
                                        const doc = item.current;
                                        const versions = item.history;

                                        return (
                                            <tr key={doc.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                                                <td className="border-b px-4 py-4 text-center text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                                                    {index + 1}
                                                </td>

                                                <td className="border-b px-4 py-4 dark:border-zinc-800">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/20">
                                                            📄
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white">{doc.nama_file ?? '-'}</div>
                                                            <div className="text-xs text-slate-400">
                                                                {trans.section || 'Section'}: {doc.section_name ?? '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="border-b px-4 py-4 text-center text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                                                    {doc.upload_date ?? '-'}
                                                </td>

                                                <td className="border-b px-4 py-4 text-center text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                                                    {doc.verified_date ?? '-'}
                                                </td>

                                                <td className="border-b px-4 py-4 text-center text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                                                    {doc.ori_date ?? '-'}
                                                </td>

                                                <td className="border-b px-4 py-4 text-center dark:border-zinc-800">
                                                    <span
                                                        className={`inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${
                                                            doc.is_updated
                                                                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                                                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                        }`}
                                                    >
                                                        {doc.is_updated ? trans.already_updated || 'Sudah' : trans.not_updated || 'Belum'}
                                                    </span>
                                                </td>

                                                {/* ✅ KOLOM STATUS */}
                                                <td className="border-b px-4 py-4 text-center dark:border-zinc-800">
                                                    <span
                                                        className={`inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${
                                                            doc.verify === true
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {doc.verify === true ? trans.verified || 'Verified' : trans.pending || 'Pending'}
                                                    </span>
                                                </td>

                                                <td className="border-b px-4 py-4 text-center align-top dark:border-zinc-800">
                                                    {doc.url_path_file ? (
                                                        <div className="flex flex-col items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleFile(doc.id)}
                                                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                                            >
                                                                <FileText className="h-3.5 w-3.5" />
                                                                {trans.view || 'View'}
                                                                {openFileIds.includes(doc.id) ? (
                                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>

                                                            {openFileIds.includes(doc.id) && (
                                                                <div className="mt-2 w-full min-w-[220px] rounded-lg border border-slate-200 bg-slate-50 p-2 text-left dark:border-zinc-700 dark:bg-zinc-800">
                                                                    <div className="flex flex-col gap-1 border-l-2 border-slate-300 pl-2 dark:border-zinc-600">
                                                                        {versions.map((version, vIdx, arr) => (
                                                                            <div key={version.id} className="flex items-center gap-2 text-xs">
                                                                                <span className="font-bold text-slate-500 dark:text-zinc-400">
                                                                                    v{arr.length - vIdx}
                                                                                </span>

                                                                                {version.url_path_file ? (
                                                                                    <a
                                                                                        href={`/file/view/${version.url_path_file}`}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className={`transition-colors hover:underline ${
                                                                                            vIdx === 0
                                                                                                ? 'font-bold text-slate-900 dark:text-white'
                                                                                                : 'text-slate-600 dark:text-zinc-300'
                                                                                        }`}
                                                                                    >
                                                                                        {version.nama_file ?? '-'}
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-slate-400">-</span>
                                                                                )}

                                                                                <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                                                                    {version.updated_at ?? '-'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center dark:border-zinc-800">
                                            <div className="text-base font-semibold text-slate-700 dark:text-zinc-200">
                                                {trans.no_document_data || 'Belum ada data dokumen'}
                                            </div>
                                            <div className="mt-1 text-sm text-slate-400">
                                                {trans.no_document_for_spk || 'Dokumen untuk SPK ini belum tersedia.'}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="space-y-4 p-4 md:hidden">
                        {groupedDocuments.length > 0 ? (
                            groupedDocuments.map((item, index) => {
                                const doc = item.current;
                                const versions = item.history;

                                return (
                                    <div
                                        key={doc.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/20">
                                                📄
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {index + 1}. {doc.nama_file ?? '-'}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-400">
                                                    {trans.section || 'Section'}: {doc.section_name ?? '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-400 uppercase">
                                                    {trans.upload_date || 'Upload Date'}
                                                </div>
                                                <div className="font-medium text-slate-900 dark:text-white">{doc.upload_date ?? '-'}</div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-bold text-slate-400 uppercase">
                                                    {trans.verified_date || 'Verified Date'}
                                                </div>
                                                <div className="font-medium text-slate-900 dark:text-white">{doc.verified_date ?? '-'}</div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-bold text-slate-400 uppercase">{trans.ori_date || 'ORI Date'}</div>
                                                <div className="font-medium text-slate-900 dark:text-white">{doc.ori_date ?? '-'}</div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-bold text-slate-400 uppercase">{trans.updated || 'Updated'}</div>
                                                <div className="mt-1">
                                                    <span
                                                        className={`inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${
                                                            doc.is_updated
                                                                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                                                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                        }`}
                                                    >
                                                        {doc.is_updated ? trans.already_updated || 'Sudah' : trans.not_updated || 'Belum'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            {doc.url_path_file ? (
                                                <div className="flex flex-col items-stretch">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFile(doc.id)}
                                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                        {trans.view || 'View'}
                                                        {openFileIds.includes(doc.id) ? (
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

                                                    {openFileIds.includes(doc.id) && (
                                                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-left dark:border-zinc-700 dark:bg-zinc-800">
                                                            <div className="flex flex-col gap-1 border-l-2 border-slate-300 pl-2 dark:border-zinc-600">
                                                                {versions.map((version, vIdx, arr) => (
                                                                    <div key={version.id} className="flex items-center gap-2 text-xs">
                                                                        <span className="font-bold text-slate-500 dark:text-zinc-400">
                                                                            v{arr.length - vIdx}
                                                                        </span>

                                                                        {version.url_path_file ? (
                                                                            <a
                                                                                href={`/file/view/${version.url_path_file}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className={`transition-colors hover:underline ${
                                                                                    vIdx === 0
                                                                                        ? 'font-bold text-slate-900 dark:text-white'
                                                                                        : 'text-slate-600 dark:text-zinc-300'
                                                                                }`}
                                                                            >
                                                                                {version.nama_file ?? '-'}
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-slate-400">-</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-10 text-center">
                                <div className="text-base font-semibold text-slate-700 dark:text-zinc-200">
                                    {trans.no_document_data || 'Belum ada data dokumen'}
                                </div>
                                <div className="mt-1 text-sm text-slate-400">
                                    {trans.no_document_for_spk || 'Dokumen untuk SPK ini belum tersedia.'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
