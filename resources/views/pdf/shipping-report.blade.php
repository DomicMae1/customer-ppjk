<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Report SPK {{ $spk->spk_code ?? '-' }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1f2937;
            margin: 20px;
        }

        .header {
            margin-bottom: 18px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 12px;
        }

        .kicker {
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
        }

        .title {
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 12px 0;
            color: #0f172a;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .info-table td {
            vertical-align: top;
            padding: 4px 8px 4px 0;
        }

        .info-label {
            width: 110px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #475569;
        }

        .meta {
            margin-top: 10px;
            font-size: 10px;
            color: #64748b;
        }

        .meta p {
            margin: 4px 0;
        }

        .summary {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px;
            margin: 18px 0 20px 0;
        }

        .summary td {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
            vertical-align: top;
        }

        .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 6px;
        }

        .summary-value {
            font-size: 22px;
            font-weight: bold;
        }

        .progress-wrap {
            margin-top: 16px;
        }

        .progress-label {
            font-size: 11px;
            margin-bottom: 6px;
        }

        .progress-bar {
            width: 100%;
            height: 10px;
            background: #e5e7eb;
            border-radius: 999px;
            overflow: hidden;
        }

        .progress-fill {
            height: 10px;
            background: #2563eb;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 22px 0 10px 0;
            color: #0f172a;
        }

        table.docs {
            width: 100%;
            border-collapse: collapse;
        }

        table.docs th,
        table.docs td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            vertical-align: top;
            font-size: 10px;
        }

        table.docs th {
            background: #f8fafc;
            text-align: center;
            text-transform: uppercase;
            color: #475569;
            font-weight: bold;
        }

        .left {
            text-align: left;
        }

        .center {
            text-align: center;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: bold;
        }

        .badge-blue {
            background: #dbeafe;
            color: #1d4ed8;
        }

        .badge-gray {
            background: #f1f5f9;
            color: #475569;
        }

        .badge-green {
            background: #dcfce7;
            color: #15803d;
        }

        .badge-amber {
            background: #fef3c7;
            color: #b45309;
        }

        .muted {
            font-size: 9px;
            color: #64748b;
            margin-top: 3px;
        }

        .footer {
            margin-top: 20px;
            font-size: 10px;
            color: #64748b;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Data Dokumen Shipment</div>

        <table class="info-table">
            <tr>
                <td class="info-label">SPK Number</td>
                <td>: {{ $spk->spk_code ?? '-' }}</td>

                <td class="info-label">Vessel</td>
                <td>: {{ $spk->vessel ?? '-' }}</td>
            </tr>
            <tr>
                <td class="info-label">Shipper</td>
                <td>: {{ $spk->shipper ?? '-' }}</td>

                <td class="info-label">Party</td>
                <td>: {{ $party ?? '-' }}</td>
            </tr>
            <tr>
                <td class="info-label">C'NEE</td>
                <td>: {{ $spk->consignee ?? '-' }}</td>

                <td class="info-label">AJU</td>
                <td>: {{ $spk->aju ?? '-' }}</td>
            </tr>
            <tr>
                <td class="info-label">B/L Number</td>
                <td>: {{ $spk->spk_code ?? '-' }}</td>

                <td class="info-label">J.O</td>
                <td>: {{ $spk->j_o ?? '-' }}</td>
            </tr>
        </table>

        <div class="meta">
            <p><strong>Generated By:</strong> {{ $generated_by ?? 'Guest' }}</p>
            <p><strong>Generated At:</strong> {{ $generated_at ?? '-' }} WIB</p>
        </div>

        <div class="progress-wrap">
            <div class="progress-label">
                <strong>Document Progress:</strong> {{ $progressPercentage }}%
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {{ $progressPercentage }}%;"></div>
            </div>
            <div style="margin-top:6px; font-size:10px; color:#64748b;">
                Verified {{ $verifiedCount }} dari {{ $totalDocs }} dokumen
            </div>
        </div>
    </div>

    <table class="summary">
        <tr>
            <td>
                <div class="summary-label">Total Dokumen</div>
                <div class="summary-value">{{ $totalDocs }}</div>
            </td>
            <td>
                <div class="summary-label">Sudah Diupdate</div>
                <div class="summary-value" style="color:#2563eb;">{{ $updatedCount }}</div>
            </td>
            <td>
                <div class="summary-label">Verified</div>
                <div class="summary-value" style="color:#10b981;">{{ $verifiedCount }}</div>
            </td>
            <td>
                <div class="summary-label">Pending</div>
                <div class="summary-value" style="color:#f59e0b;">{{ $pendingCount }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">List Dokumen SPK</div>

    <table class="docs">
        <thead>
            <tr>
                <th style="width:40px;">No</th>
                <th class="left">Nama File</th>
                <th style="width:90px;">Upload Date</th>
                <th style="width:90px;">Verified Date</th>
                <th style="width:90px;">ORI Date</th>
                <th style="width:80px;">Updated</th>
                <th style="width:80px;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($documents as $index => $doc)
                <tr>
                    <td class="center">{{ $index + 1 }}</td>

                    <td class="left">
                        <div><strong>{{ $doc->nama_file ?? '-' }}</strong></div>
                    </td>

                    <td class="center">
                        <div>{{ $doc->upload_date ?? '-' }}</div>
                    </td>

                    <td class="center">
                        <div>{{ $doc->verified_date ?? '-' }}</div>
                        @if(!empty($doc->verified_date_full))
                            <div class="muted">{{ $doc->verified_date_full }}</div>
                        @endif
                    </td>

                    <td class="center">
                        <div>{{ $doc->ori_date ?? '-' }}</div>
                        @if(!empty($doc->ori_date_full))
                            <div class="muted">{{ $doc->ori_date_full }}</div>
                        @endif
                    </td>

                    <td class="center">
                        @if($doc->is_updated)
                            <span class="badge badge-blue">Sudah</span>
                        @else
                            <span class="badge badge-gray">Belum</span>
                        @endif
                    </td>

                    <td class="center">
                        @if($doc->verify === true)
                            <span class="badge badge-green">Verified</span>
                        @else
                            <span class="badge badge-amber">Pending</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="center" style="padding: 20px;">
                        Belum ada data dokumen
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Report SPK {{ $spk->spk_code ?? '-' }}
    </div>
</body>
</html>