/* eslint-disable @typescript-eslint/no-explicit-any */
import { usePage } from '@inertiajs/react';

type FlashMessage = {
    success?: string | null;
    error?: string | null;
};

type SpkItem = {
    id: number;
    spk_code: string;
    shipment_type?: string | null;
};

type DocumentItem = {
    id: number;
    id_spk?: number;
    id_section?: number;
    section_name?: string | null;
    nama_file: string | null;
    url_path_file?: string | null;
    verify?: boolean | null;
    is_updated?: boolean;
    updated_at: string | null;
    updated_at_full?: string | null;
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

    const totalDocs = documents.length;
    const verifiedCount = documents.filter((doc) => doc.verify === true).length;
    const pendingCount = documents.filter((doc) => doc.verify !== true).length;
    const updatedCount = documents.filter((doc) => doc.is_updated === true).length;

    const progressPercentage = totalDocs === 0 ? 0 : Math.round((verifiedCount / totalDocs) * 100);

    return (
        <div className="animate-in fade-in w-full bg-slate-50 p-3 font-sans text-sm text-slate-900 duration-500 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="mx-auto w-full max-w-7xl space-y-5">
                <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                                {trans.status || 'Shipment Document View'}
                            </div>
                            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Data Dokumen Shipment</h1>
                            <p className="mt-2 text-sm text-slate-500">
                                SPK: <span className="font-semibold text-slate-800 dark:text-zinc-200">{spk?.spk_code ?? '-'}</span>
                            </p>
                            {spk?.shipment_type && (
                                <p className="mt-1 text-sm text-slate-500">
                                    Shipment Type: <span className="font-semibold text-slate-800 dark:text-zinc-200">{spk.shipment_type}</span>
                                </p>
                            )}
                        </div>

                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold ${
                                progressPercentage === 100
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                        >
                            {progressPercentage}%
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>{trans.document_completion || 'Document Progress'}</span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${
                                    progressPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Verified {verifiedCount} dari {totalDocs} dokumen
                        </div>
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">Total Dokumen</div>
                        <div className="mt-3 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">{totalDocs}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">Sudah Diupdate</div>
                        <div className="mt-3 text-5xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">{updatedCount}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">Verified</div>
                        <div className="mt-3 text-5xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="text-sm font-medium text-slate-500">Pending</div>
                        <div className="mt-3 text-5xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">{pendingCount}</div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b px-5 py-4 dark:border-zinc-800">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">List Dokumen SPK</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Menampilkan dokumen dari table <b>document_trans</b>
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-zinc-800/50">
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        No
                                    </th>
                                    <th className="border-b px-4 py-3 text-left text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        Nama File
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        Tanggal
                                    </th>
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        Updated
                                    </th>
                                    {/* <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        Status
                                    </th> */}
                                    <th className="border-b px-4 py-3 text-center text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-zinc-800">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {documents.length > 0 ? (
                                    documents.map((doc, index) => (
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
                                                        <div className="text-xs text-slate-400">Section: {doc.section_name ?? '-'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="border-b px-4 py-4 text-center text-sm text-slate-700 dark:border-zinc-800 dark:text-zinc-300">
                                                <div>{doc.updated_at ?? '-'}</div>
                                                {doc.updated_at_full && <div className="mt-1 text-[11px] text-slate-400">{doc.updated_at_full}</div>}
                                            </td>

                                            <td className="border-b px-4 py-4 text-center dark:border-zinc-800">
                                                <span
                                                    className={`inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${
                                                        doc.is_updated
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                                                            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {doc.is_updated ? 'Sudah' : 'Belum'}
                                                </span>
                                            </td>

                                            {/* <td className="border-b px-4 py-4 text-center dark:border-zinc-800">
                                                <span
                                                    className={`inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${
                                                        doc.verify
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                                                    }`}
                                                >
                                                    {doc.verify ? 'Verified' : 'Pending'}
                                                </span>
                                            </td> */}

                                            <td className="border-b px-4 py-4 text-center dark:border-zinc-800">
                                                {doc.url_path_file ? (
                                                    <a
                                                        href={doc.url_path_file}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                                    >
                                                        Lihat
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center dark:border-zinc-800">
                                            <div className="text-base font-semibold text-slate-700 dark:text-zinc-200">Belum ada data dokumen</div>
                                            <div className="mt-1 text-sm text-slate-400">Dokumen untuk SPK ini belum tersedia.</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
