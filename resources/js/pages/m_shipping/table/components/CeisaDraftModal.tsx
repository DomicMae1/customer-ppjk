/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import {
    AlertTriangle,
    Boxes,
    CheckCircle2,
    FileText,
    Package,
    Plus,
    RefreshCw,
    Save,
    Search,
    Ship,
    SlidersHorizontal,
    Trash2,
    UserRound,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DraftTab = 'header' | 'entities' | 'documents' | 'transport' | 'packaging' | 'transaction' | 'goods' | 'statement' | 'advanced';
type PortLookupTarget = 'kodePelMuat' | 'kodePelTujuan' | 'kodePelEkspor' | 'kodePelBongkar';

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
    referenceEndpoint?: string;
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
    { key: 'packaging', label: 'Kemasan & Peti Kemas', icon: Package },
    { key: 'transaction', label: 'Transaksi', icon: SlidersHorizontal },
    { key: 'goods', label: 'Barang', icon: Boxes },
    { key: 'statement', label: 'Pernyataan', icon: CheckCircle2 },
    { key: 'advanced', label: 'JSON', icon: Package },
];

const documentOptions = [
    { value: '343', label: '343 - Shiping Order / SI' },
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
const valutaOptions = ['USD', 'IDR', 'EUR', 'SGD', 'CNY', 'JPY', 'AUD', 'MYR', 'THB', 'INR', 'KRW', 'HKD', 'TWD', 'GBP'];
const satuanOptions = ['PCE', 'KGM', 'TNE', 'LTR', 'MTQ', 'SET', 'BG', 'CTN', 'DR', 'ROL'];
const kemasanOptions = [
    { value: 'BG', label: 'BG - Bag' },
    { value: 'PK', label: 'PK - Package' },
    { value: 'CT', label: 'CT - Carton' },
    { value: 'BX', label: 'BX - Box' },
    { value: 'DR', label: 'DR - Drum' },
    { value: 'PL', label: 'PL - Pallet' },
    { value: 'BL', label: 'BL - Bale' },
    { value: 'RO', label: 'RO - Roll' },
    { value: 'SA', label: 'SA - Sack' },
    { value: 'CS', label: 'CS - Case' },
    { value: '1A', label: '1A - Drum, Steel' },
    { value: '1B', label: '1B - Drum, Aluminium' },
    { value: '1D', label: '1D - Drum, Plywood' },
    { value: '1F', label: '1F - Container, Flexible' },
    { value: '1G', label: '1G - Drum, Fibre' },
    { value: '1W', label: '1W - Drum, Wooden' },
    { value: '2C', label: '2C - Barrel, Wooden' },
    { value: '3A', label: '3A - Jerrican, Steel' },
];
const kontainerUkuranOptions = [
    { value: '20', label: '20 - 20 FEET' },
    { value: '40', label: '40 - 40 FEET' },
    { value: '45', label: '45 - 45 FEET' },
    { value: '60', label: '60 - 60 FEET' },
];
const kontainerTipeOptions = [
    { value: '1', label: '1 - GENERAL / DRY CARGO' },
    { value: '2', label: '2 - TUNNE TYPE' },
    { value: '3', label: '3 - OPEN TOP STEEL' },
    { value: '4', label: '4 - FLAT RACK' },
    { value: '5', label: '5 - REEFER/REFREGETE' },
    { value: '6', label: '6 - BARGE CONTAINER' },
    { value: '7', label: '7 - BULK CONTAINER' },
    { value: '8', label: '8 - ISOTANK' },
    { value: '99', label: '99 - LAIN-LAIN' },
];
const jenisImporOptions = [
    { value: '1', label: '1 - UNTUK DIPAKAI' },
    { value: '2', label: '2 - SEMENTARA' },
    { value: '5', label: '5 - PELAYANAN SEGERA' },
    { value: '9', label: '9 - GABUNGAN' },
];
const jenisEksporOptions = [
    { value: '1', label: '1 - Ekspor Biasa' },
    { value: '2', label: '2 - Ekspor Akan Diimpor Kembali' },
    { value: '3', label: '3 - Reekspor Lainnya' },
    { value: '4', label: '4 - Reekspor ex Impor Sementara' },
];
const kategoriEksporOptions = [
    { value: '10', label: '10 - Umum' },
    { value: '21', label: '21 - NIPER Pembebasan' },
    { value: '22', label: '22 - NIPER Pengembalian' },
    { value: '23', label: '23 - KITE Pembebasan dan Pengembalian' },
    { value: '31', label: '31 - Perwakilan Negara Asing' },
    { value: '32', label: '32 - Badan Internasional' },
    { value: '33', label: '33 - Barang Kiriman' },
    { value: '34', label: '34 - Barang Pindahan' },
    { value: '35', label: '35 - Keperluan Ibadah/Sosial/Pendidikan/Bencana' },
];
const caraDagangOptions = [
    { value: '1', label: '1 - Biasa' },
    { value: '2', label: '2 - IMB / Imbal Dagang' },
    { value: '15', label: '15 - Lainnya' },
];
const komoditasOptions = [
    { value: '1', label: '1 - MIGAS' },
    { value: '2', label: '2 - NON MIGAS' },
];
const barangKirimanOptions = [
    { value: 'Y', label: 'Y - EKSPOR BARANG KIRIMAN' },
    { value: 'T', label: 'T - BUKAN EKSPOR BARANG KIRIMAN' },
];
const curahOptions = [
    { value: '1', label: '1 - Barang Curah' },
    { value: '2', label: '2 - Bukan Barang Curah' },
];
const jenisPengangkutanOptions = [
    { value: '1', label: '1 - Laut' },
    { value: '2', label: '2 - Kereta Api' },
    { value: '3', label: '3 - Darat' },
    { value: '4', label: '4 - Udara' },
];
const lokasiPemeriksaanOptions = [
    { value: '1', label: '1 - KP Tempat Pemuatan' },
    { value: '2', label: '2 - Gudang Eksportir' },
    { value: '3', label: '3 - Tempat Lain yang Diizinkan' },
    { value: '4', label: '4 - TPS' },
    { value: '5', label: '5 - TPP' },
    { value: '6', label: '6 - TPB' },
    { value: '7', label: '7 - Tempat Penimbunan Lainnya' },
    { value: '8', label: '8 - Gudang Konsolidator' },
];
const jenisGudangOptions = [
    { value: '1', label: '1 - Gudang Veem' },
    { value: '2', label: '2 - Gudang Pabrik' },
    { value: '3', label: '3 - Gudang Konsolidasi' },
    { value: '4', label: '4 - Lainnya' },
];
const caraStuffingOptions = [
    { value: '4', label: '4 - Empty' },
    { value: '7', label: '7 - LCL' },
    { value: '8', label: '8 - FCL' },
];
const caraBayarOptions = [
    { value: '1', label: '1 - BIASA/TUNAI' },
    { value: '2', label: '2 - BERKALA' },
    { value: '3', label: '3 - DENGAN JAMINAN' },
    { value: '4', label: '4 - PERHITUNGAN KEMUDIAN' },
    { value: '5', label: '5 - KONSINYASI (CONSIGNMENT)' },
    { value: '6', label: '6 - USANCE LETTER OF CREDIT' },
    { value: '7', label: '7 - RED CLAUSE LETTER OF CREDIT' },
    { value: '8', label: '8 - INTER-COMPANY ACCOUNT' },
    { value: '9', label: '9 - GABUNGAN/LAINNYA' },
    { value: '10', label: '10 - OPEN ACCOUNT BERTAHAP' },
    { value: '11', label: '11 - OPEN ACCOUNT TUNAI' },
    { value: '12', label: '12 - BAYAR TUNAI DI DN' },
    { value: '13', label: '13 - BAYAR TELEGRAPH DI DN' },
    { value: '14', label: '14 - TANPA PEMBAYARAN' },
    { value: '15', label: '15 - ADVANCE PAYMENT' },
    { value: '16', label: '16 - SIGHT LETTER OF CREDIT' },
    { value: '17', label: '17 - INKASO (COLLECTION DRAFT)' },
];
const exportCaraBayarOptions = caraBayarOptions.filter((item) => ['1', '2', '3', '9'].includes(item.value));
const jenisEksporValues = new Set(jenisEksporOptions.map((item) => item.value));
const kategoriEksporValues = new Set(kategoriEksporOptions.map((item) => item.value));
const caraDagangValues = new Set(caraDagangOptions.map((item) => item.value));
const komoditasValues = new Set(komoditasOptions.map((item) => item.value));
const barangKirimanValues = new Set(barangKirimanOptions.map((item) => item.value));
const curahValues = new Set(curahOptions.map((item) => item.value));
const jenisPengangkutanValues = new Set(jenisPengangkutanOptions.map((item) => item.value));
const lokasiPemeriksaanValues = new Set(lokasiPemeriksaanOptions.map((item) => item.value));
const jenisGudangValues = new Set(jenisGudangOptions.map((item) => item.value));
const caraStuffingValues = new Set(caraStuffingOptions.map((item) => item.value));
const jenisTransaksiOptions = [
    { value: 'PMK', label: 'PMK - PEMBAYARAN DILAKUKAN DIMUKA' },
    { value: 'KMD', label: 'KMD - PEMBAYARAN KEMUDIAN' },
    { value: 'SLC', label: 'SLC - PEMBAYARAN DENGAN SIGHT LETTER OF CREDIT' },
    { value: 'ULC', label: 'ULC - PEMBAYARAN DENGAN USANCE LETTER OF CREDIT' },
    { value: 'RLC', label: 'RLC - PEMBAYARAN DENGAN RED CLAUSE LETTER OF CREDIT' },
    { value: 'WSI', label: 'WSI - PEMBAYARAN DENGAN WESEL INKASO' },
    { value: 'KON', label: 'KON - PEMBAYARAN DENGAN KONSINYASI' },
    { value: 'IOA', label: 'IOA - PEMBAYARAN DENGAN INTEROFFICE ACCOUNT' },
    { value: 'IMB', label: 'IMB - TRANSAKSI PERDAGANGAN DENGAN IMBAL DAGANG' },
    { value: 'LAI', label: 'LAI - TRANSAKSI PERDAGANGAN ATAU CARA PEMBAYARAN LAINNYA' },
];
const caraBayarValues = new Set(caraBayarOptions.map((item) => item.value));
const jenisTransaksiValues = new Set(jenisTransaksiOptions.map((item) => item.value));
const tutupPuOptions = [
    { value: '11', label: '11 - BC 1.1' },
    { value: '12', label: '12 - BC 1.2' },
    { value: '14', label: '14 - BC 1.4' },
];
const tutupPuValues = new Set(tutupPuOptions.map((item) => item.value));
const commonCountryOptions = [
    { value: '', label: 'Pilih' },
    { value: 'ID', label: 'ID - Indonesia' },
    { value: 'SG', label: 'SG - Singapore' },
    { value: 'CN', label: 'CN - China' },
    { value: 'IN', label: 'IN - India' },
    { value: 'MY', label: 'MY - Malaysia' },
    { value: 'TH', label: 'TH - Thailand' },
    { value: 'VN', label: 'VN - Vietnam' },
    { value: 'TW', label: 'TW - Taiwan' },
    { value: 'HK', label: 'HK - Hong Kong' },
    { value: 'KR', label: 'KR - Korea' },
    { value: 'JP', label: 'JP - Japan' },
    { value: 'US', label: 'US - United States' },
    { value: 'AU', label: 'AU - Australia' },
    { value: 'AE', label: 'AE - United Arab Emirates' },
    { value: 'NL', label: 'NL - Netherlands' },
    { value: 'DE', label: 'DE - Germany' },
    { value: 'GB', label: 'GB - United Kingdom' },
];
const extraCountryCodes = [
    'AD',
    'AE',
    'AF',
    'AG',
    'AI',
    'AL',
    'AM',
    'AN',
    'AO',
    'AQ',
    'AR',
    'AS',
    'AT',
    'AW',
    'AX',
    'AZ',
    'BA',
    'BB',
    'BD',
    'BE',
    'BF',
    'BG',
    'BH',
    'BI',
    'BJ',
    'BM',
    'BN',
    'BO',
    'BQ',
    'BR',
    'BS',
    'BT',
    'BV',
    'BW',
    'BY',
    'BZ',
    'CA',
    'CC',
    'CD',
    'CF',
    'CG',
    'CH',
    'CI',
    'CK',
    'CL',
    'CM',
    'CO',
    'CR',
    'CU',
    'CV',
    'CW',
    'CX',
    'CY',
    'CZ',
    'DJ',
    'DK',
    'DM',
    'DO',
    'DZ',
    'EC',
    'EE',
    'EG',
    'EH',
    'ER',
    'ES',
    'ET',
    'FI',
    'FJ',
    'FK',
    'FM',
    'FO',
    'FR',
    'GA',
    'GD',
    'GE',
    'GF',
    'GH',
    'GI',
    'GL',
    'GM',
    'GN',
    'GP',
    'GQ',
    'GR',
    'GT',
    'GU',
    'GW',
    'GY',
    'HN',
    'HR',
    'HT',
    'HU',
    'IE',
    'IL',
    'IO',
    'IQ',
    'IR',
    'IS',
    'IT',
    'JM',
    'JO',
    'KE',
    'KG',
    'KH',
    'KI',
    'KM',
    'KN',
    'KP',
    'KW',
    'KY',
    'KZ',
    'LA',
    'LB',
    'LC',
    'LK',
    'LR',
    'LS',
    'LT',
    'LU',
    'LV',
    'LY',
    'MA',
    'MC',
    'MD',
    'ME',
    'MF',
    'MG',
    'MH',
    'MK',
    'ML',
    'MM',
    'MN',
    'MO',
    'MP',
    'MQ',
    'MR',
    'MS',
    'MT',
    'MU',
    'MV',
    'MW',
    'MX',
    'MZ',
    'NA',
    'NC',
    'NE',
    'NF',
    'NG',
    'NI',
    'NO',
    'NP',
    'NR',
    'NU',
    'NZ',
    'OM',
    'PA',
    'PE',
    'PF',
    'PG',
    'PH',
    'PK',
    'PL',
    'PM',
    'PN',
    'PR',
    'PS',
    'PT',
    'PW',
    'PY',
    'QA',
    'RE',
    'RO',
    'RS',
    'RU',
    'RW',
    'SA',
    'SB',
    'SC',
    'SD',
    'SE',
    'SH',
    'SI',
    'SK',
    'SL',
    'SM',
    'SN',
    'SO',
    'SR',
    'SS',
    'ST',
    'SV',
    'SX',
    'SY',
    'SZ',
    'TC',
    'TD',
    'TF',
    'TG',
    'TJ',
    'TK',
    'TL',
    'TM',
    'TN',
    'TO',
    'TR',
    'TT',
    'TV',
    'TZ',
    'UA',
    'UG',
    'UM',
    'UY',
    'UZ',
    'VA',
    'VC',
    'VE',
    'VG',
    'VI',
    'VU',
    'WF',
    'WS',
    'YE',
    'YT',
    'ZA',
    'ZM',
    'ZW',
];
const commonCountryValues = new Set(commonCountryOptions.map((item) => item.value).filter(Boolean));
const countryOptions = [
    ...commonCountryOptions,
    ...extraCountryCodes.filter((value) => !commonCountryValues.has(value)).map((value) => ({ value, label: value })),
];
const countryValues = new Set(countryOptions.map((item) => item.value).filter(Boolean));
const countryAliases: Record<string, string> = {
    INDONESIA: 'ID',
    JAKARTA: 'ID',
    'TANJUNG PRIOK': 'ID',
    SURABAYA: 'ID',
    'TANJUNG PERAK': 'ID',
    SINGAPORE: 'SG',
    CHINA: 'CN',
    SHANGHAI: 'CN',
    NINGBO: 'CN',
    SHENZHEN: 'CN',
    INDIA: 'IN',
    NHAVA: 'IN',
    'NHAVA SHEVA': 'IN',
    MUNDRA: 'IN',
    MALAYSIA: 'MY',
    KLANG: 'MY',
    THAILAND: 'TH',
    VIETNAM: 'VN',
    TAIWAN: 'TW',
    'HONG KONG': 'HK',
    HONGKONG: 'HK',
    KOREA: 'KR',
    BUSAN: 'KR',
    JAPAN: 'JP',
    DUBAI: 'AE',
    'JEBEL ALI': 'AE',
    ROTTERDAM: 'NL',
    HAMBURG: 'DE',
};

const inputClass = 'h-9 rounded-sm border-slate-300 bg-white text-xs text-slate-700 shadow-none focus:border-blue-500 focus:ring-blue-500/20';
const selectClass =
    'h-9 w-full rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-700 shadow-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const portalPanelClass = 'border border-slate-200 bg-white';
const portalPanelHeaderClass = 'border-b border-slate-200 bg-[#f4fbfb] px-5 py-4 text-sm font-semibold text-slate-700';
const portalPanelBodyClass = 'p-5';

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

function hasNumberValue(value: unknown): boolean {
    if (!hasValue(value)) return false;

    return Number.isFinite(Number(value));
}

function referenceCode(value: unknown): string {
    const raw = String(value ?? '')
        .trim()
        .toUpperCase();

    const numeric = raw.match(/^\d+/);

    if (numeric) {
        return String(Number(numeric[0]));
    }

    return raw.replace(/[^A-Z0-9]+/g, '');
}

function hasReferenceOrDefault(value: unknown, validValues: Set<string>, fallback: string): boolean {
    if (!hasValue(value)) {
        return validValues.has(fallback);
    }

    return validValues.has(referenceCode(value));
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

function getPath(source: any, path: string) {
    return path.split('.').reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), source);
}

