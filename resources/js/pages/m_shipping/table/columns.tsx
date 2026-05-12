import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Link, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Eye, MoreHorizontal, Pencil } from 'lucide-react';

// const downloadPdf = (id: number) => {
//     const link = document.createElement('a');
//     link.href = `/shipping/${id}/pdf`;
//     link.setAttribute('download', `customer_${id}.pdf`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// };

export type Shipping = {
    id: string | number;
    spk_code: string;
    nama_customer: string;
    tanggal_status: string;
    status_label: string;
    nama_user: string;
    jalur: string;
    deadline_date?: string | null;
    deadline_section_name?: string | null;
    progress: number;
    eta_date?: string | null;
    vessel?: string | null;
    origin?: string | null;
    port?: string | null;
    comodity?: string | null;
    party_summary?: string | null;
    validated_by?: number | string | null;
    drafter?: string | null;
};

const stickyView = 'sticky left-0 z-40 w-[100px] min-w-[100px] bg-background align-middle';
const stickyCustomer = 'sticky left-[100px] z-40 w-[130px] min-w-[130px] bg-background align-middle';
const stickySpk = 'sticky left-[230px] z-40 w-[150px] min-w-[150px] bg-background align-middle';
const stickyDrafter = 'sticky left-[380px] z-40 w-[150px] min-w-[150px] bg-background align-middle';
const stickyEta = 'sticky left-[530px] z-40 w-[180px] min-w-[180px] bg-background align-middle shadow-[6px_0_12px_-10px_rgba(0,0,0,0.8)]';

const th = 'px-3 py-3 text-left align-middle text-sm font-medium whitespace-nowrap';
const td = 'px-3 py-3 text-left align-middle text-sm';
const tdCenter = 'px-3 py-3 text-center align-middle text-sm';

