<?php

namespace App\Services;

use App\Models\Spk;
use App\Models\Tenant;
use App\Models\Perusahaan;
use App\Models\DocumentTrans;
use App\Models\MasterDocumentTrans;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class ShippingPdfService
{
    /**
     * Build Shipping PDF (Overview or Template)
     */
    public function build(Spk $spk, Tenant $tenant, $user, ?int $idPerusahaan, bool $template, bool $karantina): array
    {
        Log::info("📄 Mulai generate PDF report shipping untuk SPK ID: {$spk->id}");

        $companyName = '-';
        $companyLogoPath = null;

        if ($idPerusahaan) {
            $perusahaan = Perusahaan::on('tako-user')
                ->where('id_perusahaan', $idPerusahaan)
                ->first();

            if ($perusahaan) {
                $companyName = $perusahaan->nama_perusahaan ?? '-';
            }

            $domainRecord = DB::connection('tako-user')
                ->table('domains')
                ->where('tenant_id', $tenant->id)
                ->first();

            $logoPath = $domainRecord->path_company_logo ?? null;

            if ($logoPath) {
                $cleanLogoPath = ltrim($logoPath, '/');
                $possiblePaths = [
                    public_path('storage/' . $cleanLogoPath),
                    public_path($cleanLogoPath),
                    base_path('public/storage/' . $cleanLogoPath),
                    base_path('storage/app/public/' . $cleanLogoPath),
                ];

                foreach ($possiblePaths as $path) {
                    if (file_exists($path)) {
                        $companyLogoPath = $path;
                        break;
                    }
                }
            }
        }

        $printableDocIds = MasterDocumentTrans::query()
            ->where('is_print', true)
            ->pluck('id_dokumen')
            ->toArray();

        $printableDocIds = array_map('intval', $printableDocIds);

        $rawDocuments = DocumentTrans::query()
            ->where('id_spk', $spk->id)
            ->orderBy('id_section', 'asc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($doc) use ($printableDocIds) {
                $updatedAt = $doc->updated_at ? Carbon::parse($doc->updated_at) : null;
                $uploadDate = !empty($doc->upload_date) ? Carbon::parse($doc->upload_date) : null;
                $verifiedDate = !empty($doc->verified_date) ? Carbon::parse($doc->verified_date) : null;
                $oriDate = !empty($doc->ori_date) ? Carbon::parse($doc->ori_date) : null;

                $docId = $doc->id_dokumen ? (int) $doc->id_dokumen : null;
                $isPrint = $docId !== null && in_array($docId, $printableDocIds, true);

                return (object) [
                    'id' => $doc->id,
                    'id_dokumen' => $doc->id_dokumen ?? null,
                    'id_spk' => $doc->id_spk,
                    'id_section' => $doc->id_section,
                    'section_name' => $doc->section_name ?? ('Section ' . $doc->id_section),
                    'nama_file' => $doc->nama_file ?? '-',
                    'url_path_file' => $doc->url_path_file,
                    'verify' => $doc->verify,
                    'is_updated' => !empty($doc->url_path_file),
                    'is_print' => $isPrint,
                    'updated_at' => $updatedAt ? $updatedAt->format('d-m-Y') : '-',
                    'updated_at_full' => $updatedAt ? $updatedAt->format('d-m-Y H:i') . ' WIB' : null,
                    'updated_at_timestamp' => $updatedAt ? $updatedAt->timestamp : 0,
                    'upload_date' => $uploadDate ? $uploadDate->format('d-m-Y') : '-',
                    'upload_date_full' => $uploadDate ? $uploadDate->format('d-m-Y H:i') . ' WIB' : null,
                    'verified_date' => $verifiedDate ? $verifiedDate->format('d-m-Y') : '-',
                    'verified_date_full' => $verifiedDate ? $verifiedDate->format('d-m-Y H:i') . ' WIB' : null,
                    'ori_date' => $oriDate ? $oriDate->format('d-m-Y') : '-',
                    'ori_date_full' => $oriDate ? $oriDate->format('d-m-Y H:i') . ' WIB' : null,
                ];
            });

        $groupedDocuments = collect($rawDocuments)
            ->groupBy(function ($doc) {
                return $doc->id_dokumen !== null
                    ? (string) $doc->id_dokumen
                    : ($doc->section_name . '|' . $doc->nama_file);
            })
            ->map(function ($group) {
                $sorted = collect($group)->sortByDesc(function ($item) {
                    return $item->updated_at_timestamp ?? 0;
                })->values();

                return (object) [
                    'current' => $sorted->first(),
                    'history' => $sorted,
                ];
            });

        if ($template && $karantina) {
            $groupedDocuments = $groupedDocuments->filter(function ($item) {
                return $item->current && $item->current->is_print === true;
            });
        } elseif ($template && !$karantina) {
            $groupedDocuments = $groupedDocuments->filter(function ($item) {
                return $item->current
                    && $item->current->is_print === true
                    && (int) $item->current->id_section !== 7;
            });
        }

        $groupedDocuments = $groupedDocuments->values();
        $documents = $groupedDocuments->map(function ($item) {
            return $item->current;
        })->values();

        $totalDocs = $groupedDocuments->count();
        $verifiedCount = $groupedDocuments->filter(function ($item) {
            return $item->current && $item->current->verify === true;
        })->count();
        $pendingCount = $groupedDocuments->filter(function ($item) {
            return !$item->current || $item->current->verify !== true;
        })->count();
        $updatedCount = $groupedDocuments->filter(function ($item) {
            return $item->current && $item->current->is_updated === true;
        })->count();

        $progressPercentage = $totalDocs === 0 ? 0 : round(($verifiedCount / $totalDocs) * 100);
        $generatedAt = now()->format('d-m-Y H:i');

        $party = $spk->parties->map(function ($p) {
            if ($p->party_type === 'LCL') {
                return "{$p->party_qty} {$p->party_size} (LCL)";
            }
            if ($p->party_type === 'FCL') {
                $cleanCategory = $p->party_category ? preg_replace('/^\d+\s*-\s*/', '', $p->party_category) : '';
                $category = $cleanCategory ? " {$cleanCategory}" : '';
                return "{$p->party_qty} x {$p->party_size}{$category} (FCL)";
            }
            return null;
        })->filter()->implode(', ');

        $view = $template ? 'pdf.shipping-template' : 'pdf.shipping-report';

        $pdf = Pdf::loadView($view, [
            'spk' => $spk,
            'documents' => $documents,
            'groupedDocuments' => $groupedDocuments,
            'generated_by' => is_object($user) ? ($user->name ?? 'Guest') : (is_array($user) ? ($user['name'] ?? 'Guest') : ($user ?? 'Guest')),
            'generated_at' => $generatedAt,
            'totalDocs' => $totalDocs,
            'verifiedCount' => $verifiedCount,
            'pendingCount' => $pendingCount,
            'updatedCount' => $updatedCount,
            'progressPercentage' => $progressPercentage,
            'party' => $party,
            'companyName' => $companyName,
            'companyLogoPath' => $companyLogoPath,
            'template' => $template,
            'karantina' => $karantina,
        ])->setPaper('a4', 'portrait');

        Log::info("✅ Generate PDF report shipping selesai untuk SPK: {$spk->spk_code}");

        $filename = $template
            ? ($karantina ? "SPK-Karantina-{$spk->spk_code}.pdf" : "SPK-Non-Karantina-{$spk->spk_code}.pdf")
            : "SPK-Overview-{$spk->spk_code}.pdf";

        return [$pdf, $filename];
    }
}
