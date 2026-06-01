<?php

namespace App\Services\Ceisa;

use Illuminate\Support\Str;

class CeisaPortReferenceFallback
{
    private const PORTS = [
        [
            'kodePelabuhan' => 'IDTPE',
            'namaPelabuhan' => 'TANJUNG PERAK',
            'kodeKantor' => '070100',
            'namaKantor' => 'KPPBC TMP TANJUNG PERAK',
            'kodeNegara' => 'ID',
            'namaNegara' => 'INDONESIA',
            'aliases' => ['IDTPE', 'TPE', 'TANJUNG PERAK', 'PERAK', 'SURABAYA'],
        ],
    ];

    public function searchByKeyword(string $keyword): array
    {
        $needle = $this->normalize($keyword);

        if ($needle === '') {
            return [];
        }

        return collect(self::PORTS)
            ->filter(function (array $port) use ($needle) {
                $haystacks = [
                    $port['kodePelabuhan'] ?? '',
                    $port['namaPelabuhan'] ?? '',
                    $port['kodeKantor'] ?? '',
                    $port['namaKantor'] ?? '',
                    ...($port['aliases'] ?? []),
                ];

                foreach ($haystacks as $haystack) {
                    $normalized = $this->normalize((string) $haystack);

                    if ($normalized !== '' && (Str::contains($normalized, $needle) || Str::contains($needle, $normalized))) {
                        return true;
                    }
                }

                return false;
            })
            ->map(fn (array $port) => [
                'kodePelabuhan' => $port['kodePelabuhan'],
                'namaPelabuhan' => $port['namaPelabuhan'],
                'kodeKantor' => $port['kodeKantor'],
                'namaKantor' => $port['namaKantor'],
                'kodeNegara' => $port['kodeNegara'],
                'namaNegara' => $port['namaNegara'],
                'source' => 'local_fallback',
            ])
            ->values()
            ->all();
    }

    public function payloadForKeyword(string $keyword): ?array
    {
        $rows = $this->searchByKeyword($keyword);

        if ($rows === []) {
            return null;
        }

        return [
            'status' => 'OK',
            'message' => 'success',
            'data' => $rows,
            'total' => count($rows),
            'source' => 'local_fallback',
        ];
    }

    private function normalize(string $value): string
    {
        $normalized = Str::upper(trim($value));
        $normalized = preg_replace('/[^A-Z0-9]+/', ' ', $normalized) ?: '';

        return trim($normalized);
    }
}
