import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { ManageUsersContent } from '@/pages/auth/page';
import { ManageCustomersContent } from '@/pages/m_customer/page';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    BookUser,
    Building2,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Columns2,
    FileText,
    PackageCheck,
    Plus,
    ReceiptText,
    Save,
    Search,
    Send,
    Ship,
    UserCheck,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type ModuleKey = 'customers' | 'users' | 'client' | 'offer' | 'shipping' | 'invoice';

type WorkspaceTab = {
    id: string;
    module: ModuleKey;
    title: string;
    subtitle: string;
};

type ModuleDefinition = {
    title: string;
    label: string;
    description: string;
    icon: LucideIcon;
    accent: string;
    iconTone: string;
};

type WorkspacePageProps = {
    auth?: {
        user?: {
            name?: string;
        };
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workspace',
        href: '/workspace',
    },
];

const moduleCatalog: Record<ModuleKey, ModuleDefinition> = {
    customers: {
        title: 'Manage Customer',
        label: 'Live',
        description: 'Real customer table',
        icon: BookUser,
        accent: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300',
        iconTone: 'bg-cyan-600 text-white',
    },
    users: {
        title: 'Manage Users',
        label: 'Live',
        description: 'Real user table',
        icon: Users,
        accent: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
        iconTone: 'bg-violet-600 text-white',
    },
    client: {
        title: 'Client Desk',
        label: 'Client',
        description: 'PT Nusantara Fresh',
        icon: Building2,
        accent: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
        iconTone: 'bg-sky-600 text-white',
    },
    offer: {
        title: 'Offer Builder',
        label: 'Offer',
        description: 'OF-2026-0418',
        icon: FileText,
        accent: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
        iconTone: 'bg-emerald-600 text-white',
    },
    shipping: {
        title: 'Shipping Generator',
        label: 'Shipping',
        description: 'SPK-2405-018',
        icon: Ship,
        accent: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
        iconTone: 'bg-amber-500 text-white',
    },
    invoice: {
        title: 'Invoice Room',
        label: 'Invoice',
        description: 'INV draft',
        icon: ReceiptText,
        accent: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
        iconTone: 'bg-rose-600 text-white',
    },
};

const moduleOrder: ModuleKey[] = ['customers', 'users', 'client', 'offer', 'shipping', 'invoice'];

const initialTabs: WorkspaceTab[] = [
    {
        id: 'manage-customers',
        module: 'customers',
        title: 'Manage Customer',
        subtitle: 'Real Customer Page',
    },
    {
        id: 'manage-users',
        module: 'users',
        title: 'Manage Users',
        subtitle: 'Real Users Page',
    },
    {
        id: 'client-nusantara',
        module: 'client',
        title: 'PT Nusantara Fresh',
        subtitle: 'Client Desk',
    },
    {
        id: 'offer-0418',
        module: 'offer',
        title: 'OF-2026-0418',
        subtitle: 'Offer Builder',
    },
    {
        id: 'shipping-2405-018',
        module: 'shipping',
        title: 'SPK-2405-018',
        subtitle: 'Shipping Generator',
    },
];

const openTemplates: Record<ModuleKey, WorkspaceTab> = {
    customers: initialTabs[0],
    users: initialTabs[1],
    client: initialTabs[2],
    offer: {
        id: 'offer-0418',
        module: 'offer',
        title: 'OF-2026-0418',
        subtitle: 'Offer Builder',
    },
    shipping: {
        id: 'shipping-2405-018',
        module: 'shipping',
        title: 'SPK-2405-018',
        subtitle: 'Shipping Generator',
    },
    invoice: {
        id: 'invoice-draft',
        module: 'invoice',
        title: 'INV-PPJK-DRAFT',
        subtitle: 'Invoice Room',
    },
};

