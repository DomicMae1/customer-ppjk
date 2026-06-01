<?php

use App\Models\CeisaDocumentMapping;
use App\Services\Ceisa\CeisaDocumentMappingResolver;

test('it maps common import supporting documents to ceisa document codes', function (string $name, string $expectedCode) {
    $resolver = new CeisaDocumentMappingResolver;

    expect($resolver->fallbackUsage($name))
        ->toBe(CeisaDocumentMapping::DRAFT_USAGE_INCLUDE)
        ->and($resolver->fallbackCode($name))
        ->toBe($expectedCode);
})->with([
    ['Invoice', '380'],
    ['Shipping Instruction', '343'],
    ['SI', '343'],
    ['Packing List', '217'],
    ['Bill of Lading', '705'],
    ['AWB', '740'],
    ['Certificate of Origin (COO) Fasilitas', '860'],
    ['Certificate of Origin (COO) Non Fasilitas', '861'],
    ['Laporan Surveyor', '958'],
    ['Persetujuan Impor', '959'],
    ['Sertifikat Fumigasi', '857'],
    ['Certificate of Analysis (COA)', '961'],
    ['Phytosanitary Certificate (Phyto)', '851'],
    ['Health Certificate (HC)', '853'],
    ['Asuransi', '999'],
]);

test('it keeps post submit and local operational documents out of ceisa draft rows', function (string $name, string $expectedUsage) {
    $resolver = new CeisaDocumentMappingResolver;

    expect($resolver->fallbackUsage($name))
        ->toBe($expectedUsage)
        ->and($resolver->shouldIncludeInDraft(null, $name))
        ->toBeFalse();
})->with([
    ['Draft PIB/PEB', CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT],
    ['Bukti Penerimaan Negara', CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT],
    ['PIB/PEB NOPEN Non Stamp', CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT],
    ['SPPB/NPE', CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT],
    ['Invoice DO', CeisaDocumentMapping::DRAFT_USAGE_IGNORE],
    ['Surat Kuasa Release DO', CeisaDocumentMapping::DRAFT_USAGE_IGNORE],
]);

test('explicit document mapping overrides fallback code and usage', function () {
    $resolver = new CeisaDocumentMappingResolver;
    $mapping = new CeisaDocumentMapping([
        'ceisa_document_code' => '812',
        'draft_usage' => CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT,
    ]);

    expect($resolver->codeFor($mapping, 'Invoice'))
        ->toBe('812')
        ->and($resolver->usageFor($mapping, 'Invoice'))
        ->toBe(CeisaDocumentMapping::DRAFT_USAGE_POST_SUBMIT)
        ->and($resolver->shouldIncludeInDraft($mapping, 'Invoice'))
        ->toBeFalse();
});
