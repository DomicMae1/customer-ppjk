<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0; padding: 0;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background-color: {{ $reminderType === 'eta' ? '#1a6b9a' : '#c0392b' }};
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header .icon { font-size: 36px; margin-bottom: 6px; }
        .header h2 { margin: 0; font-size: 20px; }
        .header .spk-badge {
            display: inline-block;
            margin-top: 8px;
            background: rgba(255,255,255,0.2);
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .days-banner {
            background-color: {{ $reminderType === 'eta' ? '#d6eaf8' : '#fdecea' }};
            color: {{ $reminderType === 'eta' ? '#1a6b9a' : '#c0392b' }};
            text-align: center;
            padding: 18px;
            font-size: 22px;
            font-weight: bold;
        }
        .days-banner span { font-size: 14px; font-weight: normal; display: block; margin-top: 2px; }
        .content { padding: 28px 24px; }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eeeeee;
            font-size: 14px;
        }
        .info-table td:first-child {
            font-weight: bold;
            color: #555;
            width: 160px;
        }
        .section-list {
            background: #f9f9f9;
            border-left: 4px solid #c0392b;
            padding: 10px 16px;
            border-radius: 4px;
            margin: 14px 0;
        }
        .section-list ul {
            margin: 6px 0 0 0;
            padding-left: 18px;
        }
        .section-list li { margin-bottom: 4px; font-size: 14px; }
        .btn-container { text-align: center; margin: 28px 0 10px; }
        .btn {
            display: inline-block;
            background-color: {{ $reminderType === 'eta' ? '#1a6b9a' : '#c0392b' }};
            color: #ffffff !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 15px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">

        <div class="header">
            <div class="icon">{{ $reminderType === 'eta' ? '🚢' : '⏰' }}</div>
            <h2>{{ $title }}</h2>
            <div class="spk-badge">SPK: {{ $spk->spk_code }}</div>
        </div>

        <div class="days-banner">
            {{ $daysBefore }} Hari Lagi
            <span>
                @if($reminderType === 'eta')
                    hingga perkiraan kedatangan kapal
                @else
                    hingga batas waktu deadline
                @endif
            </span>
        </div>

        <div class="content">
            <p>Halo,</p>
            <p>{{ $bodyMessage }}</p>

            <table class="info-table">
                <tr>
                    <td>Kode SPK</td>
                    <td><strong>{{ $spk->spk_code }}</strong></td>
                </tr>
                <tr>
                    <td>Customer</td>
                    <td>{{ $spk->customer->nama_perusahaan ?? $spk->perusahaan->nama_perusahaan ?? '-' }}</td>
                </tr>
                @if($reminderType === 'eta')
                <tr>
                    <td>ETA Kapal</td>
                    <td>{{ \Carbon\Carbon::parse($spk->eta_date)->format('d M Y') }}</td>
                </tr>
                @else
                <tr>
                    <td>Deadline Date</td>
                    <td>{{ $deadlineDate ? \Carbon\Carbon::parse($deadlineDate)->format('d M Y') : '-' }}</td>
                </tr>
                @endif
                <tr>
                    <td>Tipe Shipment</td>
                    <td>{{ $spk->shipment_type ?? '-' }}</td>
                </tr>
            </table>

            @if($reminderType === 'deadline' && count($sectionNames) > 0)
            <div class="section-list">
                <strong>Section yang mendekati deadline:</strong>
                <ul>
                    @foreach($sectionNames as $section)
                        <li>{{ $section }}</li>
                    @endforeach
                </ul>
            </div>
            @endif

            <div class="btn-container">
                <a href="{{ config('app.url') }}/shipping/{{ $spk->id }}" class="btn">
                    Lihat Detail SPK →
                </a>
            </div>

            <p style="text-align:center; color:#888; font-size:13px;">
                Harap segera tindak lanjuti sebelum batas waktu yang ditentukan.
            </p>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} PPJK System. Pesan ini dikirim otomatis oleh sistem.
        </div>
    </div>
</body>
</html>