export const columns = (
    trans: Record<string, string>, // <--- INI PENTING
    onDeleteClick?: (shipping: Shipping) => void,
): ColumnDef<Shipping>[] => {
    if (typeof window !== 'undefined') {
        const hasReloaded = localStorage.getItem('hasReloadedCustomerPage');

        if (!hasReloaded) {
            localStorage.setItem('hasReloadedCustomerPage', 'true');
            window.location.reload();
        }
    }

    return [
        {
            id: 'view_documents',
            header: () => <div className="w-[100px] text-center"></div>,
            meta: {
                headerClassName: stickyView,
                cellClassName: stickyView,
            },
            cell: ({ row }) => {
                const shipping = row.original;
                const { auth } = usePage().props as any;

                const roleInternal = String(auth.user?.role_internal ?? '').toLowerCase();

                const isStaffRole = auth.user?.role === 'internal' && roleInternal.includes('staff');

                const hasValidatedBy =
                    shipping.validated_by !== null && shipping.validated_by !== undefined && String(shipping.validated_by).trim() !== '';

                const currentUserId = auth.user?.id_user;

                const isAssignedToCurrentStaff = hasValidatedBy && String(shipping.validated_by) === String(currentUserId);

                const canEdit = !isStaffRole || isAssignedToCurrentStaff;

                return (
                    <div className="flex items-center justify-center gap-2 md:px-2">
                        <Link
                            href={`/shipping/documents/${shipping.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white"
                            title="View Documents"
                        >
                            <Eye className="h-4 w-4" />
                        </Link>

                        {canEdit ? (
                            <Link
                                href={`/shipping/${shipping.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500/50 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                                title="Edit Shipping"
                            >
                                <Pencil className="h-4 w-4" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                disabled
                                className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-400 opacity-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
                                title="Belum di-assign / belum ada validated_by"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'nama_customer',
            meta: {
                headerClassName: stickyCustomer,
                cellClassName: stickyCustomer,
            },
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.customer_name}
                </div>
            ),
            cell: ({ row }) => (
                <div className="w-[130px] truncate px-3 py-3 text-left text-sm font-semibold">{row.original.nama_customer || '-'}</div>
            ),
        },
        {
            accessorKey: 'spk_code',
            meta: {
                headerClassName: stickySpk,
                cellClassName: stickySpk,
            },
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.spk_number}
                </div>
            ),
            cell: ({ row }) => <div className="w-[150px] truncate px-3 py-3 text-left text-sm font-bold">{row.original.spk_code ?? '-'}</div>,
        },
        {
            accessorKey: 'drafter',
            meta: {
                headerClassName: stickyDrafter,
                cellClassName: stickyDrafter,
            },
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Drafter
                </div>
            ),
            cell: ({ row }) => <div className="w-[150px] truncate px-3 py-3 text-left text-sm">{row.original.drafter || '-'}</div>,
        },
        {
            accessorKey: 'eta_date',
            meta: {
                headerClassName: stickyEta,
                cellClassName: stickyEta,
            },
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    ETA
                </div>
            ),
            cell: ({ row }) => {
                const eta = row.original.eta_date;

                if (!eta) {
                    return <div className="text-sm md:px-2">-</div>;
                }

                const date = new Date(eta);

                const formatted = date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });

                // Hitung H-
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const etaDate = new Date(eta);
                etaDate.setHours(0, 0, 0, 0);

                const diffTime = etaDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                    <div className="flex w-[180px] flex-col justify-center gap-1 px-3 py-3 text-left">
                        <span className="text-sm leading-none">{formatted}</span>

                        <div
                            className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${diffDays > 0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                : diffDays === 0
                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                                }`}
                        >
                            {diffDays > 0 ? `H-${diffDays}` : diffDays === 0 ? 'ETA Hari Ini' : `Lewat ${Math.abs(diffDays)} Hari`}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'vessel',
            header: ({ column }) => (
                <div className={`${th} w-[120px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.vessel?.toUpperCase() || 'VESSEL'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[120px] truncate`}>{row.original.vessel || '-'}</div>,
        },
        {
            accessorKey: 'origin',
            header: ({ column }) => (
                <div className={`${th} w-[120px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.origin?.toUpperCase() || 'ORIGIN'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[120px] truncate`}>{row.original.origin || '-'}</div>,
        },
        {
            accessorKey: 'port',
            header: ({ column }) => (
                <div className={`${th} w-[220px] min-w-[220px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.port?.toUpperCase() || 'PORT'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[220px] min-w-[220px] truncate`}>{row.original.port || '-'}</div>,
        },
        {
            accessorKey: 'port_of_loading',
            header: ({ column }) => (
                <div className={`${th} w-[220px] min-w-[220px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.port_of_loading?.toUpperCase() || 'PORT OF LOADING'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[220px] min-w-[220px] truncate`}>{row.original.port_of_loading || '-'}</div>,
        },
        {
            accessorKey: 'comodity',
            header: ({ column }) => (
                <div className={`${th} w-[150px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.comodity?.toUpperCase() || 'COMODITY'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[150px] truncate`}>{row.original.comodity || '-'}</div>,
        },
        {
            accessorKey: 'party_summary',
            header: ({ column }) => (
                <div className={`${th} w-[260px]`} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    {trans.party?.toUpperCase() || 'PARTY'}
                </div>
            ),
            cell: ({ row }) => <div className={`${td} w-[260px] leading-snug whitespace-normal`}>{row.original.party_summary || '-'}</div>,
        },
        {
            accessorKey: 'jalur',
            // 2. Gunakan trans
            header: () => <div className={`${th} w-[130px]`}>{trans.channel}</div>,
            cell: ({ row }) => {
                const jalur = row.original.jalur;
                let colorClass = 'text-gray-500';
                let displayText = '-';
                const jalurLower = jalur ? jalur.toLowerCase() : '';

                if (jalurLower === 'hijau') {
                    colorClass = 'text-green-600';
                    displayText = trans.green || 'Hijau';
                } else if (jalurLower === 'merah') {
                    colorClass = 'text-red-600';
                    displayText = trans.red || 'Merah';
                } else if (jalurLower === 'kuning') {
                    colorClass = 'text-yellow-600';
                    displayText = trans.yellow || 'Kuning';
                } else if (jalur) {
                    // Jika ada nilai lain, tampilkan as-is
                    displayText = jalur;
                }

                return <div className={`${td} w-[130px] font-bold ${colorClass}`}>{displayText}</div>;
            },
        },
        {
            accessorKey: 'deadline_date',
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">{trans.deadline}</div>,
            cell: ({ row }) => {
                const deadline = row.original.deadline_date;
                // Ambil data user dari usePage() di dalam cell render (aman)

                if (!deadline) {
                    return <div className="text-sm md:px-2">-</div>;
                }

                const date = new Date(deadline);

                const formatted = date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });

                const sectionName = row.original.deadline_section_name;

                return (
                    <div className="flex w-[190px] flex-col gap-1 px-3 py-3 text-left align-middle">
                        <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="text-sm font-bold">{formatted}</span>
                        </div>

                        {sectionName && (
                            <div className="w-fit rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                {sectionName}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'progress',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {trans.progress}
                </div>
            ),
            cell: ({ row }) => {
                const progress = row.original.progress || 0;

                let statusText = trans.progress_not_started;
                let colorClass = 'bg-slate-200';
                let textClass = 'text-slate-500';

                if (progress === 100) {
                    statusText = trans.progress_completed;
                    colorClass = 'bg-emerald-500';
                    textClass = 'text-emerald-600';
                } else if (progress >= 80) {
                    statusText = trans.progress_almost_done;
                    colorClass = 'bg-indigo-500';
                    textClass = 'text-indigo-600';
                } else if (progress >= 40) {
                    statusText = trans.progress_in_process;
                    colorClass = 'bg-blue-500';
                    textClass = 'text-blue-600';
                } else if (progress > 0) {
                    statusText = trans.progress_started;
                    colorClass = 'bg-sky-400';
                    textClass = 'text-sky-600';
                }

                return (
                    <div className="flex w-[200px] flex-col gap-1.5 px-3 py-3 text-left">
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${textClass}`}>{statusText}</span>
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{progress}%</span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-zinc-800">
                            <div className={`h-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'keterangan_status',
            accessorFn: (row) => {
                return {
                    sort: row.tanggal_status ? new Date(row.tanggal_status).getTime() : 0,
                    label: row.status_label ?? null,
                };
            },
            // 2. Gunakan trans
            header: () => <div className={`${th} w-[380px]`}>{trans.status_description}</div>,
            cell: ({ row }) => {
                const tanggal = row.original.tanggal_status;
                const label = row.original.status_label;
                const nama_user = row.original.nama_user;

                if (!tanggal) return <div className="text-sm">-</div>;

                const dateObj = new Date(tanggal);

                // Gunakan locale dari usePage jika ingin format tanggal ikut berubah (opsional)
                // Tapi format 'id-ID' biasanya standar di Indonesia meski UI Inggris
                const tanggalFormat = dateObj
                    .toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })
                    .replace(/\./g, '/');

                const jamMenit = dateObj
                    .toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    })
                    .replace('.', ':');

                return (
                    <div className={`${td} w-[380px] leading-snug whitespace-normal`}>
                        <span>
                            {label} {trans.last_updated || 'updated'} {` ${trans.at || 'at'} `}
                            <strong>{`${tanggalFormat} ${jamMenit} WIB`}</strong>
                            {nama_user ? ` ${trans.by || 'by'} ` : ''}
                            {nama_user && <strong>{nama_user}</strong>}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right text-sm font-medium md:px-2 md:py-2"></div>,
            cell: ({ row }) => {
                const shipping = row.original;
                const { auth } = usePage().props as any;
                const isAdmin = auth.user?.roles?.[0]?.name === 'admin';

                if (!isAdmin) return null;

                const isDesktop = useMediaQuery('(min-width: 768px)');

                if (isDesktop) {
                    return (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    {isAdmin && (
                                        <DropdownMenuItem
                                            className="cursor-pointer text-red-600"
                                            asChild
                                            onClick={(e) => {
                                                const confirmed = window.confirm(trans.delete_confirm_alert);
                                                if (!confirmed) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        >
                                            <Link
                                                href={`/shipping/${shipping.id}`}
                                                method="delete"
                                                as="button"
                                                onSuccess={() => window.alert(trans.delete_success_alert)}
                                            >
                                                {trans.delete_customer}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col gap-2 pt-2">
                        {isAdmin && (
                            <Button
                                className="cursor-pointer bg-red-500 text-white"
                                asChild
                                onClick={(e) => {
                                    const confirmed = window.confirm(trans.delete_confirm_alert);
                                    if (!confirmed) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <Link
                                    href={`/shipping/${shipping.id}`}
                                    method="delete"
                                    as="button"
                                    onSuccess={() => window.alert(trans.delete_success_alert)}
                                >
                                    {trans.delete_customer}
                                </Link>
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
};
