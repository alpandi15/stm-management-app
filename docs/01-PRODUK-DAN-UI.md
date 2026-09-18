# 01 — Produk dan Antarmuka

## 1. Untuk siapa aplikasi ini

Pengguna tunggalnya adalah **bendahara STM**: umumnya berusia 40–70 tahun, memakai
komputer untuk hal-hal dasar saja, dan tidak punya siapa pun untuk dimintai bantuan
teknis di rumah. Ia membuka aplikasi ini satu sampai dua kali seminggu, biasanya setelah
pertemuan warga, untuk mencatat uang yang masuk dan keluar.

Sesekali laptopnya dipinjam pengurus lain untuk melihat laporan — tapi aplikasinya tetap
satu akun. Tidak ada peran, tidak ada hak akses bertingkat.

Dua hal yang menentukan seluruh keputusan desain di dokumen ini:

- Kalau ia tersesat sekali saja, ia akan kembali ke buku tulis.
- Kalau angkanya salah dan ia baru tahu saat rapat, kepercayaannya hilang permanen.

## 2. Prinsip yang mengikat

### P1 — Modern tapi tenang

"Modern" di sini bukan berarti ramai. Artinya: tipografi bersih, ruang kosong yang cukup,
sudut membulat, bayangan halus, satu warna aksen, animasi singkat. Bukan gradien warna-warni,
bukan glassmorphism, bukan ikon di setiap baris.

Rujukan rasa: aplikasi perbankan modern yang tenang — bukan dasbor analitik.

### P2 — Bahasa orang awam

Kata berikut **dilarang muncul** di layar: debit, kredit, jurnal, posting, ledger, neraca,
akun, entri, void, sync, submit, dashboard, filter.

| Alih-alih | Tulis |
| --- | --- |
| Pemasukan / Debit | **Uang Masuk** |
| Pengeluaran / Kredit | **Uang Keluar** |
| Saldo | **Sisa Uang Kas** |
| Kategori / Akun | **Untuk Apa** (di form) / **Jenis** (di laporan) |
| Periode | **Rentang Tanggal** |
| Dashboard | **Beranda** |
| Filter | **Tampilkan** |
| Transaksi | **Catatan** |
| Submit | **Simpan** |

### P3 — Satu layar, satu tugas

Tidak ada tab di dalam halaman. Tidak ada wizard bertingkat kecuali pengaturan awal.
Form pencatatan adalah satu kolom vertikal dari atas ke bawah, **juga di layar lebar** —
mata yang lelah membaca satu jalur lurus jauh lebih mudah daripada zig-zag dua kolom.

### P4 — Target sentuh besar

- Ukuran font dasar **16px**, teks utama form **17px**.
- Tinggi minimum input dan tombol: **48px**; tombol aksi utama **56px**.
- Jarak antar field: **20px**.
- Tidak ada teks di bawah 13px di mana pun, termasuk keterangan kecil.

### P5 — Uang selalu terbaca penuh

- Selalu `Rp 1.250.000`. Tidak pernah `1,2jt`, `1.25M`, atau `Rp1250000`.
- Uang masuk **hijau**, uang keluar **merah**, konsisten di seluruh aplikasi termasuk grafik.
- Di form, di bawah kolom jumlah muncul **terbilang** otomatis:
  *"Satu juta dua ratus lima puluh ribu rupiah"*. Ini pencegah salah nol yang paling efektif.

### P6 — Konfirmasi yang menyebutkan isinya

Dialog hapus tidak boleh berbunyi "Yakin hapus data ini?". Harus:

> **Hapus catatan ini?**
> Uang Keluar · Santunan Duka
> 20 Januari 2026 · **Rp 2.000.000**
> Kel. Sitorus
>
> Catatan yang dihapus tetap tersimpan di Riwayat dan bisa dikembalikan.

### P7 — Pesan kesalahan berupa kalimat dan jalan keluar

Bukan `Required`. Melainkan:
*"Jumlah uang belum diisi. Tulis dulu berapa rupiah uangnya."*

### P8 — Tidak ada jalan buntu

Setiap halaman kosong punya gambar sederhana, satu kalimat penjelasan, dan satu tombol
untuk melangkah. Setiap kegagalan menyarankan tindakan. Tidak pernah ada layar yang hanya
berisi kode kesalahan.

## 3. Sistem desain

Ditulis sebagai token di `src/app/globals.css` memakai `@theme` Tailwind 4, lalu dipakai
lewat kelas utilitas. Jangan menulis nilai warna mentah di komponen.

### Warna

