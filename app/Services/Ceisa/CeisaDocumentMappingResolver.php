<?php

namespace App\Services\Ceisa;

use App\Models\CeisaDocumentMapping;
use Illuminate\Support\Str;

class CeisaDocumentMappingResolver
{
    public function shouldIncludeInDraft(?CeisaDocumentMapping $mapping, string $name): bool
    {
        return $this->usageFor($mapping, $name) === CeisaDocumentMapping::DRAFT_USAGE_INCLUDE;
    }

    public function codeFor(?CeisaDocumentMapping $mapping, string $name): ?string
    {
        $code = trim((string) ($mapping?->ceisa_document_code ?? ''));

        return $code !== '' ? $code : $this->fallbackCode($name);
    }

    public function usageFor(?CeisaDocumentMapping $mapping, string $name): string
    {
        $usage = trim((string) ($mapping?->draft_usage ?? ''));

        return $usage !== '' ? $usage : $this->fallbackUsage($name);
    }

    public function fallbackUsage(string $name): string
    {
        $normalized = $this->normalize($name);

        if (Str::contains($normalized, [
            'draft pib',
            'draft peb',
            'pib peb confirm',
            'pib confirm',
            'peb confirm',
            'id billing',
            'billing',
            'bukti penerimaan negara',
            'bpn',
            'nopen',
            'spjm',
            'ppb',
            'sppb',
            'npe',
        ])) {
            return CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT;
        }

        if (Str::contains($normalized, [
            'invoice do',
            'surat kuasa',
            'surrender',
            'release do',
            'pinjam container',
            'additional memo',
            'pernyataan keterlambatan',
        ])) {
            return CeisaDocumentMapping::DRAFT_USAGE_IGNORE;
        }

        return CeisaDocumentMapping::DRAFT_USAGE_INCLUDE;
    }

    public function fallbackCode(string $name): ?string
    {
        $normalized = $this->normalize($name);

        if (preg_match('/\bbl\b/', $normalized)) {
            return '705';
        }

        return match (true) {
            Str::contains($normalized, ['master awb']) => '741',
            Str::contains($normalized, ['awb']) => '740',
            Str::contains($normalized, ['master b l', 'master bl']) => '704',
            Str::contains($normalized, ['bill of lading', 'b l', 'bl ', ' konosemen', 'konosemen']) => '705',
            Str::contains($normalized, ['packing list', 'packing declaration', 'packing']) => '217',
            Str::contains($normalized, ['invoice', 'commercial invoice']) => '380',
            Str::contains($normalized, ['sales contract', 'purchase order', 'kontrak']) => '315',
            Str::contains($normalized, ['shipping order', 'shiping order']) => '343',
            Str::contains($normalized, ['delivery order']) => '640',
            Str::contains($normalized, ['e co', 'coo fasilitas']) => '860',
            Str::contains($normalized, ['certificate of origin', 'coo', 'co non fasilitas']) => '861',
            Str::contains($normalized, ['laporan surveyor', 'surveyor']) => '958',
            Str::contains($normalized, ['persetujuan impor']) => '959',
            Str::contains($normalized, ['fumigasi', 'fumigation']) => '857',
            Str::contains($normalized, ['phytosanitary', 'phyto', 'karantina tanaman']) => '851',
            Str::contains($normalized, ['health certificate', 'karantina hewan', 'karantina ikan']) => '853',
            Str::contains($normalized, ['certificate of analysis', 'coa', 'hasil lab']) => '961',
            Str::contains($normalized, ['rekomendasi menteri pertanian']) => '993',
            Str::contains($normalized, ['asuransi', 'insurance', 'certificate halal', 'halal', 'weight certificate', 'prior notice', 'perka', 'skep', 'sp2mp', 'pemindahan media pembawa', 'product catalog', 'sertifikat pelepasan', 'setifikat pelepasan']) => '999',
            default => null,
        };
    }

    private function normalize(string $name): string
    {
        $normalized = Str::lower($name);
        $normalized = str_replace(['/', '-', '_', '.', '(', ')'], ' ', $normalized);

        return preg_replace('/\s+/', ' ', trim($normalized)) ?: '';
    }
}
