<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DocumentSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $data = [
            [
                'id_dokumen' => 1,
                'id_section' => 1,
                'nama_file' => 'Bill of Lading',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/bl.pdf',
                'link_path_template_file' => 'documents/templates/bl.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Bill of Lading (B/L) adalah dokumen resmi yang diterbitkan oleh pihak pengangkut (carrier) sebagai bukti penerimaan barang untuk dikirim, yang juga memuat rincian barang, tujuan pengiriman, serta pihak pengirim dan penerima.',
                'is_internal' => false,
                'is_ori' => true,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 2,
                'id_section' => 1,
                'nama_file' => 'Invoice',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/invoice.pdf',
                'link_path_template_file' => 'documents/templates/invoice.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Invoice adalah dokumen yang berisi rincian transaksi penjualan antara penjual dan pembeli, mencakup informasi barang atau jasa, jumlah, harga, serta total pembayaran yang harus dilakukan.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 3,
                'id_section' => 1,
                'nama_file' => 'Packing List',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/packing_list.pdf',
                'link_path_template_file' => 'documents/templates/packing_list.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Packing list adalah dokumen yang menjelaskan detail isi pengemasan barang, seperti jenis barang, jumlah, berat, ukuran, dan cara pengemasan dalam suatu pengiriman.',
                'is_internal' => false,
                'is_ori' => true,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 4,
                'id_section' => 1,
                'nama_file' => 'Asuransi',
                'attribute' => 0,
                'link_path_example_file' => 'documents/examples/asuransi.pdf',
                'link_path_template_file' => 'documents/templates/asuransi.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Asuransi adalah dokumen perjanjian antara dua pihak, di mana satu pihak (perusahaan asuransi) memberikan perlindungan finansial kepada pihak lain (tertanggung) terhadap risiko tertentu, dengan imbalan premi (biaya yang dibayar secara berkala). asuransi digunakan untuk melindungi barang selama pengiriman dari risiko seperti: Kerusakan, Kehilangan, Kecelakaan saat transportasi',
                'is_internal' => false,
                'is_ori' => true,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 5,
                'id_section' => 1,
                'nama_file' => 'Surat Kuasa Kepabeanan',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/sk_kepabean.pdf',
                'link_path_template_file' => 'documents/templates/sk_kepabean.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Surat Kuasa Kepabeanan adalah dokumen yang memberikan wewenang dari pemilik barang kepada pihak lain (biasanya perusahaan jasa kepabeanan atau forwarder) untuk mengurus proses administrasi dan formalitas di bea cukai.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 6,
                'id_section' => 1,
                'nama_file' => 'Persetujuan Impor',
                'attribute' => 0,
                'link_path_example_file' => 'documents/examples/pi.pdf',
                'link_path_template_file' => 'documents/templates/pi.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'PI (Persetujuan Impor) adalah dokumen yang merupakan izin resmi dari pemerintah yang wajib dimiliki oleh importir untuk memasukkan barang tertentu dari luar negeri ke Indonesia.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 7,
                'id_section' => 1,
                'nama_file' => 'Laporan Surveyor',
                'attribute' => 0,
                'link_path_example_file' => 'documents/examples/L/S.pdf',
                'link_path_template_file' => 'documents/templates/L/S.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'L/S (Laporan Surveyor) adalah dokumen verifikasi resmi atau dokumen hasil pemeriksaan barang oleh surveyor untuk memastikan barang yang di impor sesuai dengan aturan yang berlaku sebelum barang tersebut masuk ke Indonesia.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 8,
                'id_section' => 2,
                'nama_file' => 'Surat Kuasa Release DO',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/dokumen_1.pdf',
                'link_path_template_file' => 'documents/templates/dokumen_1.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Surat Kuasa release DO adalah dokumen yang menyatakan persetujuan atau otorisasi untuk mengeluarkan Delivery Order (DO), sehingga barang dapat diambil dari pihak pengangkut atau gudang setelah semua persyaratan terpenuhi.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 9,
                'id_section' => 2,
                'nama_file' => 'Surat Pinjam Container',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/dokumen_2.pdf',
                'link_path_template_file' => 'documents/templates/dokumen_2.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Surat Pinjam Container adalah dokumen yang menyatakan peminjaman kontainer dari pihak pelayaran kepada pengguna (shipper/consignee) dalam pengiriman Full Container Load (FCL), yang berisi ketentuan penggunaan serta tanggung jawab atas kontainer tersebut selama masa peminjaman.',
                'is_internal' => false,
                'is_print' => true,
            ],
            [
                'id_dokumen' => 10,
                'id_section' => 2,
                'nama_file' => 'Invoice DO',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/dokumen_2.pdf',
                'link_path_template_file' => 'documents/templates/dokumen_2.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Invoice DO adalah dokumen tagihan yang diterbitkan oleh pihak pelayaran atau agen terkait biaya pengeluaran Delivery Order, yang mencakup rincian biaya administrasi atau layanan yang harus dibayar sebelum DO dapat digunakan.',
                'is_internal' => false,
            ],
            [
                'id_dokumen' => 11,
                'id_section' => 3,
                'nama_file' => 'Draft PIB/PEB',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/draft_pib.pdf',
                'link_path_template_file' => 'documents/templates/draft_pib.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Draft PIB (Pemberitahuan Impor Barang) adalah Dokumen versi awal dari PIB atau PEB yang masih dalam tahap penyusunan atau pengecekan, biasanya belum final dan masih dapat mengalami perubahan sebelum diajukan secara resmi.',
                'is_internal' => true,
                'is_confirmed' => true,
                'is_send_email' => true,
            ],
            [
                'id_dokumen' => 12,
                'id_section' => 3,
                'nama_file' => 'PIB/PEB Confirm',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/pib_final.pdf',
                'link_path_template_file' => 'documents/templates/pib_final.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'PIB Final (Pemberitahuan Impor Barang Final) adalah Dokumen PIB atau PEB yang telah diverifikasi dan disetujui untuk diajukan atau sudah resmi terdaftar dalam sistem kepabeanan, sehingga data di dalamnya dianggap final.',
                'is_internal' => true,
            ],
            [
                'id_dokumen' => 13,
                'id_section' => 4,
                'nama_file' => 'Id Billing',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/id_billing.pdf',
                'link_path_template_file' => 'documents/templates/id_billing.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Id Billing adalah Kode identifikasi unik yang diterbitkan oleh sistem kepabeanan atau perpajakan sebagai referensi pembayaran kewajiban negara (seperti bea masuk, pajak, atau pungutan lainnya) atas suatu transaksi.',
                'is_internal' => true,
                'is_confirmed' => true,
            ],
            [
                'id_dokumen' => 14,
                'id_section' => 4,
                'nama_file' => 'Bukti Penerimaan Negara',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/bukti_pembayaran.pdf',
                'link_path_template_file' => 'documents/templates/bukti_pembayaran.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'Bukti Penerimaan Negara adalah dokumen resmi yang menyatakan bahwa pembayaran kepada negara telah diterima dan tercatat, biasanya berisi detail transaksi pembayaran seperti jumlah, tanggal, dan kode referensi (ID Billing).',
                'is_internal' => true,
            ],
            [
                'id_dokumen' => 15,
                'id_section' => 5,
                'nama_file' => 'PIB/PEB NOPEN',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/sppb.pdf',
                'link_path_template_file' => 'documents/templates/sppb.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'PIB/PEB NOPEN adalah nomor resmi yang diberikan oleh sistem kepabeanan setelah dokumen PIB (impor) atau PEB (ekspor) didaftarkan, sebagai identitas unik atas dokumen tersebut dalam proses administrasi bea cukai.',
                'is_internal' => true,
            ],
            [
                'id_dokumen' => 16,
                'id_section' => 5,
                'nama_file' => 'SPJM/PPB',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/sppb.pdf',
                'link_path_template_file' => 'documents/templates/sppb.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'SPJM/PPB adalah dokumen yang menunjukkan bahwa barang impor/ekspor ditetapkan masuk jalur pemeriksaan fisik oleh bea cukai.',
                'is_internal' => true,
            ],
            [
                'id_dokumen' => 17,
                'id_section' => 5,
                'nama_file' => 'SPPB/NPE',
                'attribute' => 1,
                'link_path_example_file' => 'documents/examples/sppb.pdf',
                'link_path_template_file' => 'documents/templates/sppb.pdf',
                'link_url_video_file' => 'https://www.youtube.com/watch?v=28whxoWAzA0',
                'description_file' => 'SPPB/NPE adalah Dokumen yang menyatakan bahwa barang impor/ekspor telah mendapatkan izin untuk dikeluarkan dari kawasan pabean.',
                'is_internal' => true,
            ],
        ];

        $data = array_map(function (array $document) use ($now) {
            $mandatory = (bool) ($document['attribute'] ?? false);

            $document = array_merge([
                'is_verification' => true,
                'import_mandatory' => $mandatory,
                'export_mandatory' => $mandatory,
                'is_confirmed' => false,
                'is_ori' => false,
                'is_print' => false,
                'is_send_email' => false,
                'kuota_revisi' => 3,
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ], $document);

            $document['import_mandatory'] = $document['import_mandatory'] ?? $mandatory;
            $document['export_mandatory'] = $document['export_mandatory'] ?? $mandatory;

            return $document;
        }, $data);

        $table = DB::connection('tako-user')->table('master_documents');
        $columns = array_flip(Schema::connection('tako-user')->getColumnListing('master_documents'));
        $data = array_map(fn (array $document) => array_intersect_key($document, $columns), $data);
        $updateColumns = array_values(array_diff(array_keys($data[0]), ['id_dokumen']));

        $table->upsert($data, ['id_dokumen'], $updateColumns);

        if (DB::connection('tako-user')->getDriverName() === 'pgsql') {
            DB::connection('tako-user')->statement("SELECT setval(pg_get_serial_sequence('master_documents', 'id_dokumen'), (SELECT MAX(id_dokumen) FROM master_documents))");
        }
    }
}
