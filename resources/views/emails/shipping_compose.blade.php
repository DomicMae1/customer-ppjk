<!doctype html>
<html lang="id">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            color: #333333;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .wrapper {
            width: 100%;
            background-color: #f4f7f6;
            padding: 40px 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        /* Header dengan aksen biru di bawahnya */
        .header {
            background-color: #0f172a;
            padding: 30px 20px;
            text-align: center;
            border-bottom: 4px solid #3b82f6;
        }

        .header h2 {
            margin: 0;
            font-size: 22px;
            color: #ffffff;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }

        .content {
            padding: 40px 30px;
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
        }

        .content-html {
            margin-bottom: 35px;
        }

        /* Kotak detail biar email nggak kelihatan kosong */
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .info-box-title {
            font-size: 13px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 15px;
            letter-spacing: 0.5px;
        }

        .info-row {
            display: table;
            width: 100%;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .info-label {
            display: table-cell;
            width: 40%;
            font-weight: 600;
            color: #1e293b;
        }

        .info-value {
            display: table-cell;
            color: #334155;
        }

        /* Label tipe dokumen */
        .badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .divider {
            border-top: 1px solid #e2e8f0;
            margin: 30px 0;
        }

        .sign-off {
            font-size: 14px;
            color: #64748b;
        }

        /* Footer ala enterprise */
        .footer {
            background-color: #f1f5f9;
            padding: 25px 30px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.6;
        }

        .footer strong {
            color: #64748b;
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h2>{{ $senderName ?? 'SISTEM PPJK' }}</h2>
            </div>

            <div class="content">
                <div class="content-html">
                    {!! $bodyHtml !!}
                </div>

                <div class="info-box">
                    <div class="info-box-title">Detail Referensi Dokumen</div>
                    <div class="info-row">
                        <span class="info-label">No. Referensi</span>
                        <span class="info-value">: <strong>{{ $spk->spk_code ?? '-' }}</strong></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tipe Shipment</span>
                        <span class="info-value">: <span class="badge">{{ $spk->shipment_type ?? 'N/A' }}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tanggal Sistem</span>
                        <span class="info-value">: {{ date('d F Y') }}</span>
                    </div>

                    @if(!empty($attachedNames))
                    <div class="divider" style="margin: 15px 0;"></div>
                    <div class="info-box-title" style="margin-top: 10px;">Daftar Dokumen Lampiran</div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
                        @foreach($attachedNames as $name)
                            <li>{{ $name }}</li>
                        @endforeach
                    </ul>
                    @endif
                </div>

                <div class="divider"></div>

                <div class="sign-off">
                    Hormat kami,<br>
                    <strong>Tim Operasional - {{ $senderName ?? 'Sistem PPJK' }}</strong>
                </div>
            </div>

            <div class="footer">
                <p>Email ini di-generate secara otomatis oleh sistem <strong>{{ $senderName ?? 'PPJK' }}</strong>. Mohon untuk tidak membalas email ini secara langsung.</p>
                <p><em>Pesan ini bersifat rahasia dan hanya ditujukan untuk penerima yang dimaksud. Jika Anda menerima email ini karena kesalahan, harap segera hapus.</em></p>
                <p style="margin-top: 15px;">&copy; {{ date('Y') }} {{ $senderName ?? 'Tako PPJK' }}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>

</html>