| Token | Terang | Gelap | Untuk |
| --- | --- | --- | --- |
| `--color-bg` | `#F7F8FA` | `#0F1115` | Latar halaman |
| `--color-surface` | `#FFFFFF` | `#171A21` | Kartu, panel |
| `--color-border` | `#E6E8EC` | `#262A33` | Garis pemisah |
| `--color-text` | `#111827` | `#F3F4F6` | Teks utama |
| `--color-muted` | `#6B7280` | `#9BA3AF` | Teks pendukung |
| `--color-primary` | `#1D4ED8` | `#3B82F6` | Aksen, tombol utama |
| `--color-masuk` | `#047857` | `#34D399` | Uang masuk |
| `--color-keluar` | `#B91C1C` | `#F87171` | Uang keluar |
| `--color-warning` | `#B45309` | `#FBBF24` | Peringatan |

Token turunan (ditambahkan saat implementasi, sudah lolos kontras 4.5:1 di kedua mode):

| Token | Terang | Gelap | Untuk |
| --- | --- | --- | --- |
| `--color-primary-fg` | `#FFFFFF` | `#0F1115` | Teks di atas tombol primary — putih di atas `#3B82F6` hanya 3.7:1 |
| `--color-arah-fg` | `#FFFFFF` | `#0F1115` | Teks di atas tombol masuk/keluar — putih di atas hijau/merah terang < 2:1 |
| `--color-primary-hover` | `#1E40AF` | `#60A5FA` | Hover tombol utama (tanpa `color-mix`, lihat `docs/05` §5) |
| `--color-primary-soft` | `#F3F8FF` | `#0B1734` | Latar item menu aktif, kotak kode pemulihan |
| `--color-masuk-soft` | `#ECFDF5` | `#052E22` | Latar badge/banner uang masuk |
| `--color-keluar-soft` | `#FEF2F2` | `#3B0D0D` | Latar badge/banner uang keluar |
| `--color-warning-soft` | `#FFFBEB` | `#3B2506` | Latar banner peringatan |

Satu warna aksen saja. Hijau dan merah **hanya** dipakai untuk arah uang, tidak pernah
untuk hal lain — supaya maknanya tidak kabur.

Mode gelap ikut pengaturan sistem, dengan tombol pengubah di Pengaturan. Bukan fitur
utama, tapi murah untuk disediakan.

### Tipografi

Font **Plus Jakarta Sans** (punya karakter Indonesia yang baik dan terasa modern),
dimuat lewat `next/font/google` dengan `display: 'swap'`, dan **dibundel lokal** karena
aplikasi harus jalan tanpa internet.

| Peran | Ukuran / bobot |
| --- | --- |
| Angka sisa kas | 40px / 700, `tabular-nums` |
| Judul halaman | 24px / 700 |
| Judul kartu | 18px / 600 |
| Teks isi | 16px / 400 |
| Label form | 15px / 600 |
| Keterangan | 13px / 400, warna `muted` |

Semua angka uang memakai `font-variant-numeric: tabular-nums` supaya kolom nominal
berbaris rapi.

### Bentuk dan jarak

- Radius: kartu `16px`, input dan tombol `12px`, badge `999px`.
- Bayangan: hanya satu tingkat, `0 1px 3px rgb(0 0 0 / 0.06)`. Tidak ada bayangan tebal.
- Grid jarak kelipatan 4px. Padding kartu `24px`, padding halaman `24px` (`16px` di layar sempit).
- Lebar konten maksimum `1200px`, dipusatkan.

### Gerak

Transisi `150ms ease-out` untuk hover dan buka-tutup. Tidak ada animasi masuk halaman,
tidak ada parallax, tidak ada skeleton yang berkedip lama. Hormati
`prefers-reduced-motion`.

## 4. Kerangka aplikasi

**Sidebar kiri tetap** selebar 240px, menciut jadi ikon saja di bawah 1100px, dan menjadi
menu bawah (bottom bar) di bawah 768px. Di menu bawah hanya lima item pertama yang muat
dengan label 13px pada lebar 360px; **Pengaturan pindah ke ikon roda gigi di header**
(di sebelah tombol Kunci) pada lebar itu.

Isi menu — enam item, tidak lebih:

| Ikon | Label | Rute |
| --- | --- | --- |
| `House` | Beranda | `/beranda` |
| `NotebookPen` | Catatan Kas | `/catatan` |
| `FileText` | Laporan | `/laporan` |
| `History` | Riwayat | `/riwayat` |
| `Users` | Anggota | `/anggota` |
| `Settings` | Pengaturan | `/pengaturan` |

Header atas berisi nama STM di kiri dan tombol **Kunci** (kembali ke layar PIN) di kanan.
Tidak ada avatar, tidak ada notifikasi, tidak ada pencarian global.

## 5. Halaman

### 5.1 Pengaturan Awal — `/setup`

Hanya muncul sekali, saat database masih kosong. Tiga langkah, satu pertanyaan per layar,
dengan indikator titik di bawah.

