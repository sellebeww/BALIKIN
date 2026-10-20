# Audit BALIKIN — 18 Oktober 2026

Cakupan: semua modul domain, alur API/JSON, tujuh layar, biaya dan simulasi, ketahanan input, serta penggunaan desktop/ponsel. Perbaikan dilakukan pada aplikasi lokal; data operasional yang ada dipertahankan. Pengujian browser menggunakan direktori data sementara sendiri.

## Temuan yang diperbaiki

| Temuan | Dampak sebelum perbaikan | Perbaikan dan bukti regresi |
| --- | --- | --- |
| Barang tidak sesuai bisa melewati “ditahan” lalu inspeksi | Barang salah dapat masuk batch sebagai barang otorisasi | Pemeriksaan dan perencana memverifikasi kecocokan; jalur eskalasi/keputusan merek tersedia; unit + browser |
| QR mengikuti tanggal pengajuan | Persetujuan terlambat menerbitkan QR hangus | Masa serah dihitung dari persetujuan; waktu batas eksak dan tanggal invalid diuji |
| Foto kosong/duplikat spasi lolos perhitungan | Bukti minimum tidak benar-benar tersedia | Normalisasi, deduplikasi, validasi bukti kedua pihak |
| Kejadian bertanggal mundur | Audit waktu dan durasi tidak konsisten | Fungsi transisi menolak waktu mundur; aksi simulasi menjaga urutan |
| Batch baru setiap klik | Angkut tetap berlebihan dan utilisasi turun | Isi ulang batch terbuka sesuai cut-off dan kapasitas; kutipan tarif disimpan |
| Sengketa selesai masih diproses saat pengiriman | Transisi `selesai → dikirim` gagal dan menghambat batch | Anggota berinsiden/selesai dilewati; keputusan sengketa eksplisit dan tercatat |
| Penilaian impas hanya membandingkan volume dengan ambang pertama | Klaim layak bisa salah akibat biaya bertangga atau variasi per merek | Keputusan menggunakan biaya tiap merek pada hasil aktual/proyeksi aktif |
| Waktu kerja tidak selalu dimulai setelah kedatangan | Barang datang siang bisa langsung selesai; antrean kurang akurat | FIFO berbasis waktu mulai/selesai dan jam buka; kapasitas tidak direset ketika backlog melintasi hari |
| Sampel S7 berubah setelah satu merek dihapus | Efek penghapusan bercampur perubahan acak | Aliran acak per merek/minggu/barang; sampel peserta tersisa identik |
| Sengketa masuk statistik selesai | Durasi resolusi tampak lebih pendek | Hanya retur selesai masuk rata-rata/P90; jumlah sengketa terpisah |
| Kerugian hilang selalu diberi label rusak | Metrik insiden tidak sesuai parameter | Kejadian hilang/rusak dibedakan; semua sengketa terbuka tidak dihitung selesai |
| Ekor antrean BALIKIN menaikkan biaya toko pembanding | Mode pembanding tampak lebih mahal secara tidak adil | Horizon biaya toko tetap sama dengan periode permintaan; ekor hanya ditagihkan pada jaringan |
| Monte Carlo mengunci thread UI dan hasil lama bisa tertinggal | Navigasi macet atau angka tidak cocok dengan input terbaru | Web Worker, progres, batal, terminasi pada pergantian input/layar |
| Hasil tanpa retur terlihat seperti Rp0 | Salah dibaca sebagai gratis/efisien | Rasio/rentang tidak terdefinisi ditampilkan “—”; putaran kosong dihitung |
| Query halaman pecahan dan input volume pecahan | Pilihan halaman/array alokasi tidak valid | Query integer tervalidasi, volume UI dibulatkan, fungsi domain menolak input invalid |
| Mutasi tab ganda dan payload buruk | Penimpaan atau pesan galat membingungkan | Antrean tahan hot reload, versi optimistis HTTP 409, refresh tanpa replay, validasi ukuran/JSON/origin |
| JSON valid secara sintaks tetapi bentuk rusak | UI gagal jauh setelah membaca data | Skema lengkap saat baca; data rusak tidak diam-diam diganti seed |
| Kode UI satu berkas panjang | Sulit memelihara tiap alur | Komponen per layar, helper bersama, format konsisten dan impor dirapikan |

