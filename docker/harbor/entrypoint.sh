#!/bin/bash
set -e

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

if [ -d "/mnt/Ppjk" ]; then
    chown -R www-data:www-data /mnt/Ppjk
    chmod -R 775 /mnt/Ppjk
    echo "Permissions set for /mnt/Ppjk"
else
    echo "Warning: /mnt/Ppjk not found inside container"
fi

if [ -f /tmp/hosts_external ]; then
    echo "Processing /etc/hosts insertion..."
    grep -v "127.0.0.1" /tmp/hosts_external | grep -v "::1" > /tmp/clean_hosts
    sed "/127.0.0.1.*localhost/r /tmp/clean_hosts" /etc/hosts > /tmp/hosts.new
    cat /tmp/hosts.new > /etc/hosts
    echo "Success inserted external hosts"
fi

php artisan storage:link || true

exec apache2-foreground
