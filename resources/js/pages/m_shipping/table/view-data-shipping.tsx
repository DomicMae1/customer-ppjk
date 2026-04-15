/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import DataShippingFormView from './data-shipping-view';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Master Shipping',
        href: '/shipping',
    },
    {
        title: 'View Data Shipping',
        href: '#',
    },
];

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
    nama_file: string | null;
    url_path_file?: string | null;
    verify?: boolean | null;
    is_updated?: boolean;
    updated_at: string | null;
    updated_at_full?: string | null;
};

interface PageProps {
    spk?: SpkItem;
    documents?: DocumentItem[];
    flash?: FlashMessage;
    auth: {
        user?: {
            role?: string;
            [key: string]: any;
        };
    };
}

export default function DataShippingViewPage() {
    const { props } = usePage<PageProps>();
    const { spk, documents = [], flash, auth } = props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Data Shipping" />
            <div className="p-4">
                <DataShippingFormView spk={spk} documents={documents} flash={flash} userRole={auth?.user?.role} />
            </div>
        </AppLayout>
    );
}