## Peningkatan penggunaan

- Cari retur berdasarkan kode, pesanan, barang, atau merek; filter status dan paginasi.
- Biaya kini setiap merek dapat diedit untuk kalibrasi pembanding.
- Ekspor hasil simulator CSV dengan perlindungan formula spreadsheet.
- Tabel data di bawah grafik; tabel lebar dapat difokuskan/digeser melalui keyboard.
- Navigasi back/forward, label menu aksesibel, tutup menu ponsel dengan backdrop atau Escape.
- Kontras teks pendukung diperbaiki; tata letak ponsel diperiksa pada lebar 390 px.
- Estimasi operasi menggunakan ongkos batch yang telah dicatat, bukan menghitung ulang tarif lama saat asumsi angkut berubah.

## Gerbang verifikasi

- **54 tes Vitest lulus**, termasuk 25 kasus regresi audit, aturan domain/ekonomi, persistensi, konflik penulisan, serta alur operasi penuh.
- **TypeScript lulus** untuk seluruh aplikasi dan tes.
- **7 tes Playwright/Chrome lulus**; data uji terisolasi, mencakup layar desktop dan ponsel.
- **Build produksi Next.js dengan Webpack lulus.** Satu tes Chrome tambahan pada server produksi juga lulus untuk S1–S7, CSV, worker Monte Carlo, dan pembatalan.
- **Prettier lulus** untuk seluruh kode, tes, dan konfigurasi.
- **npm audit: 0 kerentanan diketahui**, termasuk dependensi produksi dan pengembangan setelah pembaruan Vitest ke 4.1.12.

Audit awal seluruh dependensi menemukan tiga entri advisori (dua kritis, satu moderat) pada Vitest lama, tinypool, dan mocker. Pembaruan mengikuti perbaikan yang tersedia untuk [mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [tinypool worker options](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), dan [tinypool run options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr). Pengujian ulang 54 tes setelah pembaruan tetap lulus. Audit ini tidak menyatakan perangkat lunak bebas dari semua bug atau menggantikan pengujian lapangan.

## Hasil bisnis setelah koreksi

Proyeksi awal tetap Rp27.344 per retur pada 42 retur/minggu; ambang pertama agar seluruh merek hemat tetap 55 retur/minggu. Simulasi seed 42 kini menghasilkan 184 retur, 183 selesai, satu sengketa, biaya Rp29.067, durasi selesai rata-rata 4,94 hari, dan P90 6,26 hari. Promo menghasilkan antrean 118 barang dan P90 11,14 hari. Monte Carlo P5–P95 Rp26.960–Rp34.709.

**NO-GO untuk operasional nyata pada asumsi kepadatan awal tetap berlaku.** Koreksi kode meningkatkan ketepatan perhitungan, bukan membuktikan model usaha layak.

## Batas tersisa

JSON hanya untuk satu proses Node lokal; tanpa autentikasi/isolasi hak akses, pembayaran, kurir, kamera QR atau foto sungguhan. Simulasi memakai asumsi kedatangan, jam buka, mutu, probabilitas risiko, dan transit tetap. Sengketa tidak memiliki durasi resolusi stokastik. Estimasi biaya berjalan bukan ledger historis: komponen non-batch masih memakai asumsi terkini. Belum ada scheduler otomatis kedaluwarsa, pengujian semua browser/perangkat, audit aksesibilitas bersertifikat, atau pengujian beban produksi. Prioritas berikutnya adalah kalibrasi data lapangan, bukan integrasi pembayaran.