1. **"Selamat datang. Apa nama STM Anda?"** — satu input teks.
   Contoh pembantu di bawah: *"Contoh: STM Setia Kawan Blok C"*.
2. **"Siapa nama Anda?"** — satu input teks. Dipakai di laporan sebagai nama bendahara.
3. **"Buat PIN untuk membuka aplikasi"** — enam kotak angka, lalu diminta mengulang.

Setelah selesai muncul layar **Kode Pemulihan**: satu kode 10 karakter dalam kotak besar,
dengan tombol **Salin** dan **Cetak**. Teksnya:

> Simpan kode ini. Kalau suatu saat Anda lupa PIN, hanya kode ini yang bisa membukanya.
> Tulis di buku, atau cetak dan simpan di tempat aman. Kode ini tidak akan ditampilkan lagi.

Pengguna harus mencentang *"Saya sudah menyimpannya"* untuk lanjut. Ini satu-satunya
gesekan yang sengaja dibuat di seluruh aplikasi, dan alasannya kuat: tanpa email dan tanpa
server, kode ini adalah satu-satunya jalan pulih.

### 5.2 Layar Kunci — `/`

Layar penuh, terpusat, tenang. Dari atas: nama STM, sapaan *"Halo, [nama]"*,
enam kotak PIN, lalu **papan angka di layar** 3×4 (angka 1–9, 0, dan tombol hapus).

Papan angka wajib ada. Pengguna bisa memakai keyboard, tapi tombol besar di layar jauh
lebih nyaman dan langsung terbaca maksudnya.

PIN terverifikasi otomatis begitu digit keenam terisi — tanpa tombol "Masuk".
Salah PIN: kotak bergetar singkat, teks merah *"PIN salah. Coba lagi."*

Di bawah: tautan kecil **Lupa PIN?** yang membuka form kode pemulihan.

### 5.3 Beranda — `/beranda`

Urut dari atas:

1. **Kartu sisa kas**, lebar penuh, latar gradien halus warna primary, teks putih.
   Label *"Sisa Uang Kas"*, angka 40px, di bawahnya *"Diperbarui 20 Januari 2026"*.
   Bila minus, kartu berubah merah dan menambah baris peringatan.
2. **Dua tombol besar** berdampingan, tinggi 64px:
   **+ Catat Uang Masuk** (hijau) dan **− Catat Uang Keluar** (merah).
3. **Dua kartu statistik**: Uang Masuk Bulan Ini, Uang Keluar Bulan Ini,
   masing-masing dengan perbandingan bulan lalu dalam kalimat
   (*"Rp 300.000 lebih banyak dari bulan lalu"*), bukan tanda panah persentase.
4. **Grafik batang 12 bulan** (Recharts) — masuk vs keluar tahun berjalan.
   Sumbu Y memakai rupiah penuh. Tooltip memakai format penuh.
5. **Lima catatan terakhir** dalam daftar sederhana, dengan tombol *Lihat semua*.

### 5.4 Catatan Kas — `/catatan`

Baris filter selalu terlihat, bukan disembunyikan di laci:
tombol cepat **Bulan Ini · Bulan Lalu · Tahun Ini · Pilih Tanggal**, lalu dua dropdown
Jenis dan Untuk Apa, dan kotak pencarian keterangan.

Daftar ditampilkan sebagai **kartu per baris**, bukan tabel rapat:

```
┌─────────────────────────────────────────────┐
│ ↓ Iuran Wajib Anggota          + Rp 1.250.000│
│   Iuran Januari 2026 · Kolektif              │
│   05 Jan 2026 · Tunai · KM-2026-0001    ⋮   │
└─────────────────────────────────────────────┘
```

Kartu terbaca di layar sempit tanpa geser samping, dan jauh lebih mudah dipindai orang
tua daripada tabel sembilan kolom. Menu `⋮` berisi Ubah, Lihat Bukti, Hapus.

Di bawah daftar: tiga angka ringkasan hasil penyaringan (Masuk, Keluar, Selisih),
dihitung di server, bukan dari halaman yang sedang tampil.

Tombol mengambang **+ Catat** di kanan bawah pada layar sempit.

### 5.5 Form Catat — `/catatan/baru` dan `/catatan/[id]/ubah`

Satu kolom, urutan tetap:

1. **Jenis** — dua tombol besar berdampingan, bukan dropdown: `Uang Masuk` / `Uang Keluar`.
   Terpilih otomatis bila datang dari tombol Beranda.
