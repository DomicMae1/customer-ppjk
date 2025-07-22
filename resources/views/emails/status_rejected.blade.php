<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Review Customer</title>
</head>

<body>
    <h2>Hasil Review</h2>
    <p>Halo,</p>
    <p>Status untuk Customer dengan nama: <strong>{{ $nama->nama_personal }}</strong> mendapatkan review dari {{ $sender->getRoleNames()->first() }} {{ $sender->name }} .</p>

    @if ($status->status_3_keterangan)
    <p><strong>Dengan Keterangan:</strong> </p>
    <p>{{ $status->status_3_keterangan }}</p>
    @endif

    <p>Silakan cek kembali hasil review anda.</p>
</body>

</html>