<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tanda Terima Dokumen {{ $spk->spk_code ?? '-' }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 14px;
        }

        .header {
            margin-bottom: 18px;
            border-bottom: 2px;
            padding-bottom: 12px;
        }

        .header-flex {
            width: 100%;
            display: table;
        }

        .header-left {
            display: table-cell;
            vertical-align: top;
        }

        .header-right {
            display: table-cell;
            text-align: right;
            vertical-align: top;
        }

        .company-name {
            margin-top: 4px;
        }

        .company-logo {
            max-width: 90px;
            max-height: 50px;
            width: auto;
            height: auto;
        }

        .title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        .shipment-table td,
        .shipment-table th,
        .docs-table td,
        .docs-table th,
        .footer-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: middle;
        }

        .shipment-table td.label {
            width: 18%;
            font-weight: bold;
        }

        .shipment-table td.value {
            width: 32%;
        }

        .docs-table th {
            text-align: center;
            font-weight: bold;
        }

        .docs-table td.no {
            width: 7%;
            text-align: center;
        }

        .docs-table td.doc-name {
            width: 63%;
        }

        .docs-table td.check {
            width: 15%;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
        }

        .footer-table td.label {
            width: 22%;
            font-weight: bold;
        }

        .muted-empty {
            color: #111;
        }

        .center {
            text-align: center;
        }
        .party-list {
            margin: 0;
            padding-left: 12px;
        }

        .party-list li {
            margin: 0 0 2px 0;
        }
    </style>
</head>
<body>
    <div class="header">

        <!-- HEADER ATAS (LOGO + NAMA) -->
        <div style="width:100%; text-align:right; margin-bottom:10px;">
            <div style="display:inline-block; text-align:center;">
                
                @if(!empty($companyLogoPath))
                    <img src="{{ $companyLogoPath }}" class="company-logo">
                @endif

                @if(!empty($companyName))
                    <div class="company-name">
                        {{ $companyName }}
                    </div>
                @endif

            </div>
        </div>
        <div class="title">TANDA TERIMA DOKUMEN</div>

        @php
            $shipper = !empty($spk->shipper) ? $spk->shipper : '-';
            $consignee = !empty($spk->consignee) ? $spk->consignee : '-';
            $blNumber = !empty($spk->spk_code) ? $spk->spk_code : '-';
            $vessel = !empty($spk->vessel) ? $spk->vessel : '-';
            $party = !empty($party) ? $party : '-';
            $aju = !empty($spk->aju) ? $spk->aju : '-';
            $jo = !empty($spk->j_o) ? $spk->j_o : '-';
            $comodity = !empty($spk->comodity) ? $spk->comodity : '-';
            $eta_date = !empty($spk->eta_date) ? \Carbon\Carbon::parse($spk->eta_date)->format('d-m-Y') : '-';
            $tanggalDiterima = !empty($spk->tanggal_dokumen) ? \Carbon\Carbon::parse($spk->tanggal_dokumen)->format('d-m-Y') : '-';
        @endphp

        <table class="shipment-table">
            <tr>
                <td class="label">SHIPPER:</td>
                <td class="value">{{ $shipper }}</td>
                <td class="label">AJU:</td>
                <td class="value">{{ $aju }}</td>
            </tr>
            <tr>
                <td class="label">CONSIGNEE:</td>
                <td class="value">{{ $consignee }}</td>
                <td class="label">J.O:</td>
                <td class="value">{{ $jo }}</td>
            </tr>
            <tr>
                <td class="label">B/L:</td>
                <td class="value">{{ $blNumber }}</td>
                <td class="label">COMMODITY:</td>
                <td class="value">{{ $comodity }}</td>
            </tr>
            <tr>
                <td class="label">VESSEL:</td>
                <td class="value">{{ $vessel }}</td>
                <td class="label">ETA DATE:</td>
                <td class="value">{{ $eta_date }}</td>
            </tr>
            <tr>
                <td class="label">PARTY:</td>
                <td class="value">
                    @if(!empty($party) && $party !== 'data kosong')
                        <ul class="party-list">
                            @foreach(explode(',', $party) as $item)
                                <li>{{ trim($item) }}</li>
                            @endforeach
                        </ul>
                    @else
                        data kosong
                    @endif
                </td>
                <td class="label"></td>
                <td class="value"></td>
            </tr>
        </table>
    </div>

    <table class="docs-table" style="margin-top: 0;">
        <thead>
            <tr>
                <th style="width: 7%;">NO</th>
                <th>DOCUMENT</th>
                <th style="width: 15%;">YES</th>
                <th style="width: 15%;">NO</th>
            </tr>
        </thead>
        <tbody>
            @forelse($documents as $index => $doc)
                @php
                    $isYes = !empty($doc->is_updated) && $doc->is_updated === true;
                    $isNo = !$isYes;
                @endphp
                <tr>
                    <td class="no">{{ $index + 1 }}</td>
                    <td class="doc-name">{{ $doc->nama_file ?? 'data kosong' }}</td>
                    <td class="check">{{ $isYes ? '✓' : '' }}</td>
                    <td class="check">{{ $isNo ? '✓' : '' }}</td>
                </tr>
            @empty
                <tr>
                    <td class="center" colspan="4">Belum ada data dokumen</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="footer-table" style="margin-top: 24px;">
        <tr>
            <td class="label">Tanggal diterima:</td>
            <td>{{ $tanggalDiterima }}</td>
        </tr>
    </table>

</body>
</html>