# How to running laravel project
# project developed by Tako Anugerah Koporasi

## 1. Clone repository

```bash
git clone https://github.com/Fantocaa/tako-customer-review.git
cd tako-customer-review
```

## 2. Install Composer & NPM

```bash
composer install
```

```bash
npm install
```

## 3. Copy .env

```bash
cp .env.example .env
```

## 4. Make APP key on env

```bash
php artisan key:generate
```

## 5. Artisan migrate database

### Migrate Central DB (users, master data, tenants)

```bash
php artisan migrate --database=tako-user --path=database/migrations/user
```

### Refresh Central DB

```bash
php artisan migrate:fresh --database=tako-user --path=database/migrations/user
```

## 6. Make a Seeder

This will:
- Seed roles, permissions, users, master data into Central DB
- Create tenants (auto-creates Tenant DB + Transactional DB per company)

```bash
php artisan db:seed
```

### Seed document templates per tenant (if needed separately)

```bash
php artisan tenants:seed
```

## 7. Running Laravel (backend)

```bash
php artisan serve
```

## 8. Running Frontend

```bash
npm run dev
```

## 9. Running Notification

```bash
php artisan reverb:start --debug
```

## 10. Database Architecture (3-Layer)

```
Central DB (mastertako_ppjk)     → users, customers, master data, tenants
Tenant DB (tenant{id})           → master_documents_trans (document templates)
Transactional DB (tenant{id}_trans_live) → spk, documents, statuses, notifications
```

### Migrate transactional DB manually (if needed)

```bash
# Migrate all tenants
php artisan tenant:migrate-transaction

# Migrate specific tenant
php artisan tenant:migrate-transaction alpha
```

### Check tenants/company DB
```bash
#before we cutoff tenants_trans_db you should check all db with this action
php artisan tenants:list
```

### Cut-off tahunan

```bash
# Cut-off a tenant (archive current year, create fresh DB) 
# make sure you already backup the database before running this command
php artisan tenant:cutoff alpha 2026

# Force (skip confirmation)
php artisan tenant:cutoff alpha 2026 --force
```

## 11. If u want to update all database

### remove all database

```bash
php artisan db:drop-all
```

```bash
php artisan migrate --database=tako-user --path=database/migrations/user
```

```bash
php artisan db:seed
```
