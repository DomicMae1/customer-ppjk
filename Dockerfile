# Gunakan image PHP dengan Apache built-in (lebih stabil untuk production)
FROM php:8.2-apache

# Install dependencies sistem dan ekstensi PHP yang dibutuhkan
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_pgsql zip

# Aktifkan mod_rewrite untuk URL rewriting Laravel
RUN a2enmod rewrite

# Ubah DocumentRoot Apache ke folder /public Laravel
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js (untuk compile aset frontend)
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /var/www/html

# Copy semua file project ke dalam container
COPY . .

# Install dependency PHP (Composer)
RUN composer install --optimize-autoloader --no-dev

# Install dependency JS (NPM) & Build
RUN npm install && npm run build

# Atur permission folder storage dan bootstrap cache agar bisa ditulisi oleh Apache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port 80
EXPOSE 80

# Jalankan Apache di foreground
CMD ["apache2-foreground"]