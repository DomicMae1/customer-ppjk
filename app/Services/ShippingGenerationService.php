<?php

namespace App\Services;

use App\Models\DocumentStatus;
use App\Models\DocumentTrans;
use App\Models\MasterDocumentTrans;
use App\Models\MasterSectionTrans;
use App\Models\SectionTrans;
use App\Models\ShippingPackage;
use App\Models\ShippingPackageDocument;
use App\Models\Spk;
use Illuminate\Support\Str;

class ShippingGenerationService
{
    public function generateInitialRules(
        Spk $spk,
        ?ShippingPackage $package,
        array $selectedChecklistIds,
        int $userId,
        string $userName
    ): void {
        if ($package) {
            $this->generateFromPackage($spk, $package, $userId, $userName);
            return;
        }

        $this->generateLegacyMandatoryRules($spk, $selectedChecklistIds, $userId, $userName);
    }

    private function generateFromPackage(Spk $spk, ShippingPackage $package, int $userId, string $userName): void
    {
        $package->loadMissing(['sections.documents.masterDocument']);

        foreach ($package->sections as $packageSection) {
            SectionTrans::create([
                'id_section' => $packageSection->id_section,
                'id_spk' => $spk->id,
                'section_name' => $packageSection->section_name_snapshot,
                'section_order' => $packageSection->section_order,
                'deadline' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($packageSection->documents as $packageDocument) {
                $masterDocument = $packageDocument->masterDocument;
                $sectionName = $packageSection->section_name_snapshot ?: 'Unknown Section';

                $this->createRequestedDocument(
                    $spk,
                    $packageDocument,
                    $masterDocument,
                    $packageSection->id_section,
                    $sectionName,
                    $userId,
                    $userName
                );
            }
        }
    }

    private function generateLegacyMandatoryRules(Spk $spk, array $selectedChecklistIds, int $userId, string $userName): void
    {
        $masterSections = MasterSectionTrans::where(function ($q) use ($selectedChecklistIds) {
            $q->where(function ($sq) {
                $sq->where('is_checklist', false)
                    ->where('id_section', '!=', 6)
                    ->where('attribute_section', true);
            })
                ->orWhereIn('id_section', $selectedChecklistIds);
        })
            ->where('id_section', '!=', 6)
            ->orderBy('section_order', 'asc')
            ->get();

        foreach ($masterSections as $masterSection) {
            SectionTrans::create([
                'id_section' => $masterSection->id_section,
                'id_spk' => $spk->id,
                'section_name' => $masterSection->section_name,
                'section_order' => $masterSection->section_order,
                'deadline' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $allowedSectionIds = $masterSections->pluck('id_section')->toArray();
        $mandatoryColumn = $spk->shipment_type === 'Import' ? 'import_mandatory' : 'export_mandatory';

        $mandatoryDocuments = MasterDocumentTrans::where('is_active', true)
            ->where($mandatoryColumn, true)
            ->whereIn('id_section', $allowedSectionIds)
            ->orderBy('id_dokumen', 'asc')
            ->get()
            ->unique(function ($document) {
                return $document->id_section . '|' . Str::lower(trim($document->nama_file));
            })
            ->sortBy([
                ['id_section', 'asc'],
                ['id_dokumen', 'asc'],
            ])
            ->values();

        $sectionNames = $masterSections->keyBy('id_section');

        foreach ($mandatoryDocuments as $document) {
            $sectionName = $sectionNames->get($document->id_section)?->section_name ?? 'Unknown Section';

            $this->createRequestedDocument(
                $spk,
                null,
                $document,
                $document->id_section,
                $sectionName,
                $userId,
                $userName
            );
        }
    }

    private function createRequestedDocument(
        Spk $spk,
        ?ShippingPackageDocument $packageDocument,
        ?MasterDocumentTrans $masterDocument,
        int $idSection,
        string $sectionName,
        int $userId,
        string $userName
    ): void {
        $documentName = $masterDocument?->nama_file ?? $packageDocument?->nama_file_snapshot ?? 'Document';
        $documentId = $masterDocument?->id_dokumen ?? $packageDocument?->id_dokumen;
        $logMessage = "Document {$sectionName} requested " . now()->format('d-m-Y H:i') . " WIB";

        $newDocument = DocumentTrans::create([
            'id_spk' => $spk->id,
            'id_dokumen' => $documentId,
            'id_section' => $idSection,
            'nama_file' => $documentName,
            'is_internal' => $masterDocument?->is_internal ?? false,
            'is_verification' => $masterDocument?->is_verification ?? true,
            'url_path_file' => null,
            'verify' => false,
            'correction_attachment' => false,
            'kuota_revisi' => $masterDocument?->kuota_revisi ?: 3,
            'mapping_insw' => $masterDocument?->mapping_insw,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DocumentStatus::create([
            'id_dokumen_trans' => $newDocument->id,
            'status' => $logMessage,
            'by' => $userName,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