function firstRecordList(payload: any, paths: string[]): Record<string, any>[] {
    if (Array.isArray(payload)) {
        return payload.filter((item) => item && typeof item === 'object');
    }

    for (const path of paths) {
        const value = getPath(payload, path);

        if (Array.isArray(value)) {
            return value.filter((item) => item && typeof item === 'object');
        }

        if (value && typeof value === 'object') {
            return [value];
        }
    }

    return [];
}

function extractReferenceRows(value: any): Record<string, any>[] {
    const result = value?.result ?? value;
    const payload = result?.data ?? result;

    return firstRecordList(payload, ['data', 'item', 'result', 'items']);
}

function pickRecordValue(record: Record<string, any>, keys: string[]) {
    for (const key of keys) {
        const value = getPath(record, key);
        if (value !== undefined && value !== null && value !== '') return String(value);
    }

    return '';
}

function normalizeCountryCode(value: unknown): string {
    const code = String(value ?? '')
        .trim()
        .toUpperCase();

    return /^[A-Z]{2}$/.test(code) && countryValues.has(code) ? code : '';
}

function countryFromPortValue(...values: unknown[]): string {
    for (const value of values) {
        const direct = normalizeCountryCode(value);
        if (direct) return direct;

        const text = String(value ?? '')
            .trim()
            .toUpperCase();
        const alnum = text.replace(/[^A-Z0-9]/g, '');

        if (alnum.length >= 5) {
            const prefix = alnum.slice(0, 2);
            if (countryValues.has(prefix)) return prefix;
        }

        for (const [needle, country] of Object.entries(countryAliases)) {
            const compactNeedle = needle.replace(/[^A-Z0-9]/g, '');

            if (text.includes(needle) || alnum.includes(compactNeedle)) {
                return country;
            }
        }
    }

    return '';
}

function isCountryCode(value: unknown): boolean {
    return normalizeCountryCode(value) !== '';
}

