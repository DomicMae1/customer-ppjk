<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tako-user';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->connection)->table('customers', function (Blueprint $table) {
            if (! Schema::connection($this->connection)->hasColumn('customers', 'nib')) {
                $table->string('nib', 32)->nullable()->after('no_npwp_16');
            }

            if (! Schema::connection($this->connection)->hasColumn('customers', 'alamat_lengkap')) {
                $table->text('alamat_lengkap')->nullable()->after('nib');
            }
        });

        if (! Schema::connection($this->connection)->hasTable('ceisa_importir_presets')) {
            return;
        }

        $presets = DB::connection($this->connection)
            ->table('ceisa_importir_presets')
            ->whereNotNull('id_customer')
            ->where('is_active', true)
            ->orderBy('id_customer')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['id_customer', 'name', 'npwp', 'npwp_16', 'nib', 'address']);

        $handledCustomers = [];

        foreach ($presets as $preset) {
            if (isset($handledCustomers[$preset->id_customer])) {
                continue;
            }

            $handledCustomers[$preset->id_customer] = true;

            $customer = DB::connection($this->connection)
                ->table('customers')
                ->where('id_customer', $preset->id_customer)
                ->first(['nama_perusahaan', 'no_npwp', 'no_npwp_16', 'nib', 'alamat_lengkap']);

            if (! $customer) {
                continue;
            }

            $updates = [];

            if (blank($customer->nama_perusahaan) && filled($preset->name)) {
                $updates['nama_perusahaan'] = $preset->name;
            }

            if (blank($customer->no_npwp) && filled($preset->npwp)) {
                $updates['no_npwp'] = $preset->npwp;
            }

            if (blank($customer->no_npwp_16) && filled($preset->npwp_16)) {
                $updates['no_npwp_16'] = $preset->npwp_16;
            }

            if (blank($customer->nib) && filled($preset->nib)) {
                $updates['nib'] = $preset->nib;
            }

            if (blank($customer->alamat_lengkap) && filled($preset->address)) {
                $updates['alamat_lengkap'] = $preset->address;
            }

            if ($updates !== []) {
                DB::connection($this->connection)
                    ->table('customers')
                    ->where('id_customer', $preset->id_customer)
                    ->update($updates);
            }
        }

        if (Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'npwp_16')) {
            try {
                Schema::connection($this->connection)->table('ceisa_importir_presets', function (Blueprint $table) {
                    $table->dropIndex('ceisa_importir_presets_npwp_16_index');
                });
            } catch (Throwable) {
                // The index may already be absent in older local databases.
            }
        }

        $columnsToDrop = array_values(array_filter([
            'name',
            'npwp',
            'npwp_16',
            'nitku',
            'nib',
            'address',
            'default_ndpbm',
        ], fn (string $column) => Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', $column)));

        if ($columnsToDrop !== []) {
            Schema::connection($this->connection)->table('ceisa_importir_presets', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::connection($this->connection)->hasTable('ceisa_importir_presets')) {
            Schema::connection($this->connection)->table('ceisa_importir_presets', function (Blueprint $table) {
                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'name')) {
                    $table->string('name')->nullable()->after('id_customer');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'npwp')) {
                    $table->string('npwp', 32)->nullable()->after('name');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'npwp_16')) {
                    $table->string('npwp_16', 32)->nullable()->after('npwp');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'nitku')) {
                    $table->string('nitku', 64)->nullable()->after('npwp_16');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'nib')) {
                    $table->string('nib', 32)->nullable()->after('nitku');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'address')) {
                    $table->text('address')->nullable()->after('nib');
                }

                if (! Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'default_ndpbm')) {
                    $table->decimal('default_ndpbm', 18, 4)->nullable()->after('default_signer_city');
                }
            });

            $presets = DB::connection($this->connection)
                ->table('ceisa_importir_presets')
                ->whereNotNull('id_customer')
                ->get(['id', 'id_customer']);

            foreach ($presets as $preset) {
                $customer = DB::connection($this->connection)
                    ->table('customers')
                    ->where('id_customer', $preset->id_customer)
                    ->first(['nama_perusahaan', 'no_npwp', 'no_npwp_16', 'nib', 'alamat_lengkap']);

                if (! $customer) {
                    continue;
                }

                $npwp16 = $this->toNpwp16($customer->no_npwp_16 ?: $customer->no_npwp);

                DB::connection($this->connection)
                    ->table('ceisa_importir_presets')
                    ->where('id', $preset->id)
                    ->update([
                        'name' => $customer->nama_perusahaan,
                        'npwp' => $this->digitsOnly($customer->no_npwp),
                        'npwp_16' => $npwp16,
                        'nitku' => $npwp16 ? $npwp16.'00000' : null,
                        'nib' => $this->digitsOnly($customer->nib),
                        'address' => $customer->alamat_lengkap,
                    ]);
            }

            if (Schema::connection($this->connection)->hasColumn('ceisa_importir_presets', 'npwp_16')) {
                try {
                    Schema::connection($this->connection)->table('ceisa_importir_presets', function (Blueprint $table) {
                        $table->index('npwp_16', 'ceisa_importir_presets_npwp_16_index');
                    });
                } catch (Throwable) {
                    // The index may already exist.
                }
            }
        }

        Schema::connection($this->connection)->table('customers', function (Blueprint $table) {
            $columnsToDrop = array_values(array_filter([
                'alamat_lengkap',
                'nib',
            ], fn (string $column) => Schema::connection($this->connection)->hasColumn('customers', $column)));

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    private function digitsOnly(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value);
    }

    private function toNpwp16(?string $value): string
    {
        $digits = $this->digitsOnly($value);

        return strlen($digits) === 15 ? '0'.$digits : $digits;
    }
};