2. **Tanggal** — default hari ini, dengan tiga pintasan `Hari Ini · Kemarin · Pilih Tanggal`.
3. **Untuk apa uangnya?** — daftar pilihan menyesuaikan jenis.
4. **Keterangan** — placeholder *"Contoh: Iuran wajib Januari 2026"*.
5. **Dari / Untuk siapa** — boleh pilih anggota terdaftar atau ketik nama bebas. Opsional.
6. **Jumlah Uang** — prefix `Rp`, pemisah ribuan otomatis saat mengetik,
   `inputMode="numeric"`. Terbilang muncul di bawahnya.
7. **Cara Bayar** — dua tombol: `Tunai` / `Transfer`.
8. **Foto Bukti** — opsional, dengan area seret-dan-lepas dan tombol pilih berkas.
9. **Simpan** (lebar penuh, 56px) dan **Batal**.

Nomor bukti tidak diminta — dibuat otomatis dan ditampilkan setelah tersimpan.

Setelah simpan: kembali ke daftar dengan toast hijau
*"Tersimpan. KM-2026-0007 · Rp 1.250.000"*.

### 5.6 Laporan — `/laporan`

Panel atas: pilihan rentang sebagai tombol — **Harian · Mingguan · Bulanan · Tahunan ·
Pilih Sendiri** — lalu tanggal acuan. Di bawahnya satu kalimat penegas dengan huruf tebal:
**"Menampilkan 1 Januari 2026 sampai 31 Januari 2026"**.

Isi laporan:

1. **Ringkasan** — enam angka dalam kartu: Sisa Kas Awal, Uang Masuk, Uang Keluar,
   Selisih, Sisa Kas Akhir, Jumlah Catatan.
2. **Rincian Uang Masuk per Jenis** — nama jenis, nominal, bar persentase horizontal,
   jumlah catatan.
3. **Rincian Uang Keluar per Jenis** — sama.
4. **Daftar Catatan** dalam rentang tersebut.

Tombol **Cetak** di kanan atas membuka pilihan tiga dokumen (§7 di `docs/02`).

Di bawah blok ringkasan, teks kecil: *"Sisa Kas Awal dan Akhir menunjukkan uang kas
sebenarnya, jadi tidak ikut disaring oleh pilihan jenis di atas."*

### 5.7 Riwayat — `/riwayat`

Linimasa vertikal per hari. Setiap entri: waktu, aksi (badge **Dibuat** / **Diubah** /
**Dihapus**), nomor bukti, dan ringkasan satu baris.

Entri **Diubah** bisa dibuka untuk melihat perbandingan **Sebelum → Sesudah**, hanya field
yang berubah. Perbandingan dihitung di server dan dikirim siap tampil.

Entri **Dihapus** punya tombol **Kembalikan**.

Di bagian atas, kartu **Pemeriksaan Kas**:
Saldo Awal + Uang Masuk − Uang Keluar = Sisa Kas Seharusnya, dibandingkan dengan hitungan
sebenarnya, ditutup badge **Cocok** atau **Tidak Cocok**.

### 5.8 Anggota — `/anggota`

Daftar kartu sederhana: nama, nomor HP, total iuran yang pernah dibayar.
Tambah/ubah lewat panel geser dari kanan, bukan halaman terpisah.

### 5.9 Pengaturan — `/pengaturan`

Satu halaman, beberapa kartu bertumpuk. Tanpa tab.

| Kartu | Isi |
| --- | --- |
| **Identitas STM** | Nama, alamat, nama bendahara, nama ketua — untuk kop laporan |
| **Saldo Awal** | Uang kas sebelum aplikasi ini dipakai, dengan peringatan bahwa mengubahnya mengubah semua laporan |
| **Jenis Uang Masuk & Keluar** | Daftar jenis, bisa tambah/ubah/nonaktifkan. Jenis bawaan tidak bisa dihapus |
| **Keamanan** | Ganti PIN, buat ulang kode pemulihan, kunci otomatis setelah 15 menit |
| **Cadangan Data** | Buat cadangan sekarang, pulihkan dari berkas, daftar cadangan otomatis |
| **Tentang** | Versi aplikasi, lokasi berkas data, tombol buka foldernya |

## 6. Daftar periksa antarmuka

Sebelum sebuah halaman dianggap selesai:

- [ ] Tidak ada istilah dari daftar terlarang P2.
- [ ] Semua tombol dan input ≥ 48px, aksi utama ≥ 56px.
- [ ] Terbaca di lebar 360px tanpa geser samping.
- [ ] Semua nominal memakai format rupiah penuh dan `tabular-nums`.
- [ ] Ada keadaan kosong, keadaan memuat, dan keadaan gagal — ketiganya dengan jalan keluar.
- [ ] Bisa dioperasikan penuh dengan keyboard; fokus terlihat jelas.
- [ ] Kontras teks minimal 4.5:1 di mode terang maupun gelap.
- [ ] Dialog hapus menyebutkan isi catatannya.
