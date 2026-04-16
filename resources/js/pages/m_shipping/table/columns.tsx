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
    progress: number;
    nama_cust?: string;
    eta_date?: string | null;
};

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
            header: () => <div className="w-[50px] md:px-2 md:py-2"></div>,
            cell: ({ row }) => {
                const shipping = row.original;

                return (
                    <div className="flex items-center justify-center gap-2 md:px-2">
                        <Link
                            href={`/shipping/documents/${shipping.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white"
                            title="View Documents"
                        >
                            <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                            href={`/shipping/${shipping.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500/50 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                            title="View Customer"
                        >
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </div>
                );
            },
        },
        {
            accessorKey: 'nama_customer',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.customer_name}
                </div>
            ),
            cell: ({ row }) => <div className="text-sm md:min-w-[150px] md:truncate md:px-2">{row.original.nama_customer || '-'}</div>,
        },
        {
            accessorKey: 'spk_code',
            header: ({ column }) => (
                <div
                    className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {/* 2. Gunakan trans */}
                    {trans.spk_number}
                </div>
            ),
            cell: ({ row }) => <div className="text-sm font-bold md:min-w-[150px] md:truncate md:px-2 md:py-2">{row.original.spk_code ?? '-'}</div>,
        },
        {
            accessorKey: 'deadline_date',
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">{trans.deadline}</div>,
            cell: ({ row }) => {
                const deadline = row.original.deadline_date;
                // Ambil data user dari usePage() di dalam cell render (aman)
                const { props } = usePage();
                const auth = props.auth as any;
                const isUserExternal = auth.user?.role === 'eksternal';
                const currentLocale = props.locale as string;

                if (!deadline) {
                    return <div className="text-sm md:px-2">-</div>;
                }

                const date = new Date(deadline);

                const formatted = date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });

                return (
                    <div className="flex flex-col justify-center md:min-w-[200px] md:px-2">
                        {/* Tampilkan Warning Merah (Khusus External) */}
                        {
                            <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span className="text-sm leading-none font-bold">{formatted}</span>
                            </div>
                        }
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
                    <div className="flex flex-col gap-1.5 md:min-w-[150px] md:px-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${textClass}`}>{statusText}</span>
                            <span className="text-[11px] font-extrabold text-slate-700">{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                            <div className={`h-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'eta_date',
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
                    day: 'numeric', // tanpa leading zero
                    month: 'short', // Mar, Apr, dll
                    year: 'numeric',
                });

                return <div className="text-sm md:min-w-[150px] md:px-2">{formatted}</div>;
            },
        },
        {
            accessorKey: 'jalur',
            // 2. Gunakan trans
            header: () => <div className="text-sm font-medium md:px-2 md:py-2">{trans.channel}</div>,
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

                return <div className={`text-sm font-bold ${colorClass} md:min-w-[100px] md:px-2`}>{displayText}</div>;
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
            header: ({ column }) => <div className="cursor-pointer text-sm font-medium select-none md:px-2 md:py-2">{trans.status_description}</div>,
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
                    <div className="text-sm md:min-w-[200px] md:truncate md:px-2">
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