const workflowSteps = [
    { label: 'Client checked', status: 'done' },
    { label: 'Offer drafted', status: 'active' },
    { label: 'Shipping prepared', status: 'active' },
    { label: 'Invoice waiting', status: 'next' },
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

export default function WorkspacePage() {
    const { auth } = usePage<WorkspacePageProps>().props;
    const user = auth?.user;
    const [tabs, setTabs] = useState<WorkspaceTab[]>(initialTabs);
    const [activeTabId, setActiveTabId] = useState(initialTabs[0].id);
    const [secondaryTabId, setSecondaryTabId] = useState(initialTabs[1].id);
    const [splitView, setSplitView] = useState(true);
    const [offerMargin, setOfferMargin] = useState(14);
    const [shippingStep, setShippingStep] = useState(2);

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
    const secondaryCandidates = tabs.filter((tab) => tab.id !== activeTab.id);
    const secondaryTab = tabs.find((tab) => tab.id === secondaryTabId && tab.id !== activeTab.id) ?? secondaryCandidates[0] ?? activeTab;

    const offerTotal = useMemo(() => {
        const baseCost = 18900000;
        const operationalFee = 2450000;
        return baseCost + operationalFee + Math.round(baseCost * (offerMargin / 100));
    }, [offerMargin]);

    const openModule = (module: ModuleKey) => {
        const existingTab = tabs.find((tab) => tab.module === module);

        if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
        }

        const template = openTemplates[module];
        const nextTab = {
            ...template,
            id: `${template.id}-${Date.now()}`,
        };

        setTabs((current) => [...current, nextTab]);
        setActiveTabId(nextTab.id);
    };

    const closeTab = (tabId: string) => {
        if (tabs.length === 1) return;

        const nextTabs = tabs.filter((tab) => tab.id !== tabId);
        setTabs(nextTabs);

        if (activeTabId === tabId) {
            setActiveTabId(nextTabs[0].id);
        }

        if (secondaryTabId === tabId) {
            setSecondaryTabId(nextTabs.find((tab) => tab.id !== activeTabId)?.id ?? nextTabs[0].id);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Workspace" />

            <div className="bg-background flex min-h-[calc(100vh-4rem)] flex-col">
                <div className="bg-background border-b px-4 py-4 md:px-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-foreground text-xl font-semibold">PPJK Workspace</h1>
                                <Badge
                                    variant="outline"
                                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                >
                                    Manager
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                                {user?.name ? `${user.name}'s active workbench` : 'Active workbench'} for client offer, shipping, and billing work.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            {moduleOrder.map((module) => {
                                const definition = moduleCatalog[module];
                                const Icon = definition.icon;

                                return (
                                    <Button
                                        key={module}
                                        type="button"
                                        variant="outline"
                                        className="justify-start gap-2"
                                        onClick={() => openModule(module)}
                                    >
                                        <Icon className="size-4" />
                                        {definition.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid flex-1 gap-4 p-4 md:p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <section className="bg-background rounded-lg border p-3">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold">Modules</h2>
                                <Search className="text-muted-foreground size-4" />
                            </div>
                            <div className="space-y-2">
                                {moduleOrder.map((module) => {
                                    const definition = moduleCatalog[module];
                                    const Icon = definition.icon;
                                    const isOpen = tabs.some((tab) => tab.module === module);

                                    return (
                                        <button
                                            key={module}
                                            type="button"
                                            className="bg-background hover:bg-accent flex w-full items-center gap-3 rounded-md border p-3 text-left transition"
                                            onClick={() => openModule(module)}
                                        >
                                            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', definition.iconTone)}>
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{definition.title}</span>
                                                <span className="text-muted-foreground block truncate text-xs">{definition.description}</span>
                                            </span>
                                            {isOpen ? (
                                                <CheckCircle2 className="size-4 text-emerald-600" />
                                            ) : (
                                                <Plus className="text-muted-foreground size-4" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="bg-background rounded-lg border p-3">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold">Work Flow</h2>
                                <ArrowRightLeft className="text-muted-foreground size-4" />
                            </div>
                            <div className="space-y-3">
                                {workflowSteps.map((step, index) => (
                                    <div key={step.label} className="flex gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                                                step.status === 'done' &&
                                                    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30',
                                                step.status === 'active' &&
                                                    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30',
                                                step.status === 'next' && 'border-border bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{step.label}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {step.status === 'done' ? 'Completed' : step.status === 'active' ? 'In progress' : 'Queued'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>

                    <main className="bg-background min-w-0 overflow-hidden rounded-lg border">
                        <div className="flex min-h-0 flex-col">
                            <div className="bg-muted/40 flex items-center justify-between gap-3 border-b px-3 py-2">
                                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
                                    {tabs.map((tab) => {
                                        const definition = moduleCatalog[tab.module];
                                        const Icon = definition.icon;
                                        const isActive = tab.id === activeTab.id;

                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                className={cn(
                                                    'flex h-10 min-w-48 items-center gap-2 rounded-md border px-3 text-left transition',
                                                    isActive
                                                        ? 'border-primary bg-background shadow-sm'
                                                        : 'hover:bg-background border-transparent bg-transparent',
                                                )}
                                                onClick={() => setActiveTabId(tab.id)}
                                            >
                                                <Icon className="text-muted-foreground size-4 shrink-0" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm leading-4 font-medium">{tab.title}</span>
                                                    <span className="text-muted-foreground block truncate text-xs">{tab.subtitle}</span>
                                                </span>
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        closeTab(tab.id);
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                            event.preventDefault();
                                                            closeTab(tab.id);
                                                        }
                                                    }}
                                                >
                                                    <X className="size-3.5" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <Button
                                    type="button"
                                    variant={splitView ? 'default' : 'outline'}
                                    size="sm"
                                    className="shrink-0 gap-2"
                                    disabled={tabs.length < 2}
                                    onClick={() => setSplitView((value) => !value)}
                                >
                                    <Columns2 className="size-4" />
                                    Split
                                </Button>
                            </div>

                            <div
                                className={cn(
                                    'grid min-h-[690px] gap-0',
                                    splitView && tabs.length > 1 ? 'xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]' : 'grid-cols-1',
                                )}
                            >
                                <WorkspacePane
                                    tab={activeTab}
                                    offerMargin={offerMargin}
                                    offerTotal={offerTotal}
                                    setOfferMargin={setOfferMargin}
                                    shippingStep={shippingStep}
                                    setShippingStep={setShippingStep}
                                />

                                {splitView && tabs.length > 1 && (
                                    <div className="bg-muted/20 min-w-0 border-t xl:border-t-0 xl:border-l">
                                        <div className="bg-background flex items-center justify-between gap-3 border-b px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold">{secondaryTab.title}</p>
                                                <p className="text-muted-foreground truncate text-xs">{secondaryTab.subtitle}</p>
                                            </div>
                                            <select
                                                className="bg-background h-9 rounded-md border px-3 text-sm"
                                                value={secondaryTab.id}
                                                onChange={(event) => setSecondaryTabId(event.target.value)}
                                            >
                                                {secondaryCandidates.map((tab) => (
                                                    <option key={tab.id} value={tab.id}>
                                                        {tab.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <WorkspacePane
                                            compact
                                            tab={secondaryTab}
                                            offerMargin={offerMargin}
                                            offerTotal={offerTotal}
                                            setOfferMargin={setOfferMargin}
                                            shippingStep={shippingStep}
                                            setShippingStep={setShippingStep}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AppLayout>
    );
}

function WorkspacePane({
    tab,
    compact = false,
    offerMargin,
    offerTotal,
    setOfferMargin,
    shippingStep,
    setShippingStep,
}: {
    tab: WorkspaceTab;
    compact?: boolean;
    offerMargin: number;
    offerTotal: number;
    setOfferMargin: (value: number) => void;
    shippingStep: number;
    setShippingStep: (value: number) => void;
}) {
    const definition = moduleCatalog[tab.module];
    const Icon = definition.icon;
    const isLiveModule = tab.module === 'customers' || tab.module === 'users';

    return (
        <section className="bg-background min-w-0">
            <div className="border-b px-4 py-4 md:px-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', definition.iconTone)}>
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-lg font-semibold">{definition.title}</h2>
                                <Badge variant="outline" className={definition.accent}>
                                    {definition.label}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground truncate text-sm">{tab.title}</p>
                        </div>
                    </div>
                    {!isLiveModule && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-2">
                                <Save className="size-4" />
                                Save
                            </Button>
                            <Button type="button" size="sm" className="gap-2">
                                <Send className="size-4" />
                                Submit
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className={cn('space-y-4 p-4 md:p-5', compact && 'text-sm', isLiveModule && 'overflow-x-auto')}>
                {tab.module === 'customers' && <ManageCustomersContent embedded />}
                {tab.module === 'users' && <ManageUsersContent embedded />}
                {tab.module === 'client' && <ClientPane compact={compact} />}
                {tab.module === 'offer' && (
                    <OfferPane compact={compact} offerMargin={offerMargin} offerTotal={offerTotal} setOfferMargin={setOfferMargin} />
                )}
                {tab.module === 'shipping' && <ShippingPane compact={compact} shippingStep={shippingStep} setShippingStep={setShippingStep} />}
                {tab.module === 'invoice' && <InvoicePane compact={compact} offerTotal={offerTotal} />}
            </div>
        </section>
    );
}

function ClientPane({ compact }: { compact: boolean }) {
    const compliance = [
        ['NPWP', 'Verified'],
        ['NIB', 'Verified'],
        ['TOP', '30 days'],
        ['PIC', 'Rania Wijaya'],
    ];

    return (
        <>
            <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock icon={UserCheck} label="Primary Contact" value="Rania Wijaya" meta="rania@nusantarafresh.co.id" />
                <InfoBlock icon={Building2} label="Company Type" value="Importir fresh goods" meta="Jakarta Utara" />
            </div>

            <div className="rounded-lg border">
                <div className="bg-muted/40 text-muted-foreground grid grid-cols-2 border-b px-4 py-3 text-xs font-medium uppercase">
                    <span>Record</span>
                    <span>Status</span>
                </div>
                {compliance.map(([label, status]) => (
                    <div key={label} className="grid grid-cols-2 border-b px-4 py-3 last:border-b-0">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-muted-foreground text-sm">{status}</span>
                    </div>
                ))}
            </div>

            {!compact && (
                <div className="grid gap-3 md:grid-cols-3">
                    <Metric label="Active Offers" value="3" tone="text-emerald-700" />
                    <Metric label="Running SPK" value="5" tone="text-amber-700" />
                    <Metric label="Open Invoice" value="1" tone="text-rose-700" />
                </div>
            )}
        </>
    );
}

function OfferPane({
    compact,
    offerMargin,
    offerTotal,
    setOfferMargin,
}: {
    compact: boolean;
    offerMargin: number;
    offerTotal: number;
    setOfferMargin: (value: number) => void;
}) {
    const items = [
        ['Customs clearance', 7800000],
        ['Trucking Jakarta port', 5400000],
        ['Document handling', 2900000],
        ['Operational buffer', 2800000],
    ];

    return (
        <>
            <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock icon={FileText} label="Offer No." value="OF-2026-0418" meta="Draft approval" />
                <InfoBlock icon={PackageCheck} label="Service" value="Import clearance" meta="FCL 2 x 40 ft" />
                <InfoBlock icon={Clock3} label="Target Send" value="Tomorrow" meta="Manager approval needed" />
            </div>

            <div className="rounded-lg border">
                <div className="bg-muted/40 text-muted-foreground grid grid-cols-[minmax(0,1fr)_140px] border-b px-4 py-3 text-xs font-medium uppercase">
                    <span>Cost Component</span>
                    <span className="text-right">Amount</span>
                </div>
                {items.map(([label, amount]) => (
                    <div key={label.toString()} className="grid grid-cols-[minmax(0,1fr)_140px] border-b px-4 py-3 last:border-b-0">
                        <span className="truncate text-sm font-medium">{label}</span>
                        <span className="text-muted-foreground text-right text-sm">{formatCurrency(Number(amount))}</span>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">Margin</p>
                            <p className="text-muted-foreground text-xs">Offer calculation</p>
                        </div>
                        <Badge variant="outline">{offerMargin}%</Badge>
                    </div>
                    <Input type="number" min={0} max={40} value={offerMargin} onChange={(event) => setOfferMargin(Number(event.target.value))} />
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold">Offer Total</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(offerTotal)}</p>
                    {!compact && <p className="text-muted-foreground mt-2 text-xs">Linked to shipping budget and invoice draft.</p>}
                </div>
            </div>
        </>
    );
}

function ShippingPane({
    compact,
    shippingStep,
    setShippingStep,
}: {
    compact: boolean;
    shippingStep: number;
    setShippingStep: (value: number) => void;
}) {
    const steps = ['SPK Created', 'Documents Attached', 'ETA Confirmed', 'Ready to Invoice'];
    const readiness = Math.round(((shippingStep + 1) / steps.length) * 100);

    return (
        <>
            <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock icon={Ship} label="SPK" value="SPK-2405-018" meta="Tanjung Priok" />
                <InfoBlock icon={ClipboardList} label="BL / AWB" value="ONEYSGN112903" meta="2 x 40 ft" />
                <InfoBlock icon={Clock3} label="ETA" value="28 May 2026" meta="Yellow lane" />
            </div>

            <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold">Shipping Readiness</p>
                        <p className="text-muted-foreground text-xs">SPK to invoice handoff</p>
                    </div>
                    <Badge variant="outline">{readiness}%</Badge>
                </div>
                <Progress value={readiness} className="h-2" />
            </div>

            <div className="grid gap-2">
                {steps.map((step, index) => {
                    const isDone = index <= shippingStep;
                    const isCurrent = index === shippingStep;

                    return (
                        <button
                            key={step}
                            type="button"
                            className={cn(
                                'hover:bg-accent flex items-center gap-3 rounded-md border p-3 text-left transition',
                                isCurrent && 'border-primary bg-muted/40',
                            )}
                            onClick={() => setShippingStep(index)}
                        >
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-md',
                                    isDone ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {isDone ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{step}</span>
                                <span className="text-muted-foreground block truncate text-xs">{isDone ? 'Active record' : 'Waiting'}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            {!compact && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">Document check</p>
                            <p className="mt-1 text-sm">Original BL and packing list are pending final upload from operation staff.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function InvoicePane({ compact, offerTotal }: { compact: boolean; offerTotal: number }) {
    const invoiceRows = [
        ['Offer value', offerTotal],
        ['Tax estimate', Math.round(offerTotal * 0.11)],
        ['Stamp and admin', 250000],
    ];
    const invoiceTotal = invoiceRows.reduce((total, row) => total + Number(row[1]), 0);

    return (
        <>
            <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock icon={ReceiptText} label="Invoice" value="INV-PPJK-DRAFT" meta="Waiting SPK done" />
                <InfoBlock icon={FileText} label="Source Offer" value="OF-2026-0418" meta="Synced total" />
                <InfoBlock icon={Clock3} label="Due Term" value="30 days" meta="Client default" />
            </div>

            <div className="rounded-lg border">
                {invoiceRows.map(([label, amount]) => (
                    <div key={label.toString()} className="grid grid-cols-[minmax(0,1fr)_150px] border-b px-4 py-3 last:border-b-0">
                        <span className="truncate text-sm font-medium">{label}</span>
                        <span className="text-muted-foreground text-right text-sm">{formatCurrency(Number(amount))}</span>
                    </div>
                ))}
                <div className="bg-muted/40 grid grid-cols-[minmax(0,1fr)_150px] px-4 py-3">
                    <span className="text-sm font-semibold">Invoice Total</span>
                    <span className="text-right text-sm font-semibold">{formatCurrency(invoiceTotal)}</span>
                </div>
            </div>

            {!compact && (
                <div className="rounded-lg border p-4">
                    <p className="text-sm font-semibold">Approval Gate</p>
                    <p className="text-muted-foreground mt-1 text-sm">Invoice can be issued after shipping reaches Ready to Invoice.</p>
                </div>
            )}
        </>
    );
}

function InfoBlock({ icon: Icon, label, value, meta }: { icon: LucideIcon; label: string; value: string; meta: string }) {
    return (
        <div className="rounded-lg border p-4">
            <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium uppercase">
                <Icon className="size-4" />
                {label}
            </div>
            <p className="truncate text-base font-semibold">{value}</p>
            <p className="text-muted-foreground mt-1 truncate text-sm">{meta}</p>
        </div>
    );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">{label}</p>
            <p className={cn('mt-2 text-2xl font-semibold', tone)}>{value}</p>
        </div>
    );
}
