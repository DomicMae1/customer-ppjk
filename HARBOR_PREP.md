# Harbor Preparation Notes

File ini disiapkan untuk percobaan integrasi image registry tanpa mengubah flow production yang sekarang.

## File alternatif

- `Dockerfile.harbor`
- `docker-compose.harbor.yml`

File existing berikut sengaja tidak diubah agar setup production tetap aman:

- `Dockerfile`
- `docker-compose.yml`

## Variable GitLab yang disiapkan

- `HARBOR_URL`
- `HARBOR_PROJECT`
- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`
- `IMAGE_NAME`

Selama variable itu belum dibuat oleh tim DevOps, job publish Harbor di pipeline akan otomatis di-skip.
Pipeline build dan test tetap bisa jalan normal.

## Nama image sederhana

Gunakan nama image:

- `customer-ppjk`

Contoh referensi image:

- `$HARBOR_URL/$HARBOR_PROJECT/$IMAGE_NAME:$CI_COMMIT_SHORT_SHA`
- `$HARBOR_URL/$HARBOR_PROJECT/$IMAGE_NAME:latest`

## Contoh build lokal

```bash
docker build -f Dockerfile.harbor -t customer-ppjk:local .
```

## Contoh compose image-based

Set variable image lebih dulu:

```bash
APP_IMAGE=harbor.example.com/project/customer-ppjk:latest
```

Lalu jalankan:

```bash
docker compose -f docker-compose.harbor.yml up -d
```

Jika diuji di host yang sama dengan stack production existing, override port lebih dulu agar tidak bentrok:

```bash
APP_FORWARD_PORT=8081
REVERB_FORWARD_PORT=8082
FORWARD_DB_PORT=5433
```

## Status pipeline saat Harbor belum siap

File `.gitlab-ci.yml` sudah disiapkan agar:

- job build dan test tetap jalan
- job publish Harbor hanya muncul di branch `harbor-prep`
- job publish Harbor bersifat manual
- job publish Harbor baru aktif jika semua variable Harbor sudah tersedia
