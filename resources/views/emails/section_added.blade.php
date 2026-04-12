<!DOCTYPE html>
<html>

<head>
    <title>Section Tambahan: SPK {{ $spk->spk_code }}</title>
</head>

<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2F80ED;">Ada Section Tambahan</h2>

        <p>Halo <strong>{{ $recipient->name }}</strong>,</p>

        <p>Ada section tambahan yang perlu anda cek (sebanyak <strong>{{ $count }}</strong> section) yaitu <strong>{{ $sectionNames }}</strong>.</p>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 4px solid #2F80ED; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Nomor SPK:</strong> {{ $spk->spk_code }}</p>
            <p style="margin: 5px 0;"><strong>Tipe:</strong> {{ $spk->shipment_type }}</p>
            <p style="margin: 5px 0;"><strong>Diinput oleh:</strong> {{ $adminUser->name }}</p>
        </div>

        <p style="margin-bottom: 20px;">Silakan klik tombol di bawah ini untuk melihat detail SPK tersebut.</p>

        <a href="{{ config('app.url') }}/shipping/{{ $spk->id }}"
            style="display: inline-block; padding: 10px 20px; background-color: #2F80ED; color: white; text-decoration: none; border-radius: 5px;">
            Lihat SPK
        </a>

        <br><br>
        <p style="font-size: 0.9em; color: #666;">
            Email ini dibuat otomatis oleh sistem. Mohon tidak membalas email ini.
        </p>
    </div>
</body>

</html>