function numericValueFromReference(value: any): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value === 'string') {
        let normalized = value.trim().replace(/[^0-9,.-]/g, '');
        const lastComma = normalized.lastIndexOf(',');
        const lastDot = normalized.lastIndexOf('.');

        if (lastComma >= 0 && lastDot >= 0) {
            normalized = lastComma > lastDot ? normalized.replace(/\./g, '').replace(',', '.') : normalized.replace(/,/g, '');
        } else if (lastComma >= 0) {
            normalized = normalized.replace(',', '.');
        } else if ((normalized.match(/\./g) || []).length > 1) {
            normalized = normalized.replace(/\./g, '');
        }

        const parsed = Number(normalized);

        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function pickNumericReferenceValue(value: any, keys: string[], depth = 0): number | null {
    if (depth > 5 || value === null || value === undefined) return null;

    if (Array.isArray(value)) {
        for (const item of value) {
            const found = pickNumericReferenceValue(item, keys, depth + 1);
            if (found !== null) return found;
        }

        return null;
    }

    if (typeof value === 'object') {
        for (const key of keys) {
            const found = numericValueFromReference(getPath(value, key));
            if (found !== null) return found;
        }

        for (const item of Object.values(value)) {
            const found = pickNumericReferenceValue(item, keys, depth + 1);
            if (found !== null) return found;
        }
    }

    return null;
}

function entityTemplate(kodeEntitas: string): Record<string, any> {
    const common = {
        seriEntitas: 1,
        kodeEntitas,
        namaEntitas: '',
        alamatEntitas: '',
    };

    if (['1', '2'].includes(kodeEntitas)) {
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

    if (['6', '8', '9', '10'].includes(kodeEntitas)) {
        const fallbackNames: Record<string, string> = {
            '6': 'PEMBELI',
            '8': 'PENERIMA',
            '9': 'PENGIRIM',
            '10': 'PENJUAL',
        };

        return {
            ...common,
            namaEntitas: fallbackNames[kodeEntitas],
            alamatEntitas: '-',
            kodeNegara: '',
            kodeJenisIdentitas: '6',
            nomorIdentitas: '-',
            kodeAfiliasi: 'TAH',
        };
    }

    if (kodeEntitas === '11') {
        return {
            ...common,
            nomorIdentitas: '',
            kodeJenisIdentitas: '6',
            nitku: '',
            nibEntitas: '',
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

    return common;
}

function isExportDraft(documentType: string, payload: Record<string, any>): boolean {
    const normalizedType = String(documentType || payload.kodeDokumen || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    return normalizedType === 'BC30' || normalizedType === '30';
}

function buildRequirements(payload: Record<string, any>, documentType: string): Requirement[] {
    const entitas = Array.isArray(payload.entitas) ? payload.entitas : [];
    const dokumen = Array.isArray(payload.dokumen) ? payload.dokumen : [];
    const pengangkut = Array.isArray(payload.pengangkut) ? payload.pengangkut : [];
    const barang = Array.isArray(payload.barang) ? payload.barang : [];
    const kemasan = Array.isArray(payload.kemasan) ? payload.kemasan : [];
    const bankDevisa = Array.isArray(payload.bankDevisa) ? payload.bankDevisa : [];
    const kesiapanBarang = Array.isArray(payload.kesiapanBarang) ? payload.kesiapanBarang : [];
    const exportDraft = isExportDraft(documentType, payload);

    const importir = entitas.find((item: any) => item?.kodeEntitas === '1');
    const eksportir = entitas.find((item: any) => item?.kodeEntitas === '2');
    const pengirim = entitas.find((item: any) => item?.kodeEntitas === '9');
    const penjual = entitas.find((item: any) => item?.kodeEntitas === '10');
    const pemilik = entitas.find((item: any) => item?.kodeEntitas === '7') || (exportDraft ? eksportir : undefined);
    const penerima = entitas.find((item: any) => item?.kodeEntitas === '8') || (exportDraft ? pengirim : undefined);
    const pembeli = entitas.find((item: any) => item?.kodeEntitas === '6') || (exportDraft ? penjual : undefined);
    const pemusatan = entitas.find((item: any) => item?.kodeEntitas === '11');
    const invoice = dokumen.find((item: any) => item?.kodeDokumen === '380');
    const packingList = dokumen.find((item: any) => item?.kodeDokumen === '217');
    const blAwb = dokumen.find((item: any) => ['705', '740'].includes(item?.kodeDokumen));
    const firstBarang = barang[0] || {};
    const firstKemasan = kemasan[0] || {};
    const firstPengangkut = pengangkut[0] || {};
    const firstBankDevisa = bankDevisa[0] || {};
    const firstKesiapanBarang = kesiapanBarang[0] || {};

    const commonRequirements: Requirement[] = [
        { group: 'Header', label: 'Nomor aju', ok: hasValue(payload.nomorAju) },
        { group: 'Header', label: 'Kode kantor', ok: hasValue(payload.kodeKantor) },
    ];

    const transactionRequirements: Requirement[] = exportDraft
        ? [
              { group: 'Header', label: 'Kantor pabean pemuatan', ok: hasValue(payload.kodeKantorMuat || payload.kodeKantor) },
              { group: 'Header', label: 'Pelabuhan muat ekspor', ok: hasValue(payload.kodePelEkspor || payload.kodePelMuat) },
              { group: 'Header', label: 'Kantor pabean ekspor', ok: hasValue(payload.kodeKantorEkspor || payload.kodeKantor) },
              { group: 'Header', label: 'Jenis ekspor', ok: hasReferenceOrDefault(payload.kodeJenisEkspor, jenisEksporValues, '1') },
              { group: 'Header', label: 'Kategori ekspor', ok: hasReferenceOrDefault(payload.kodeKategoriEkspor, kategoriEksporValues, '10') },
              { group: 'Header', label: 'Cara perdagangan', ok: hasReferenceOrDefault(payload.kodeCaraDagang, caraDagangValues, '1') },
              { group: 'Header', label: 'Cara bayar', ok: hasReferenceOrDefault(payload.kodeCaraBayar, caraBayarValues, '1') },
              { group: 'Header', label: 'Komoditas', ok: hasReferenceOrDefault(payload.flagMigas, komoditasValues, '2') },
              { group: 'Header', label: 'Barang kiriman', ok: hasReferenceOrDefault(payload.flagBarkir, barangKirimanValues, 'T') },
              {
                  group: 'Header',
                  label: 'Barang curah',
                  ok: String(payload.flagBarkir || 'T') !== 'T' || hasReferenceOrDefault(payload.flagCurah, curahValues, '2'),
              },
              {
                  group: 'Header',
                  label: 'Keterangan pembayaran',
                  ok: String(payload.kodeCaraBayar || '') !== '9' || hasValue(payload.kodePembayar),
              },
              { group: 'Pengangkut', label: 'Jenis pengangkutan', ok: hasReferenceOrDefault(payload.kodeJenisPengangkutan, jenisPengangkutanValues, '1') },
              { group: 'Pengangkut', label: 'Pelabuhan muat asal', ok: hasValue(payload.kodePelMuat) },
              { group: 'Pengangkut', label: 'Pelabuhan tujuan', ok: hasValue(payload.kodePelTujuan) },
              { group: 'Pengangkut', label: 'Tempat penimbunan', ok: hasValue(payload.kodeTps) },
              { group: 'Pengangkut', label: 'Negara tujuan', ok: isCountryCode(payload.kodeNegaraTujuan) },
              { group: 'Pengangkut', label: 'Lokasi pemeriksaan', ok: hasReferenceOrDefault(payload.kodeLokasi, lokasiPemeriksaanValues, '2') },
              { group: 'Pengangkut', label: 'Kantor pemeriksaan', ok: hasValue(payload.kodeKantorPeriksa || payload.kodeKantor) },
              { group: 'Pengangkut', label: 'Tanggal periksa', ok: hasValue(payload.tanggalPeriksa) },
              { group: 'Pengangkut', label: 'Tanggal ekspor', ok: hasValue(payload.tanggalEkspor) },
              {
                  group: 'Pengangkut',
                  label: 'Sarana angkut',
                  ok:
                      hasValue(firstPengangkut?.namaPengangkut) &&
                      hasValue(firstPengangkut?.nomorPengangkut) &&
                      hasValue(firstPengangkut?.kodeCaraAngkut) &&
                      isCountryCode(firstPengangkut?.kodeBendera),
              },
              {
                  group: 'Pengangkut',
                  label: 'Kesiapan barang',
                  ok:
                      hasValue(firstKesiapanBarang?.namaPic) &&
                      hasValue(firstKesiapanBarang?.alamat) &&
                      hasValue(firstKesiapanBarang?.nomorTelpPic) &&
                      hasReferenceOrDefault(firstKesiapanBarang?.kodeJenisGudang, jenisGudangValues, '2') &&
                      hasReferenceOrDefault(firstKesiapanBarang?.kodeCaraStuffing, caraStuffingValues, '7') &&
                      hasValue(firstKesiapanBarang?.tanggalPkb),
              },
              { group: 'Transaksi', label: 'NDPBM/Kurs', ok: hasNumberValue(payload.ndpbm) },
              { group: 'Transaksi', label: 'Valuta', ok: hasValue(payload.kodeValuta) },
              { group: 'Transaksi', label: 'FOB', ok: hasNumberValue(payload.fob) },
              { group: 'Transaksi', label: 'Freight', ok: hasNumberValue(payload.freight) },
              { group: 'Transaksi', label: 'Asuransi', ok: hasNumberValue(payload.asuransi) && hasValue(payload.kodeAsuransi) },
              { group: 'Transaksi', label: 'Netto', ok: hasNumberValue(payload.netto) },
              { group: 'Transaksi', label: 'Bruto', ok: hasNumberValue(payload.bruto) },
              { group: 'Transaksi', label: 'Bank devisa', ok: hasValue(firstBankDevisa?.kodeBank) },
              {
                  group: 'Pernyataan',
                  label: 'Penandatangan',
                  ok: hasValue(payload.namaTtd) && hasValue(payload.jabatanTtd) && hasValue(payload.kotaTtd) && hasValue(payload.tanggalTtd),
              },
              {
                  group: 'Entitas',
                  label: 'Eksportir lengkap',
                  ok:
                      hasValue(eksportir?.namaEntitas) &&
                      hasValue(eksportir?.alamatEntitas) &&
                      hasValue(eksportir?.nomorIdentitas) &&
                      hasValue(eksportir?.nibEntitas),
              },
              {
                  group: 'Entitas',
                  label: 'Pemilik barang',
                  ok: hasValue(pemilik?.namaEntitas) && hasValue(pemilik?.alamatEntitas) && hasValue(pemilik?.nomorIdentitas),
              },
              {
                  group: 'Entitas',
                  label: 'Penerima luar negeri',
                  ok: hasValue(penerima?.namaEntitas) && hasValue(penerima?.alamatEntitas) && isCountryCode(penerima?.kodeNegara),
              },
              {
                  group: 'Entitas',
                  label: 'Pembeli luar negeri',
                  ok: hasValue(pembeli?.namaEntitas) && hasValue(pembeli?.alamatEntitas) && isCountryCode(pembeli?.kodeNegara),
              },
          ]
        : [
              { group: 'Header', label: 'Jenis PIB', ok: hasReferenceOrDefault(payload.kodeJenisPib, new Set(['1', '2']), '1') },
              { group: 'Header', label: 'Jenis impor', ok: hasValue(payload.kodeJenisImpor) },
              { group: 'Header', label: 'Cara bayar', ok: caraBayarValues.has(String(payload.kodeCaraBayar || '')) },
              { group: 'Header', label: 'Pelabuhan tujuan', ok: hasValue(payload.kodePelTujuan) },
              { group: 'Pengangkut', label: 'Pelabuhan muat', ok: hasValue(payload.kodePelMuat) },
              { group: 'Pengangkut', label: 'Tempat penimbunan', ok: hasValue(payload.kodeTps) },
              { group: 'Pengangkut', label: 'Nomor Tutup PU', ok: tutupPuValues.has(String(payload.kodeTutupPu || '')) },
              { group: 'Pengangkut', label: 'Tanggal tiba', ok: hasValue(payload.tanggalTiba) },
              {
                  group: 'Pengangkut',
                  label: 'Sarana angkut',
                  ok:
                      hasValue(firstPengangkut?.namaPengangkut) &&
                      hasValue(firstPengangkut?.nomorPengangkut) &&
                      hasValue(firstPengangkut?.kodeCaraAngkut) &&
                      isCountryCode(firstPengangkut?.kodeBendera),
              },
              { group: 'Transaksi', label: 'NDPBM/Kurs', ok: positiveNumber(payload.ndpbm) },
              { group: 'Transaksi', label: 'Valuta', ok: hasValue(payload.kodeValuta) },
              { group: 'Transaksi', label: 'CIF', ok: hasNumberValue(payload.cif) },
              { group: 'Transaksi', label: 'FOB', ok: hasNumberValue(payload.fob) },
              { group: 'Transaksi', label: 'Freight', ok: hasNumberValue(payload.freight) },
              { group: 'Transaksi', label: 'Asuransi', ok: hasNumberValue(payload.asuransi) },
              { group: 'Transaksi', label: 'Netto', ok: hasNumberValue(payload.netto) },
              { group: 'Transaksi', label: 'Bruto', ok: hasNumberValue(payload.bruto) },
              { group: 'Transaksi', label: 'Jenis transaksi', ok: jenisTransaksiValues.has(String(payload.kodeJenisNilai || '')) },
              {
                  group: 'Pernyataan',
                  label: 'Penandatangan',
                  ok: hasValue(payload.namaTtd) && hasValue(payload.jabatanTtd) && hasValue(payload.kotaTtd) && hasValue(payload.tanggalTtd),
              },
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
                  label: 'Pengirim luar negeri',
                  ok: hasValue(pengirim?.namaEntitas) && hasValue(pengirim?.alamatEntitas) && isCountryCode(pengirim?.kodeNegara),
              },
              {
                  group: 'Entitas',
                  label: 'Penjual luar negeri',
                  ok: hasValue(penjual?.namaEntitas) && hasValue(penjual?.alamatEntitas) && isCountryCode(penjual?.kodeNegara),
              },
              {
                  group: 'Entitas',
                  label: 'Pemusatan',
                  ok: hasValue(pemusatan?.namaEntitas) && hasValue(pemusatan?.alamatEntitas) && hasValue(pemusatan?.nomorIdentitas),
              },
          ];

    const documentRequirements: Requirement[] = [
        {
            group: 'Dokumen',
            label: 'Invoice 380',
            ok: hasValue(invoice?.nomorDokumen) && hasValue(invoice?.tanggalDokumen),
        },
    ];

    if (exportDraft) {
        documentRequirements.push({
            group: 'Dokumen',
            label: 'Packing List 217',
            ok: hasValue(packingList?.nomorDokumen) && hasValue(packingList?.tanggalDokumen),
        });
    } else {
        documentRequirements.push({
            group: 'Dokumen',
            label: 'B/L 705 atau AWB 740',
            ok: hasValue(blAwb?.nomorDokumen) && hasValue(blAwb?.tanggalDokumen),
        });
    }

    return [
        ...commonRequirements,
        ...transactionRequirements,
        ...documentRequirements,
        {
            group: 'Kemasan',
            label: 'Kemasan',
            ok: hasValue(firstKemasan?.kodeJenisKemasan) && positiveNumber(firstKemasan?.jumlahKemasan) && hasValue(firstKemasan?.merkKemasan),
        },
        {
            group: 'Barang',
            label: 'Barang utama',
            ok:
                hasValue(firstBarang?.posTarif) &&
                hasValue(firstBarang?.uraian) &&
                positiveNumber(firstBarang?.jumlahSatuan) &&
                hasValue(firstBarang?.kodeSatuanBarang) &&
                positiveNumber(firstBarang?.jumlahKemasan) &&
                hasValue(firstBarang?.kodeJenisKemasan) &&
                isCountryCode(firstBarang?.kodeNegaraAsal) &&
                hasValue(firstBarang?.merk) &&
                hasValue(firstBarang?.tipe) &&
                hasValue(firstBarang?.kodeKondisiBarang) &&
                hasValue(firstBarang?.metodePenentuanNilai),
        },
    ];
}

function hasDocumentRow(payload: Record<string, any>, codes: string[]): boolean {
    const dokumen = Array.isArray(payload.dokumen) ? payload.dokumen : [];

    return dokumen.some(
        (item: any) => codes.includes(String(item?.kodeDokumen || '')) && hasValue(item?.nomorDokumen) && hasValue(item?.tanggalDokumen),
    );
}

function foreignEntityComplete(payload: Record<string, any>, kodeEntitas: string): boolean {
    const entitas = Array.isArray(payload.entitas) ? payload.entitas : [];
    const entity = entitas.find((item: any) => String(item?.kodeEntitas || '') === kodeEntitas);

    return hasValue(entity?.namaEntitas) && hasValue(entity?.alamatEntitas) && isCountryCode(entity?.kodeNegara);
}

function filterResolvedWarnings(warnings: string[], payload: Record<string, any>, documentType: string): string[] {
    const exportDraft = isExportDraft(documentType, payload);

    return warnings.filter((warning) => {
        const normalized = warning.toLowerCase();

        if (normalized.includes('dokumen invoice 380') && hasDocumentRow(payload, ['380'])) {
            return false;
        }

        if (normalized.includes('packing list') && hasDocumentRow(payload, ['217'])) {
            return false;
        }

        if (exportDraft && normalized.includes('dokumen b/l 705')) {
            return false;
        }

        if (normalized.includes('dokumen b/l 705') && hasDocumentRow(payload, ['705', '740'])) {
            return false;
        }

        if (normalized.includes('kode pelabuhan muat/tujuan') && hasValue(payload.kodePelMuat) && hasValue(payload.kodePelTujuan)) {
            return false;
        }

        if (normalized.includes('data shipper/pengirim') && foreignEntityComplete(payload, '9')) {
            return false;
        }

        if (normalized.includes('kode negara shipper/penjual') && foreignEntityComplete(payload, '9') && foreignEntityComplete(payload, '10')) {
            return false;
        }

        return true;
    });
}

function fieldLabel(label: string, required = false) {
    return (
        <Label className="text-xs font-medium text-slate-700">
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
    referenceEndpoint,
    onRegenerate,
    onSubmit,
}: CeisaDraftModalProps) {
    const [activeTab, setActiveTab] = useState<DraftTab>('header');
    const [portLookupTarget, setPortLookupTarget] = useState<PortLookupTarget>('kodePelTujuan');
    const [activePortDropdown, setActivePortDropdown] = useState<PortLookupTarget | null>(null);
    const [portLookupKeyword, setPortLookupKeyword] = useState('');
    const [portLookupRows, setPortLookupRows] = useState<Record<string, any>[]>([]);
    const [isLookingUpPort, setIsLookingUpPort] = useState(false);
    const [kursLookupMessage, setKursLookupMessage] = useState('');
    const [isLookingUpKurs, setIsLookingUpKurs] = useState(false);
    const { payload, error: jsonError } = useMemo(() => parsePayload(payloadText), [payloadText]);
    const isExport = isExportDraft(documentType, payload);
    const latestDraftRef = useRef<{ payload: Record<string, any>; jsonError: string | null }>({ payload, jsonError });
    const requirements = useMemo(() => buildRequirements(payload, documentType), [payload, documentType]);
    const missingRequirements = requirements.filter((item) => !item.ok);
    const completedCount = requirements.length - missingRequirements.length;
    const visibleWarnings = useMemo(() => filterResolvedWarnings(warnings, payload, documentType), [warnings, payload, documentType]);
    const requiredDocumentCodes = isExport ? ['380', '217'] : ['380', '705', '740'];

    useEffect(() => {
        latestDraftRef.current = { payload, jsonError };
    }, [jsonError, payload]);

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
            transport: ['Pengangkut'],
            packaging: ['Kemasan'],
            transaction: ['Transaksi'],
            goods: ['Barang'],
            statement: ['Pernyataan'],
            advanced: [],
        };

        return missingRequirements.some((item) => groupsByTab[tab].includes(item.group));
    };

    const lookupPortRows = useCallback(
        async (keyword: string, limit = 8): Promise<Array<Record<string, any>>> => {
            if (!referenceEndpoint || !keyword.trim()) return [];

            try {
                const response = await axios.post(referenceEndpoint, {
                    lookup_type: 'pelabuhan_kata',
                    params: { kata: keyword.trim() },
                });

                return extractReferenceRows(response.data).slice(0, limit);
            } catch {
                return [];
            }
        },
        [referenceEndpoint],
    );

    const lookupPortsFor = useCallback(
        async (target: PortLookupTarget, keyword: string, options: { silent?: boolean; limit?: number } = {}) => {
            if (!referenceEndpoint || !keyword.trim()) return;

            setPortLookupTarget(target);
            setIsLookingUpPort(true);

            try {
                const rows = await lookupPortRows(keyword, options.limit ?? 8);
                setPortLookupRows(rows);
            } finally {
                setIsLookingUpPort(false);
            }
        },
        [lookupPortRows, referenceEndpoint],
    );

    const applyEntityCountry = (next: Record<string, any>, country: string, entityCodes: string[]) => {
        if (!country) return;

        const entitas = ensureArray(next, 'entitas');

        entityCodes.forEach((kodeEntitas) => {
            let index = entitas.findIndex((item) => item?.kodeEntitas === kodeEntitas);

            if (index < 0) {
                entitas.push(entityTemplate(kodeEntitas));
                index = entitas.length - 1;
            }

            if (!isCountryCode(entitas[index].kodeNegara)) {
                entitas[index].kodeNegara = country;
            }
        });

        entitas.forEach((item, itemIndex) => {
            item.seriEntitas = itemIndex + 1;
        });

        if (!isExport) {
            const barang = ensureArray(next, 'barang');
            barang.forEach((item) => {
                if (!isCountryCode(item.kodeNegaraAsal)) {
                    item.kodeNegaraAsal = country;
                }
            });
        }
    };

    const applyPortReference = (row: Record<string, any>, target: PortLookupTarget = portLookupTarget) => {
        const code = pickRecordValue(row, ['kodePelabuhan', 'kode_pelabuhan', 'kode', 'kodePort', 'kodePel']);
        const name = pickRecordValue(row, ['namaPelabuhan', 'nama_pelabuhan', 'nama', 'uraian']);
        const office = pickRecordValue(row, ['kodeKantor', 'kode_kantor']);
        const country =
            normalizeCountryCode(pickRecordValue(row, ['kodeNegara', 'kode_negara', 'countryCode', 'kodeCountry'])) ||
            countryFromPortValue(code, name, pickRecordValue(row, ['negara', 'namaNegara', 'nama_negara']));

        if (!code) return;

        commitPayload((next) => {
            const portCode = code.toUpperCase();
            next[target] = portCode;

            if (!isExport && target === 'kodePelMuat') {
                applyEntityCountry(next, country, ['9', '10']);
            }

            if (isExport && target === 'kodePelMuat' && !hasValue(next.kodePelEkspor)) {
                next.kodePelEkspor = portCode;
            }

            if (isExport && target === 'kodePelEkspor') {
                if (!hasValue(next.kodePelMuat)) {
                    next.kodePelMuat = portCode;
                }

                if (office) {
                    if (!next.kodeKantorMuat) next.kodeKantorMuat = office;
                    if (!next.kodeKantorEkspor) next.kodeKantorEkspor = office;
                    if (!next.kodeKantorPeriksa) next.kodeKantorPeriksa = office;
                    if (!next.kodeKantor) next.kodeKantor = office;
                }
            }

            if (isExport && target === 'kodePelTujuan' && !hasValue(next.kodePelBongkar)) {
                next.kodePelBongkar = portCode;
            }

            if (isExport && target === 'kodePelBongkar') {
                if (!hasValue(next.kodePelTujuan)) {
                    next.kodePelTujuan = portCode;
                }

                if (country && !isCountryCode(next.kodeNegaraTujuan)) {
                    next.kodeNegaraTujuan = country;
                }

                applyEntityCountry(next, country, ['8', '6']);
            }

            if (isExport && target === 'kodePelTujuan') {
                if (country && !isCountryCode(next.kodeNegaraTujuan)) {
                    next.kodeNegaraTujuan = country;
                }

                applyEntityCountry(next, country, ['8', '6']);
            }

            if (!isExport && target === 'kodePelTujuan') {
                next.kodeKantor = office || '';
            }

            if (isExport && target === 'kodePelTujuan' && office && !next.kodeKantor) {
                next.kodeKantor = office;
            }

            if (isExport && target === 'kodePelMuat' && office) {
                if (!next.kodeKantorMuat) next.kodeKantorMuat = office;
                if (!next.kodeKantorEkspor) next.kodeKantorEkspor = office;
                if (!next.kodeKantor) next.kodeKantor = office;
            }
        });

        setActivePortDropdown(null);
        setPortLookupKeyword('');
        setPortLookupRows([]);
    };

    const applyResolvedImportDestinationOffice = useCallback(
        (requestedPort: string, row: Record<string, any>) => {
            const { payload: currentPayload, jsonError: currentJsonError } = latestDraftRef.current;

            if (currentJsonError) return;

            const office = pickRecordValue(row, ['kodeKantor', 'kode_kantor']);
            const portCode = pickRecordValue(row, ['kodePelabuhan', 'kode_pelabuhan', 'kode', 'kodePort', 'kodePel']);

            if (!office) return;

            const requested = requestedPort.trim().toUpperCase();
            const currentPort = String(currentPayload.kodePelTujuan || '').trim().toUpperCase();

            if (currentPort !== requested) return;

            const nextPort = portCode ? portCode.toUpperCase() : currentPort;
            const currentOffice = String(currentPayload.kodeKantor || '').trim();

            if (currentOffice === office && currentPort === nextPort) return;

            const next = clonePayload(currentPayload);
            next.kodePelTujuan = nextPort;
            next.kodeKantor = office;
            onPayloadTextChange(toPayloadText(next));
        },
        [onPayloadTextChange],
    );

    const importDestinationPort = !isExport && !jsonError ? String(payload.kodePelTujuan || '').trim().toUpperCase() : '';

    useEffect(() => {
        if (isExport || jsonError || !referenceEndpoint || importDestinationPort.length < 2) {
            return;
        }

        let cancelled = false;

        const timeout = window.setTimeout(async () => {
            const rows = await lookupPortRows(importDestinationPort, 6);

            if (cancelled || rows.length === 0) return;

            const exactRow =
                rows.find((row) => {
                    const code = pickRecordValue(row, ['kodePelabuhan', 'kode_pelabuhan', 'kode', 'kodePort', 'kodePel']);

                    return code.toUpperCase() === importDestinationPort;
                }) || (rows.length === 1 ? rows[0] : undefined);

            if (exactRow) {
                applyResolvedImportDestinationOffice(importDestinationPort, exactRow);
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [applyResolvedImportDestinationOffice, importDestinationPort, isExport, jsonError, lookupPortRows, referenceEndpoint]);

    useEffect(() => {
        if (!activePortDropdown) {
            return;
        }

        const keyword = portLookupKeyword.trim();

        if (keyword.length < 2) {
            setPortLookupRows([]);

            return;
        }

        const timeout = window.setTimeout(() => {
            void lookupPortsFor(activePortDropdown, keyword, { silent: true, limit: 10 });
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [activePortDropdown, lookupPortsFor, portLookupKeyword]);

    const lookupKurs = async () => {
        if (!referenceEndpoint) return;

        const kodeValuta = String(payload.kodeValuta || 'USD').toUpperCase();
        setIsLookingUpKurs(true);
        setKursLookupMessage('');

        try {
            const response = await axios.post(referenceEndpoint, {
                lookup_type: 'kurs',
                params: {
                    kode_valuta: kodeValuta,
                    tanggal: payload.tanggalAju || new Date().toISOString().slice(0, 10),
                },
            });
            const ndpbm = pickNumericReferenceValue(response.data, [
                'nilaiKurs',
                'nilai_kurs',
                'kurs',
                'ndpbm',
                'nilai',
                'rate',
                'data.nilaiKurs',
                'item.nilaiKurs',
            ]);

            if (ndpbm && ndpbm > 0) {
                updateHeader('ndpbm', ndpbm);
                setKursLookupMessage(`NDPBM ${kodeValuta} diperbarui dari referensi CEISA.`);
            } else {
                setKursLookupMessage('Referensi kurs ditemukan, tetapi nilai NDPBM tidak terdeteksi.');
            }
        } catch (error: any) {
            setKursLookupMessage(error?.response?.data?.message ?? 'Ambil kurs CEISA gagal.');
        } finally {
            setIsLookingUpKurs(false);
        }
    };

    const updateHeader = (field: string, value: any) => {
        commitPayload((next) => {
            const previousValue = next[field];
            next[field] = value;

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

            if (field === 'kodePelMuat') {
                if (isExport) {
                    if (!hasValue(next.kodePelEkspor) || next.kodePelEkspor === previousValue) {
                        next.kodePelEkspor = value;
                    }
                } else {
                    applyEntityCountry(next, countryFromPortValue(value), ['9', '10']);
                }
            }

            if (!isExport && field === 'kodePelTujuan' && next.kodeKantor) {
                next.kodeKantor = '';
            }

            if (isExport && field === 'kodeKantor') {
                if (!hasValue(next.kodeKantorMuat)) next.kodeKantorMuat = value;
                if (!hasValue(next.kodeKantorEkspor)) next.kodeKantorEkspor = value;
                if (!hasValue(next.kodeKantorPeriksa)) next.kodeKantorPeriksa = value;
            }

            if (isExport && field === 'kodeKantorMuat') {
                if (!hasValue(next.kodeKantor) || next.kodeKantor === previousValue) next.kodeKantor = value;
                if (!hasValue(next.kodeKantorEkspor)) next.kodeKantorEkspor = value;
                if (!hasValue(next.kodeKantorPeriksa)) next.kodeKantorPeriksa = value;
            }

            if (isExport && field === 'kodeKantorEkspor') {
                if (!hasValue(next.kodeKantor) || next.kodeKantor === previousValue) next.kodeKantor = value;
            }

            if (isExport && field === 'kodeKantorPeriksa' && !hasValue(next.kodeKantor)) {
                next.kodeKantor = value;
            }

            if (isExport && field === 'kodePelEkspor' && !hasValue(next.kodePelMuat)) {
                next.kodePelMuat = value;
            }

            if (isExport && field === 'kodeCaraBayar' && String(value) !== '9') {
                delete next.kodePembayar;
            }

            if (isExport && field === 'kodePelTujuan') {
                const country = countryFromPortValue(value);

                if (!hasValue(next.kodePelBongkar) || next.kodePelBongkar === previousValue) {
                    next.kodePelBongkar = value;
                }

                if (country && !isCountryCode(next.kodeNegaraTujuan)) {
                    next.kodeNegaraTujuan = country;
                }

                applyEntityCountry(next, country, ['8', '6']);
            }

            if (isExport && field === 'kodePelBongkar') {
                const country = countryFromPortValue(value);

                if (!hasValue(next.kodePelTujuan)) {
                    next.kodePelTujuan = value;
                }

                if (country && !isCountryCode(next.kodeNegaraTujuan)) {
                    next.kodeNegaraTujuan = country;
                }

                applyEntityCountry(next, country, ['8', '6']);
            }

            if (isExport && field === 'kodeNegaraTujuan') {
                applyEntityCountry(next, value, ['8', '6']);
            }
        });
    };

    const renderPortReferenceField = (target: PortLookupTarget, label: string, placeholder: string) => {
        const dropdownOpen = activePortDropdown === target && portLookupTarget === target;

        return (
            <div className="space-y-1.5">
                {fieldLabel(label, true)}
                <div className="relative">
                    <div className="flex gap-2">
                        <Input
                            value={payload[target] || ''}
                            onFocus={() => {
                                const current = String(payload[target] || '');
                                setActivePortDropdown(target);
                                setPortLookupTarget(target);
                                setPortLookupKeyword(current);

                                if (current.trim().length >= 2) {
                                    void lookupPortsFor(target, current, { silent: true, limit: 10 });
                                }
                            }}
                            onBlur={() => {
                                window.setTimeout(() => {
                                    setActivePortDropdown((current) => (current === target ? null : current));
                                }, 160);
                            }}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                updateHeader(target, value);
                                setActivePortDropdown(target);
                                setPortLookupTarget(target);
                                setPortLookupKeyword(value);
                            }}
                            className={inputClass}
                            placeholder={placeholder}
                            autoComplete="off"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                const keyword = String(payload[target] || portLookupKeyword);
                                setActivePortDropdown(target);
                                void lookupPortsFor(target, keyword, { limit: 10 });
                            }}
                            disabled={!referenceEndpoint || isLookingUpPort || !String(payload[target] || portLookupKeyword).trim()}
                            className="h-9 w-10 shrink-0 rounded-sm border-slate-300 p-0"
                            title={`Cari ${label}`}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                    {dropdownOpen && (isLookingUpPort || portLookupRows.length > 0 || portLookupKeyword.trim().length >= 2) && (
                        <div
                            className="absolute right-0 left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
                            onMouseDown={(event) => event.preventDefault()}
                        >
                            {isLookingUpPort && <div className="px-3 py-2 text-xs text-slate-500">Mencari referensi pelabuhan...</div>}
                            {!isLookingUpPort && portLookupRows.length === 0 && (
                                <div className="px-3 py-2 text-xs text-slate-500">Referensi pelabuhan tidak ditemukan.</div>
                            )}
                            {!isLookingUpPort &&
                                portLookupRows.map((row, index) => {
                                    const code = pickRecordValue(row, ['kodePelabuhan', 'kode_pelabuhan', 'kode', 'kodePort', 'kodePel']);
                                    const name = pickRecordValue(row, ['namaPelabuhan', 'nama_pelabuhan', 'nama', 'uraian']);
                                    const office = pickRecordValue(row, ['kodeKantor', 'kode_kantor']);
                                    const country =
                                        normalizeCountryCode(pickRecordValue(row, ['kodeNegara', 'kode_negara', 'countryCode', 'kodeCountry'])) ||
                                        countryFromPortValue(code, name, pickRecordValue(row, ['negara', 'namaNegara', 'nama_negara']));

                                    return (
                                        <button
                                            key={`${target}-${code}-${index}`}
                                            type="button"
                                            onClick={() => applyPortReference(row, target)}
                                            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-blue-50"
                                        >
                                            <div className="font-semibold text-slate-900">{code || '-'}</div>
                                            <div className="mt-0.5 text-slate-600">{name || '-'}</div>
                                            <div className="mt-1 text-[11px] text-slate-400">
                                                Kantor: {office || '-'} {country ? `| Negara: ${country}` : ''}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        );
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
                alasanMetodePenentuanNilai: null,
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
    const bankDevisa = Array.isArray(payload.bankDevisa) ? payload.bankDevisa : [];
    const kesiapanBarang = Array.isArray(payload.kesiapanBarang) ? payload.kesiapanBarang : [];
    const importir = entitas.find((item: any) => item?.kodeEntitas === '1') || {};
    const eksportir = entitas.find((item: any) => item?.kodeEntitas === '2') || {};
    const pengirim = entitas.find((item: any) => item?.kodeEntitas === '9') || {};
    const penjual = entitas.find((item: any) => item?.kodeEntitas === '10') || {};
    const pemilik = entitas.find((item: any) => item?.kodeEntitas === '7') || (isExport ? eksportir : {});
    const penerima = entitas.find((item: any) => item?.kodeEntitas === '8') || (isExport ? pengirim : {});
    const pembeli = entitas.find((item: any) => item?.kodeEntitas === '6') || (isExport ? penjual : {});
    const pemusatan = entitas.find((item: any) => item?.kodeEntitas === '11') || {};
    const ppjk = entitas.find((item: any) => item?.kodeEntitas === '4') || {};
    const transport = pengangkut[0] || {};
    const packageRow = kemasan[0] || {};
    const bankDevisaRow = bankDevisa[0] || {};
    const kesiapanBarangRow = kesiapanBarang[0] || {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[96vh] max-h-[96vh] max-w-[98vw] flex-col overflow-hidden rounded-md border-slate-200 bg-[#f4f5f9] p-0 text-slate-800 sm:max-w-[1560px]">
                <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <DialogTitle className="text-left text-base font-semibold text-slate-900">
                                {documentType || payload.kodeDokumen || 'BC 2.0'} -{' '}
                                {isExport ? 'PEMBERITAHUAN EKSPOR BARANG' : 'PEMBERITAHUAN IMPOR BARANG'}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-left text-xs text-slate-500">
                                Draft internal. Tombol kirim selalu memakai isFinal=false.
                            </DialogDescription>
                        </div>
                        <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-[560px]">
                            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-slate-500">Nomor Aju</div>
                                <div className="mt-1 font-semibold break-all text-slate-900">{nomorAju || payload.nomorAju || '-'}</div>
                            </div>
                            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-slate-500">Mode</div>
                                <div className="mt-1 font-semibold text-slate-900">Draft CEISA</div>
                            </div>
                            <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-slate-500">Kelengkapan</div>
                                <div className="mt-1 font-semibold text-slate-900">
                                    {completedCount}/{requirements.length} wajib
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="shrink-0 border-b border-slate-200 bg-white px-5">
                    <div className="flex gap-8 overflow-x-auto">
                        {tabConfig.map((tab) => {
                            const Icon = tab.icon;
                            const hasMissing = tabHasMissing(tab.key);

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex h-14 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium transition ${
                                        activeTab === tab.key
                                            ? 'border-blue-500 text-green-700'
                                            : hasMissing
                                              ? 'border-transparent text-rose-600 hover:text-rose-700'
                                              : 'border-transparent text-green-700 hover:text-green-800'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                    {tab.key !== 'advanced' &&
                                        (hasMissing ? (
                                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                        ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        ))}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="mx-auto max-w-[1500px]">
                        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_420px]">
                            <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                                Submit dari form ini hanya membuat/memperbarui draft CEISA. Final submit tetap dipisahkan nanti.
                            </div>
                            {missingRequirements.length > 0 && (
                                <div className="rounded-sm border border-amber-200 bg-white p-3">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                                        <AlertTriangle className="h-4 w-4" />
                                        Belum lengkap
                                    </div>
                                    <div className="grid gap-1 text-[11px] sm:grid-cols-2">
                                        {missingRequirements.slice(0, 8).map((item) => (
                                            <div key={`${item.group}-${item.label}`} className="font-medium text-amber-800">
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
                        </div>

                        {jsonError && (
                            <div className="mb-4 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                                JSON belum valid: {jsonError}
                            </div>
                        )}

                        {visibleWarnings.length > 0 && (
                            <div className="mb-4 rounded-sm border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Catatan sistem
                                </div>
                                <div className="space-y-1.5">
                                    {visibleWarnings.map((warning, index) => (
                                        <div key={`${warning}-${index}`} className="text-xs text-slate-500">
                                            {warning}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'header' && (
                            <div className="space-y-4">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className={portalPanelClass}>
                                        <div className={portalPanelHeaderClass}>Pengajuan</div>
                                        <div className={`${portalPanelBodyClass} space-y-4`}>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Nomor Aju')}
                                                <Input
                                                    value={payload.nomorAju || nomorAju || ''}
                                                    readOnly
                                                    className={`${inputClass} bg-slate-50 font-semibold`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Tanggal Aju')}
                                                <Input
                                                    type="date"
                                                    value={payload.tanggalAju || ''}
                                                    onChange={(e) => updateHeader('tanggalAju', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={portalPanelClass}>
                                        <div className={portalPanelHeaderClass}>Kantor Pabean</div>
                                        <div className={`${portalPanelBodyClass} space-y-4`}>
                                            {isExport ? (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Kantor Pabean Pemuatan', true)}
                                                        <Input
                                                            value={payload.kodeKantorMuat || payload.kodeKantor || ''}
                                                            onChange={(e) => updateHeader('kodeKantorMuat', e.target.value)}
                                                            className={inputClass}
                                                            placeholder="contoh 070100"
                                                        />
                                                    </div>
                                                    {renderPortReferenceField('kodePelEkspor', 'Pelabuhan Muat Ekspor', 'Cari/kode pelabuhan, contoh IDTPE')}
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Kantor Pabean Ekspor', true)}
                                                        <Input
                                                            value={payload.kodeKantorEkspor || payload.kodeKantor || ''}
                                                            onChange={(e) => updateHeader('kodeKantorEkspor', e.target.value)}
                                                            className={inputClass}
                                                            placeholder="contoh 070100"
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {renderPortReferenceField('kodePelTujuan', 'Pelabuhan Tujuan', 'Cari/kode pelabuhan, contoh IDTPE')}
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Kantor Pabean', true)}
                                                        <Input
                                                            value={payload.kodeKantor || ''}
                                                            readOnly
                                                            className={`${inputClass} bg-slate-50 font-semibold text-slate-900`}
                                                            placeholder="Terisi dari Pelabuhan Tujuan"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className={portalPanelClass}>
                                        <div className={portalPanelHeaderClass}>{isExport ? 'Keterangan Ekspor' : 'Keterangan Lain'}</div>
                                        <div className={`${portalPanelBodyClass} space-y-4`}>
                                            {isExport ? (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Jenis Ekspor', true)}
                                                        <select
                                                            value={payload.kodeJenisEkspor || '1'}
                                                            onChange={(e) => updateHeader('kodeJenisEkspor', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {jenisEksporOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Kategori Ekspor', true)}
                                                        <select
                                                            value={payload.kodeKategoriEkspor || '10'}
                                                            onChange={(e) => updateHeader('kodeKategoriEkspor', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {kategoriEksporOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Cara Perdagangan', true)}
                                                        <select
                                                            value={payload.kodeCaraDagang || '1'}
                                                            onChange={(e) => updateHeader('kodeCaraDagang', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {caraDagangOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Cara Pembayaran', true)}
                                                        <select
                                                            value={payload.kodeCaraBayar || '1'}
                                                            onChange={(e) => updateHeader('kodeCaraBayar', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {exportCaraBayarOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {String(payload.kodeCaraBayar || '1') === '9' && (
                                                        <div className="space-y-1.5">
                                                            {fieldLabel('Keterangan Pembayaran', true)}
                                                            <Input
                                                                value={payload.kodePembayar || ''}
                                                                onChange={(e) => updateHeader('kodePembayar', e.target.value)}
                                                                className={inputClass}
                                                                placeholder="Wajib jika cara bayar 9"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Komoditas', true)}
                                                        <select
                                                            value={payload.flagMigas || '2'}
                                                            onChange={(e) => updateHeader('flagMigas', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {komoditasOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Barang Kiriman', true)}
                                                        <select
                                                            value={payload.flagBarkir || 'T'}
                                                            onChange={(e) => updateHeader('flagBarkir', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            {barangKirimanOptions.map((item) => (
                                                                <option key={item.value} value={item.value}>
                                                                    {item.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {String(payload.flagBarkir || 'T') === 'T' && (
                                                        <div className="space-y-1.5">
                                                            {fieldLabel('Barang Curah', true)}
                                                            <select
                                                                value={payload.flagCurah || '2'}
                                                                onChange={(e) => updateHeader('flagCurah', e.target.value)}
                                                                className={selectClass}
                                                            >
                                                                {curahOptions.map((item) => (
                                                                    <option key={item.value} value={item.value}>
                                                                        {item.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {fieldLabel('Jenis PIB', true)}
                                                        <select
                                                            value={payload.kodeJenisPib || '1'}
                                                            onChange={(e) => updateHeader('kodeJenisPib', e.target.value)}
                                                            className={selectClass}
                                                        >
                                                            <option value="1">1 - Biasa</option>
                                                            <option value="2">2 - Berkala</option>
                                                        </select>
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
                                                        {fieldLabel('Cara Pembayaran', true)}
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
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'entities' && isExport && (
                            <div className="space-y-5">
                                <EntitySection title="Eksportir" required>
                                    <EntityFields
                                        entity={eksportir}
                                        onChange={(field, value) => updateEntity('2', field, value)}
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
                                        fields={['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nitku', 'nibEntitas']}
                                    />
                                </EntitySection>
                                <EntitySection title="Penerima" required>
                                    <EntityFields
                                        entity={penerima}
                                        onChange={(field, value) => updateEntity('8', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'kodeNegara']}
                                    />
                                </EntitySection>
                                <EntitySection title="Pembeli" required>
                                    <EntityFields
                                        entity={pembeli}
                                        onChange={(field, value) => updateEntity('6', field, value)}
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

                        {activeTab === 'entities' && !isExport && (
                            <div className="grid gap-4 xl:grid-cols-3">
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
                                <EntitySection title="NPWP Pemusatan" required>
                                    <EntityFields
                                        entity={pemusatan}
                                        onChange={(field, value) => updateEntity('11', field, value)}
                                        fields={['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nitku']}
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
                            <div className={portalPanelClass}>
                                <div className={`${portalPanelHeaderClass} flex items-center justify-between gap-3`}>
                                    <span>Dokumen Lampiran</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addDocument(isExport ? '343' : '380')}
                                        className="h-8 gap-2 rounded-lg text-[11px] font-bold"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Tambah
                                    </Button>
                                </div>

                                <div className={`${portalPanelBodyClass} overflow-x-auto`}>
                                    <div className="min-w-[760px] border border-slate-200">
                                        <div className="grid grid-cols-[70px_220px_1fr_180px_56px] bg-[#f4fbfb] px-4 py-3 text-xs font-semibold text-slate-700">
                                            <div>Seri</div>
                                            <div>Jenis</div>
                                            <div>Nomor</div>
                                            <div>Tanggal</div>
                                            <div />
                                        </div>
                                    {dokumen.map((row: any, index: number) => (
                                        <div
                                            key={`${row.kodeDokumen}-${index}`}
                                                className="grid grid-cols-[70px_220px_1fr_180px_56px] items-end gap-3 border-t border-slate-200 px-4 py-3"
                                        >
                                                <div className="pb-2 text-xs text-slate-600">{row.seriDokumen || index + 1}</div>
                                                <div className="space-y-1.5">
                                                {fieldLabel('Jenis', requiredDocumentCodes.includes(row.kodeDokumen))}
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
                                                    {fieldLabel('Nomor', requiredDocumentCodes.includes(row.kodeDokumen))}
                                                <Input
                                                    value={row.nomorDokumen || ''}
                                                    onChange={(e) => updateDocument(index, 'nomorDokumen', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                    {fieldLabel('Tanggal', requiredDocumentCodes.includes(row.kodeDokumen))}
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
                            </div>
                        )}

                        {activeTab === 'transport' && (
                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>{isExport ? 'Jadwal & Pemeriksaan' : 'BC 1.1'}</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        {isExport ? (
                                            <>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Tanggal Perkiraan Ekspor', true)}
                                                    <Input
                                                        type="date"
                                                        value={payload.tanggalEkspor || ''}
                                                        onChange={(e) => updateHeader('tanggalEkspor', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Lokasi Pemeriksaan', true)}
                                                    <select
                                                        value={payload.kodeLokasi || '2'}
                                                        onChange={(e) => updateHeader('kodeLokasi', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {lokasiPemeriksaanOptions.map((item) => (
                                                            <option key={item.value} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Tanggal Periksa', true)}
                                                    <Input
                                                        type="date"
                                                        value={payload.tanggalPeriksa || payload.tanggalEkspor || ''}
                                                        onChange={(e) => updateHeader('tanggalPeriksa', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Kantor Pabean Pemeriksaan', true)}
                                                    <Input
                                                        value={payload.kodeKantorPeriksa || payload.kodeKantor || ''}
                                                        onChange={(e) => updateHeader('kodeKantorPeriksa', e.target.value)}
                                                        className={inputClass}
                                                        placeholder="contoh 070100"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Nomor Tutup PU', true)}
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
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Tanggal Tiba', true)}
                                                    <Input
                                                        type="date"
                                                        value={payload.tanggalTiba || ''}
                                                        onChange={(e) => updateHeader('tanggalTiba', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Pengangkutan</div>
                                    <div className={`${portalPanelBodyClass} grid gap-3 md:grid-cols-2`}>
                                        {isExport && (
                                            <div className="space-y-1.5 md:col-span-2">
                                                {fieldLabel('Jenis Pengangkutan', true)}
                                                <select
                                                    value={payload.kodeJenisPengangkutan || '1'}
                                                    onChange={(e) => updateHeader('kodeJenisPengangkutan', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    {jenisPengangkutanOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            {fieldLabel('Cara Pengangkutan', true)}
                                            <select
                                                value={transport.kodeCaraAngkut || '1'}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'kodeCaraAngkut', e.target.value)}
                                                className={selectClass}
                                            >
                                                {jenisPengangkutanOptions.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            {fieldLabel('Nama Sarana Pengangkut', true)}
                                            <Input
                                                value={transport.namaPengangkut || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'namaPengangkut', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Voyage / Flight', true)}
                                            <Input
                                                value={transport.nomorPengangkut || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'nomorPengangkut', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Bendera', true)}
                                            <Input
                                                value={transport.kodeBendera || ''}
                                                onChange={(e) => updateFirstArrayRow('pengangkut', 'kodeBendera', e.target.value.toUpperCase())}
                                                className={inputClass}
                                                placeholder="ID"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Pelabuhan & Tempat Penimbunan</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        {renderPortReferenceField(
                                            'kodePelMuat',
                                            isExport ? 'Pelabuhan Muat Asal' : 'Pelabuhan Muat',
                                            'Cari/kode pelabuhan, contoh IDTPE',
                                        )}
                                        {!isExport && (
                                            <div className="space-y-1.5">
                                                {fieldLabel('Pelabuhan Tujuan', true)}
                                                <Input
                                                    value={payload.kodePelTujuan || ''}
                                                    readOnly
                                                    className={`${inputClass} bg-slate-50 font-semibold text-slate-900`}
                                                    placeholder="Diatur dari Header"
                                                />
                                            </div>
                                        )}
                                        {isExport && (
                                            <>
                                                {renderPortReferenceField('kodePelTujuan', 'Pelabuhan Tujuan', 'Cari/kode pelabuhan, contoh SAJED')}
                                                {renderPortReferenceField('kodePelBongkar', 'Pelabuhan Bongkar', 'Cari/kode pelabuhan, contoh SAJED')}
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Negara Tujuan Ekspor', true)}
                                                    <select
                                                        value={payload.kodeNegaraTujuan || ''}
                                                        onChange={(e) => updateHeader('kodeNegaraTujuan', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {countryOptions.map((item) => (
                                                            <option key={item.value || 'empty'} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        <div className="space-y-1.5">
                                            {fieldLabel('Tempat Penimbunan', true)}
                                            <Input
                                                value={payload.kodeTps || ''}
                                                onChange={(e) => updateHeader('kodeTps', e.target.value.toUpperCase())}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isExport && (
                                    <div className={portalPanelClass}>
                                        <div className={portalPanelHeaderClass}>Kesiapan Barang</div>
                                        <div className={`${portalPanelBodyClass} grid gap-3 md:grid-cols-2`}>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Jenis Barang', true)}
                                                <select
                                                    value={kesiapanBarangRow.kodeJenisBarang || '1'}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'kodeJenisBarang', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    <option value="1">1 - Barang Ekspor Gabungan</option>
                                                    <option value="2">2 - Bahan/Barang Asal Impor Fasilitas</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Jenis Gudang', true)}
                                                <select
                                                    value={kesiapanBarangRow.kodeJenisGudang || '2'}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'kodeJenisGudang', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    {jenisGudangOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Nama PIC', true)}
                                                <Input
                                                    value={kesiapanBarangRow.namaPic || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'namaPic', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Telepon PIC', true)}
                                                <Input
                                                    value={kesiapanBarangRow.nomorTelpPic || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'nomorTelpPic', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                {fieldLabel('Alamat Siap Periksa', true)}
                                                <Textarea
                                                    value={kesiapanBarangRow.alamat || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'alamat', e.target.value)}
                                                    className={`${inputClass} min-h-20`}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Lokasi Siap Periksa', true)}
                                                <Input
                                                    value={kesiapanBarangRow.lokasiSiapPeriksa || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'lokasiSiapPeriksa', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Cara Stuffing', true)}
                                                <select
                                                    value={kesiapanBarangRow.kodeCaraStuffing || '7'}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'kodeCaraStuffing', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    {caraStuffingOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Tanggal PKB', true)}
                                                <Input
                                                    type="date"
                                                    value={kesiapanBarangRow.tanggalPkb || payload.tanggalPeriksa || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'tanggalPkb', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Waktu Siap Periksa')}
                                                <Input
                                                    value={kesiapanBarangRow.waktuSiapPeriksa || ''}
                                                    onChange={(e) => updateFirstArrayRow('kesiapanBarang', 'waktuSiapPeriksa', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="YYYY-MM-DDT08:00:00.000Z"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'packaging' && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Kemasan</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        <div className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 border border-slate-200 bg-[#f4fbfb] px-4 py-3 text-xs font-semibold text-slate-700">
                                            <div>Seri</div>
                                            <div>Jumlah</div>
                                            <div>Jenis</div>
                                            <div>Merek</div>
                                        </div>
                                        <div className="grid grid-cols-[70px_1fr_1fr_1fr] items-end gap-3 border border-t-0 border-slate-200 px-4 py-3">
                                            <div className="pb-2 text-xs text-slate-600">{packageRow.seriKemasan || 1}</div>
                                        <div className="space-y-1.5">
                                                {fieldLabel('Jumlah', true)}
                                            <Input
                                                type="number"
                                                value={packageRow.jumlahKemasan ?? 1}
                                                onChange={(e) => updateFirstArrayRow('kemasan', 'jumlahKemasan', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                                {fieldLabel('Jenis', true)}
                                                <select
                                                    value={packageRow.kodeJenisKemasan || 'PK'}
                                                    onChange={(e) => updateFirstArrayRow('kemasan', 'kodeJenisKemasan', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    {kemasanOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Merek')}
                                            <Input
                                                value={packageRow.merkKemasan || ''}
                                                onChange={(e) => updateFirstArrayRow('kemasan', 'merkKemasan', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                                </div>

                                <div className={portalPanelClass}>
                                    <div className={`${portalPanelHeaderClass} flex items-center justify-between gap-3`}>
                                        <span>Peti Kemas</span>
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
                                    <div className={`${portalPanelBodyClass} space-y-3`}>
                                        {kontainer.length === 0 && (
                                            <div className="border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                                Belum ada kontainer.
                                            </div>
                                        )}
                                        {kontainer.map((row: any, index: number) => (
                                            <div
                                                key={index}
                                                className="grid gap-3 border border-slate-200 p-3 md:grid-cols-[70px_1fr_140px_140px_160px_40px]"
                                            >
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Seri')}
                                                    <Input value={row.seriKontainer || index + 1} readOnly className={`${inputClass} bg-slate-50`} />
                                                </div>
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
                                                        {kontainerUkuranOptions.map((item) => (
                                                            <option key={item.value} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Jenis Muatan')}
                                                    <select
                                                        value={row.kodeJenisKontainer || '8'}
                                                        onChange={(e) => updateKontainer(index, 'kodeJenisKontainer', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {caraStuffingOptions.map((item) => (
                                                            <option key={item.value} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Tipe')}
                                                    <select
                                                        value={row.kodeTipeKontainer || '1'}
                                                        onChange={(e) => updateKontainer(index, 'kodeTipeKontainer', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {kontainerTipeOptions.map((item) => (
                                                            <option key={item.value} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
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

                        {activeTab === 'transaction' && (
                            <div className="grid gap-4 lg:grid-cols-3">
                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Harga</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jenis Valuta', true)}
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
                                            {fieldLabel('NDPBM', true)}
                                            <div className="grid grid-cols-[1fr_auto] gap-2">
                                                <Input
                                                    type="number"
                                                    value={payload.ndpbm ?? 0}
                                                    onChange={(e) => updateHeader('ndpbm', numberValue(e.target.value))}
                                                    className={inputClass}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={lookupKurs}
                                                    disabled={!referenceEndpoint || isLookingUpKurs || !payload.kodeValuta}
                                                    className="h-9 rounded-sm px-3 text-xs font-semibold"
                                                >
                                                    {isLookingUpKurs ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Ambil Kurs'}
                                                </Button>
                                            </div>
                                            {kursLookupMessage && <div className="text-[11px] text-slate-500">{kursLookupMessage}</div>}
                                        </div>
                                        {!isExport && (
                                            <div className="space-y-1.5">
                                                {fieldLabel('Jenis Transaksi')}
                                                <select
                                                    value={payload.kodeJenisNilai || 'LAI'}
                                                    onChange={(e) => updateHeader('kodeJenisNilai', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    <option value="">Pilih</option>
                                                    {jenisTransaksiOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            {fieldLabel('Harga Barang / Incoterm', true)}
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
                                            {fieldLabel(isExport ? 'Nilai Ekspor' : 'Nilai Pabean Valuta Asing', true)}
                                            <Input
                                                type="number"
                                                value={payload.cif ?? 0}
                                                onChange={(e) => updateHeader('cif', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Biaya Lainnya</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
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
                                            <div className="grid grid-cols-[1fr_1fr] gap-2">
                                                <select
                                                    value={payload.kodeAsuransi || 'LN'}
                                                    onChange={(e) => updateHeader('kodeAsuransi', e.target.value)}
                                                    className={selectClass}
                                                >
                                                    <option value="LN">Luar Negeri</option>
                                                    <option value="DN">Dalam Negeri</option>
                                                </select>
                                                <Input
                                                    type="number"
                                                    value={payload.asuransi ?? 0}
                                                    onChange={(e) => updateHeader('asuransi', numberValue(e.target.value))}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Biaya Tambahan')}
                                            <Input
                                                type="number"
                                                value={payload.biayaTambahan ?? 0}
                                                onChange={(e) => updateHeader('biayaTambahan', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Biaya Pengurang')}
                                            <Input
                                                type="number"
                                                value={payload.biayaPengurang ?? 0}
                                                onChange={(e) => updateHeader('biayaPengurang', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Berat</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Berat Kotor (KGM)', true)}
                                            <Input
                                                type="number"
                                                value={payload.bruto ?? 0}
                                                onChange={(e) => updateHeader('bruto', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Berat Bersih (KGM)', true)}
                                            <Input
                                                type="number"
                                                value={payload.netto ?? 0}
                                                onChange={(e) => updateHeader('netto', numberValue(e.target.value))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                                            Nilai CIF otomatis dihitung dari FOB + Freight + Asuransi. Tetap bisa dioverride kalau angka dari dokumen
                                            berbeda.
                                        </div>
                                    </div>
                                </div>
                                {isExport && (
                                    <div className={portalPanelClass}>
                                        <div className={portalPanelHeaderClass}>Bank Devisa</div>
                                        <div className={`${portalPanelBodyClass} space-y-4`}>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Kode Bank', true)}
                                                <Input
                                                    value={bankDevisaRow.kodeBank || '9'}
                                                    onChange={(e) => updateFirstArrayRow('bankDevisa', 'kodeBank', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="contoh 9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                {fieldLabel('Nama Bank')}
                                                <Input
                                                    value={bankDevisaRow.namaBank || ''}
                                                    onChange={(e) => updateFirstArrayRow('bankDevisa', 'namaBank', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'goods' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-800">Barang</div>
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
                                        <div key={index} className={portalPanelClass}>
                                            <div className={`${portalPanelHeaderClass} flex items-center justify-between gap-3`}>
                                                <div>Barang {index + 1}</div>
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
                                            <div className={`${portalPanelBodyClass} grid gap-3 md:grid-cols-4`}>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Pos Tarif/HS', true)}
                                                    <Input
                                                        value={row.posTarif || ''}
                                                        onChange={(e) => updateBarang(index, 'posTarif', e.target.value.replace(/\D/g, ''))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Kode Barang')}
                                                    <Input
                                                        value={row.kodeBarang || ''}
                                                        onChange={(e) => updateBarang(index, 'kodeBarang', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    {fieldLabel('Uraian Jenis Barang', true)}
                                                    <Textarea
                                                        value={row.uraian || ''}
                                                        onChange={(e) => updateBarang(index, 'uraian', e.target.value)}
                                                        className={`${inputClass} min-h-20`}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Negara Asal', true)}
                                                    <select
                                                        value={row.kodeNegaraAsal || ''}
                                                        onChange={(e) => updateBarang(index, 'kodeNegaraAsal', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {countryOptions.map((item) => (
                                                            <option key={item.value || 'empty'} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Jumlah Satuan', true)}
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
                                                    {fieldLabel('Jumlah Kemasan', true)}
                                                    <Input
                                                        type="number"
                                                        value={row.jumlahKemasan ?? packageRow.jumlahKemasan ?? 1}
                                                        onChange={(e) => updateBarang(index, 'jumlahKemasan', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Kode Jenis Kemasan', true)}
                                                    <select
                                                        value={row.kodeJenisKemasan || packageRow.kodeJenisKemasan || 'PK'}
                                                        onChange={(e) => updateBarang(index, 'kodeJenisKemasan', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        {kemasanOptions.map((item) => (
                                                            <option key={item.value} value={item.value}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Harga Invoice')}
                                                    <Input
                                                        type="number"
                                                        value={row.hargaSatuan ?? 0}
                                                        onChange={(e) => updateBarang(index, 'hargaSatuan', numberValue(e.target.value))}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Berat Bersih (Kg)')}
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
                                                    {fieldLabel('Metode Penentuan Nilai Pabean', true)}
                                                    <select
                                                        value={row.metodePenentuanNilai || 'Metode 1'}
                                                        onChange={(e) => updateBarang(index, 'metodePenentuanNilai', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        <option value="Metode 1">Metode 1</option>
                                                        <option value="Metode 2">Metode 2</option>
                                                        <option value="Metode 3">Metode 3</option>
                                                        <option value="Metode 4">Metode 4</option>
                                                        <option value="Metode 5">Metode 5</option>
                                                        <option value="Metode 6">Metode 6</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Alasan')}
                                                    <Input
                                                        value={row.alasanMetodePenentuanNilai || ''}
                                                        onChange={(e) => updateBarang(index, 'alasanMetodePenentuanNilai', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Kondisi Barang', true)}
                                                    <select
                                                        value={row.kodeKondisiBarang || '1'}
                                                        onChange={(e) => updateBarang(index, 'kodeKondisiBarang', e.target.value)}
                                                        className={selectClass}
                                                    >
                                                        <option value="1">1 - Baru</option>
                                                        <option value="2">2 - Bekas</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Merek', true)}
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
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Ukuran')}
                                                    <Input
                                                        value={row.ukuran || ''}
                                                        onChange={(e) => updateBarang(index, 'ukuran', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    {fieldLabel('Spesifikasi Lain')}
                                                    <Input
                                                        value={row.spesifikasiLain || ''}
                                                        onChange={(e) => updateBarang(index, 'spesifikasiLain', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'statement' && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Pernyataan</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Kota TTD', true)}
                                            <Input
                                                value={payload.kotaTtd || ''}
                                                onChange={(e) => updateHeader('kotaTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Nama TTD', true)}
                                            <Input
                                                value={payload.namaTtd || ''}
                                                onChange={(e) => updateHeader('namaTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Jabatan TTD', true)}
                                            <Input
                                                value={payload.jabatanTtd || ''}
                                                onChange={(e) => updateHeader('jabatanTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {fieldLabel('Tanggal TTD', true)}
                                            <Input
                                                type="date"
                                                value={payload.tanggalTtd || ''}
                                                onChange={(e) => updateHeader('tanggalTtd', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={portalPanelClass}>
                                    <div className={portalPanelHeaderClass}>Disclaimer</div>
                                    <div className={`${portalPanelBodyClass} space-y-4`}>
                                        <label className="flex items-start gap-3 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={String(payload.disclaimer || '1') === '1'}
                                                onChange={(e) => updateHeader('disclaimer', e.target.checked ? '1' : '0')}
                                                className="mt-1"
                                            />
                                            <span>Data draft sudah dicek berdasarkan dokumen customer dan siap dikirim sebagai draft CEISA.</span>
                                        </label>
                                        <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                            Ini bukan final submit. Setelah draft berhasil, status dapat dicek dengan nomor aju yang sama.
                                        </div>
                                    </div>
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

                <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 bg-white px-6 py-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-sm">
                        Tutup
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onRegenerate}
                        disabled={isPreparing || isSubmitting}
                        className="gap-2 rounded-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPreparing ? 'animate-spin' : ''}`} />
                        Nomor Baru
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={isPreparing || isSubmitting || !payloadText || !!jsonError || missingRequirements.length > 0}
                        className="gap-2 rounded-sm bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
        <div className={portalPanelClass}>
            <div className={`${portalPanelHeaderClass} flex items-center gap-2`}>
                {title}
                {required && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">Wajib</span>}
            </div>
            <div className={portalPanelBodyClass}>{children}</div>
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
        <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
                <div key={field} className={`space-y-1.5 ${field === 'alamatEntitas' ? 'sm:col-span-2' : ''}`}>
                    {fieldLabel(
                        labels[field] || field,
                        ['namaEntitas', 'alamatEntitas', 'nomorIdentitas', 'nibEntitas', 'kodeNegara'].includes(field),
                    )}
                    {field === 'kodeNegara' ? (
                        <select value={entity?.[field] || ''} onChange={(event) => onChange(field, event.target.value)} className={selectClass}>
                            {countryOptions.map((item) => (
                                <option key={item.value || 'empty'} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <Input value={entity?.[field] || ''} onChange={(event) => onChange(field, event.target.value)} className={inputClass} />
                    )}
                </div>
            ))}
        </div>
    );
}
