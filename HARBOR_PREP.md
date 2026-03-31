# Harbor Preparation Notes

File ini disiapkan untuk percobaan integrasi image registry tanpa mengubah flow production yang sekarang.

## File alternatif

- `Dockerfile.harbor`
- `docker-compose.harbor.yml`

File existing berikut sengaja tidak diubah agar setup production tetap aman:

- `Dockerfile`
- `docker-compose.yml`

## Variable GitLab yang disiapkan

- `APP_NAME`
- `HARBOR_REGISTRY`
- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`

Selama variable inti belum dibuat oleh tim DevOps, job push Harbor di pipeline akan otomatis di-skip.

## Nama image sederhana

Gunakan nama image:

- `customer-ppjk`

Contoh referensi image yang dipakai saat ini:

- `$HARBOR_REGISTRY/tako-apps-dev/$APP_NAME:dev-$CI_COMMIT_SHORT_SHA`
- `$HARBOR_REGISTRY/tako-apps-dev/$APP_NAME:dev-$CI_PIPELINE_IID`
- `$HARBOR_REGISTRY/tako-apps-dev/$APP_NAME:dev-latest`

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

- job `composer_install` tetap jalan
- job `frontend_build` tetap jalan
- job `push_harbor_image` hanya jalan di branch `harbor-prep`
- job push Harbor baru aktif jika variable Harbor yang diperlukan sudah tersedia
