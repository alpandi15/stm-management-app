# 04 — Rencana Pembangunan

Kerjakan **satu fase per sesi**. Setiap fase punya "Bukti selesai" yang harus benar-benar
dijalankan, bukan diasumsikan. Bila sebuah bukti gagal, perbaiki di fase itu juga.

Fase 1–8 dikerjakan di browser biasa (`npm run dev`). Electron baru masuk di Fase 9 —
membangun UI lewat jendela Electron hanya memperlambat tanpa manfaat.

| Fase | Isi |
| --- | --- |
| 0 | Pemeriksaan awal — **selesai** |
| 1 | Fondasi: dependensi, database, sistem desain — **selesai** |
| 2 | Pengaturan awal & login PIN — **selesai** |
| 3 | Kerangka aplikasi (sidebar, header, tema) — **selesai** |
| 4 | Catatan kas — inti aplikasi — **selesai** |
| 5 | Riwayat & log — **selesai** |
| 6 | Laporan — **selesai** |
| 7 | Cetak — **selesai** |
| 8 | Anggota, jenis, pengaturan, cadangan — **selesai** |
| 9 | Electron & pembuatan `.exe` — **selesai di macOS; uji di Windows belum** |
| 10 | Pengujian, penyisiran UI, panduan pengguna |

---

## Fase 0 — Pemeriksaan awal

1. Periksa versi Next.js, React, dan Node di repo. Laporkan apa adanya — dokumen ini
   ditulis untuk App Router; bila yang ada Pages Router, hentikan dan tanyakan.
2. Pastikan TypeScript aktif dengan `strict: true`.
3. Baca `docs/01` dan `docs/02` seluruhnya.

**Bukti selesai:** ringkasan versi yang terbaca dan konfirmasi App Router + strict mode.

**Hasil (18 September 2026):** repo awal adalah `create-next-app` **JavaScript** (bukan
TypeScript) dengan Next 16.3.5 / React 19.2.8, App Router, Node 24 di mesin. Karena target
Windows 7 (`docs/05`), Next diturunkan ke 14.2.35 + React 18.3.1, seluruh berkas diubah ke
TypeScript `strict: true`, dan mesin pengembangan memakai Node 20.20.2 via nvm.

---

## Fase 1 — Fondasi

Buat:

```
src/server/db/{index.ts,schema.ts,migrate.ts,seed.ts}
src/lib/{rupiah.ts,tanggal.ts,validasi.ts,utils.ts}
src/app/globals.css          # token @theme Tailwind 4
drizzle.config.ts
```

Ketentuan:

- Skema lengkap sesuai `docs/02` §3.3, termasuk semua index.
- Pragma `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`.
- Migrasi dijalankan otomatis saat modul database pertama dimuat.
- `rupiah.ts` berisi `formatRupiah(n: number)` dan `terbilang(n: number)`.
  Tulis `terbilang` sendiri secara rekursif (satuan → belasan → puluhan → ratusan →
  ribu → juta → miliar → triliun); jangan menambah dependensi untuk ini.
- Token warna, radius, dan tipografi sesuai `docs/01` §3, ditulis sebagai `@theme`.

**Bukti selesai:**

```bash
npm run db:generate && npm run db:migrate
npm run db:studio   # tabel terlihat, jenis bawaan berjumlah 19
```

Serta unit test kecil untuk `terbilang`: `1250000` menghasilkan
*"satu juta dua ratus lima puluh ribu"*, dan `0` menghasilkan *"nol"*.

Ditambah, karena target Windows 7: **uji runtime Node 16** di `docs/05` §4 harus lolos
sebelum fase berikutnya — kalau fondasinya tidak jalan di Node 16, semua fase setelahnya
sia-sia.

**Hasil (18 September 2026):** semua bukti dijalankan dan lolos —
`db:generate` → `drizzle/0000_skema_awal.sql` (5 tabel, semua index); `db:migrate` dua kali
→ 19 jenis, seed idempoten (0 ditambahkan pada pemanggilan kedua), `journal_mode = wal`;
`npm test` → 12 tes lulus (`rupiah.test.ts`, `tanggal.test.ts`); `typecheck` dan `lint`
bersih; `next build` standalone; server standalone berjalan di Electron 22.3.27 sebagai
Node 16.17.1 dengan polyfill (`electron/polyfill-node16.js`) — halaman berbasis SQLite 200,
Server Action berjalan, tampilan di Chromium 108 benar. Halaman `/` saat ini adalah halaman
uji sementara (`src/app/page.tsx` + `src/server/actions/uji-fondasi.ts`) yang **digantikan
layar kunci di Fase 2** — hapus keduanya saat itu.

---

## Fase 2 — Pengaturan awal & PIN

Buat:

```
src/middleware.ts
src/app/setup/page.tsx  + komponen langkahnya
src/app/(auth)/page.tsx + komponen papan angka
src/server/auth/{session.ts,pin.ts}
src/server/actions/setup.ts
```

Ketentuan sesuai `docs/02` §4. Yang mudah terlewat:

- `middleware.ts` di Next 14 berjalan di edge dan **tidak bisa membuka SQLite**, dan
  pengalihan dari middleware mengubah `127.0.0.1` jadi `localhost` (cookie hilang di
  Electron) — ia hanya memperpanjang cookie; pengalihan dan pemeriksaan "sudah setup?"
  ada di layout/halaman (`docs/02` §4.1).
- Next 14 memakai `useFormState` dari `react-dom` (bukan `useActionState`), dan `cookies()`
  sinkron.
- `/setup` hanya bisa dibuka saat baris pengaturan belum ada — sesudahnya dialihkan.
- Penolakan PIN mudah ditebak (angka sama / berurutan).
- Kode pemulihan memakai alfabet tanpa karakter rancu, ditampilkan sekali,
  dengan centang konfirmasi sebelum lanjut.
- Jeda setelah percobaan gagal disimpan di database, bukan di memori.
- Papan angka di layar wajib ada; PIN terverifikasi otomatis di digit keenam.

**Bukti selesai:** hapus berkas database, jalankan aplikasi, lewati pengaturan awal,
kunci, buka lagi dengan PIN, salah PIN lima kali dan pastikan terkunci sementara,
lalu uji jalur Lupa PIN dengan kode pemulihan.

**Hasil (18 September 2026):** dijalankan dengan skrip pengemudi Electron 22 (Chromium 108)
terhadap server standalone di runtime Node 16 dengan database kosong — 24 langkah lolos:
`/` → `/setup`; wizard 3 langkah; kode pemulihan tampil dan tombol Lanjut nonaktif sebelum
dicentang; `/beranda` menyapa nama bendahara; `/setup` setelah setup dialihkan; Kunci →
layar PIN; salah PIN 5× → *"Terlalu banyak percobaan. Coba lagi dalam 1 menit."*, papan
angka nonaktif, PIN benar pun ditolak selama jeda (jeda tersimpan di DB); setelah 60 detik
hitung mundur habis dan PIN benar membuka; Lupa PIN dengan kode salah ditolak, kode benar
→ PIN baru + kode baru; PIN lama ditolak, PIN baru membuka. `npm test` 16 lulus
(ditambah `pin.test.ts`). Berkas tambahan di luar daftar: `server/actions/auth.ts`
(bukaKunci, kunci, pulihkanPin), `server/auth/{secret,token}.ts`, `server/config.ts`,
`lib/hasil.ts`, `components/ui/{button,input,label,checkbox,pesan-galat}.tsx`,
`components/auth/{InputPin,KotakPin,PapanAngka,KodePemulihan}.tsx`,
`electron/sesi-secret.js`, kerangka sementara `(app)/layout.tsx` + `beranda/page.tsx`.

Dua jebakan yang ditemukan dan ditulis di `docs/02` §4.1–4.2: pengalihan dari middleware
mengubah `127.0.0.1` menjadi `localhost` (cookie hilang di Electron), dan Server Action
yang memasang cookie me-refresh halaman sehingga layar kode pemulihan terlewati.

shadcn/ui: CLI versi terbaru (v4) memasang paket runtime `shadcn`, `cn`, `tw-animate-css`,
font Geist, dan palet oklch — bertentangan dengan token hex untuk Chromium 108. Komponen
UI ditulis sendiri bergaya shadcn di `components/ui/` di atas `radix-ui` +
`class-variance-authority` (keduanya dependensi shadcn sendiri).

---

## Fase 3 — Kerangka aplikasi

Buat `src/app/(app)/layout.tsx` beserta sidebar, header, penyedia tema, dan `sonner`
untuk toast. Beranda diisi kerangka kosong dulu.

Ketentuan: sidebar menciut di bawah 1100px, menjadi bilah bawah di bawah 768px, tombol
Kunci di header, mode gelap mengikuti sistem.

**Bukti selesai:** buka di lebar 360px, 800px, dan 1440px — navigasi berfungsi di ketiganya
tanpa geser samping. Mode gelap tidak menghasilkan teks berkontras rendah.

**Hasil (18 September 2026):** skrip Electron 22 menavigasi keenam rute di 1440/800/360px
lewat tautan yang benar-benar terlihat (sidebar penuh / sidebar ikon / bilah bawah + ikon
header) — 18/18 tanpa geser samping dan tepat satu item aktif; label bilah bawah tidak
terpotong di 360px; pilihan Gelap di Pengaturan menerapkan `data-tema`, menampilkan toast
*"Tampilan diubah."*, dan bertahan setelah muat ulang; "Ikuti komputer" mengikuti perubahan
tema sistem. Kontras seluruh pasangan token dihitung (WCAG): semua ≥ 4.5:1 setelah tiga
token disesuaikan (`primary-fg` dan `arah-fg` gelap di mode gelap, `primary-soft`).

Dua temuan: (1) `tailwind-merge` membuang `text-primary-fg`/`text-arah-fg` karena mengira
bentrok dengan ukuran font kustom (`text-form`) — `cn()` kini didaftari token kita, ada
tesnya di `lib/utils.test.ts`; (2) di bilah bawah hanya lima item yang muat di 360px,
Pengaturan pindah ke ikon header (`docs/01` §4). Berkas: `components/kerangka/*`,
`components/ui/{keadaan-kosong,judul-halaman}.tsx`, `actions/pengaturan.ts` (baru
`aturTema`), halaman kerangka keenam rute, skrip tema inline di `app/layout.tsx`.

---

## Fase 4 — Catatan kas

Inti aplikasi. Selesaikan sampai benar-benar nyaman dipakai sebelum lanjut.

```
src/app/(app)/catatan/{page.tsx,baru/page.tsx,[id]/ubah/page.tsx}
src/server/actions/transaksi.ts
src/server/queries/transaksi.ts
src/server/services/{nomor-bukti.ts,penguncian.ts,log.ts}
src/app/api/bukti/[nama]/route.ts
src/components/keuangan/{FormCatatan,KartuCatatan,BarisFilter,InputRupiah,DialogHapus}.tsx
```

Ketentuan sesuai `docs/02` §5 dan `docs/01` §5.4–5.5. Yang mudah terlewat:

- Kecocokan `jenisId` ↔ `arah` diperiksa di server.
- Nomor bukti dihitung dalam transaksi SQLite dan memperhitungkan catatan terhapus.
- Dialog kemungkinan duplikat, bukan penolakan.
- Hapus bersifat lunak; **semua** query pembacaan memfilter `dihapusPada IS NULL` —
  pakai satu helper query dasar bersama.
- Terbilang muncul saat mengetik jumlah.
- Dialog hapus menyebutkan isi catatan.
- Foto bukti dikompresi di klien, disimpan di folder data, disajikan lewat route handler
  dengan pemeriksaan nama berkas.

**Bukti selesai:** catat lima transaksi lewat UI (campuran masuk dan keluar, satu dengan
foto), ubah salah satu, hapus satu, dan pastikan nomor bukti berurutan serta tidak ada
yang terpakai ulang setelah penghapusan.

**Hasil (18 September 2026):** skrip Electron 22 (Chromium 108 ↔ server Node 16) mengisi
form sungguhan: 5 catatan → `KM-0001, KK-0001 (foto, transfer), KM-0002, KK-0002, KM-0003`;
catatan ke-5 (tanggal+jenis+jumlah sama dengan #1) memunculkan dialog *"Catatan serupa
sudah ada"* dan tersimpan setelah *Tetap Simpan*; terbilang tampil saat mengetik; ubah
KM-0002 (jenis nonaktif di mode ubah); hapus KK-0002 lewat dialog yang menyebutkan isinya;
catatan keluar berikutnya mendapat **KK-0003** (KK-0002 tidak dipakai ulang); foto bukti
terkompresi di klien (2400×1800 PNG → 1600×1200 JPG 18 KB) dan terbuka lewat
`/api/bukti/`; penyaring Uang Keluar dan ringkasan SQL benar; validasi form kosong
memberi 4 kalimat; 360px tanpa geser samping. Log: 5 buat, 1 ubah, 1 hapus, 1 buat.
`npm test` 21 lulus (ditambah `nomor-bukti.test.ts` dengan SQLite in-memory: urut per
arah/tahun, nomor terhapus tidak dipakai ulang, lanjut benar setelah 9999).

Temuan: (1) Node 16 tidak punya `Blob`/`File` global — ditambahkan ke polyfill
(`docs/05` §4); (2) `max()` teks salah setelah nomor 9999 → urutan diambil sebagai angka
lewat `cast(substr(...))`; (3) konstanta yang diekspor dari berkas `'use client'` tidak
bisa dipakai Server Component — pilihan rentang pindah ke `lib/tanggal.ts`; (4) ubah arah
(masuk ↔ keluar) ditolak di mode ubah karena nomor bukti sudah terbit — hapus lalu buat
baru (`services/transaksi.ts`). Berkas tambahan: `server/galat.ts` (GalatPengguna),
`services/{transaksi,bukti,laporan}.ts` (laporan baru `hitungSisaKas`),
`components/ui/{dialog,dropdown-menu,select,pilihan-ganda}.tsx`,
`components/keuangan/{InputBukti,DaftarCatatan,BannerKasMinus}.tsx`, `(app)/not-found.tsx`.
Daftar memakai halaman 50 catatan; ringkasan tetap dari seluruh hasil penyaringan.

---

## Fase 5 — Riwayat & log

```
src/app/(app)/riwayat/page.tsx
src/server/queries/riwayat.ts
```

Ketentuan: log ditulis dari service penyimpanan (sudah dibuat di Fase 4), perbandingan
Sebelum→Sesudah dihitung di server dan hanya menampilkan field yang berubah, tombol
Kembalikan untuk entri terhapus, dan kartu Pemeriksaan Kas di bagian atas.

**Bukti selesai:** ubah satu catatan lalu pastikan hanya field yang benar-benar berubah
yang muncul. Hapus dan kembalikan satu catatan, lalu pastikan Pemeriksaan Kas kembali
berstatus Cocok.

**Hasil (18 September 2026):** di Electron 22 / Node 16 dengan data Fase 4 — linimasa
per hari terbaru dulu (Dibuat, Dihapus, Diubah, …); entri Diubah KM-2026-0002 hanya
menampilkan satu baris *Jumlah Rp 500.000 → Rp 750.000*; tombol Kembalikan pada entri
Dihapus KK-2026-0002 → toast, entri baru *Dikembalikan*, tombol hilang, KK-2026-0002
tampil lagi di Catatan Kas; Pemeriksaan Kas **Cocok** (Rp 855.000 = Rp 855.000). Uji
ketahanan: angka KM-2026-0001 diubah langsung lewat sqlite3 tanpa aplikasi → **Tidak
Cocok**; dipulihkan → Cocok lagi.

Pemeriksaan Kas dibuat sebagai pemeriksaan sungguhan: rumus dari tabel `transaksi`
(saldo awal + Σ masuk − Σ keluar) dibandingkan dengan **pemutaran ulang seluruh log**
(buat +, hapus −, kembalikan +, ubah selisih) — dua jalur hitung yang terpisah, sehingga
"Tidak Cocok" berarti ada baris yang berubah di luar aplikasi atau log yang hilang.
Berkas: `queries/riwayat.ts`, `services/laporan.ts` (`periksaKas`),
`components/riwayat/{KartuPemeriksaan,EntriRiwayat}.tsx`, halaman riwayat berhalaman 50.

---

## Fase 6 — Laporan

```
src/app/(app)/laporan/page.tsx + komponen
src/server/services/laporan.ts
src/server/queries/laporan.ts
src/app/(app)/beranda/page.tsx    # isi sungguhan, memakai service yang sama
```

`services/laporan.ts` adalah satu-satunya tempat rumus keuangan hidup. Beranda memanggil
service yang sama, bukan query sendiri.

Ketentuan sesuai `docs/02` §6. Yang mudah terlewat:

- Minggu dimulai Senin.
- Sisa Kas Awal dan Akhir mengabaikan penyaring jenis/metode.
- Persentase dijaga dari pembagian nol.
- Agregasi memakai `sum()`/`count()` SQL, bukan menjumlahkan di JavaScript.

**Bukti selesai:** buat transaksi tepat di tanggal 1 dan tanggal terakhir sebuah bulan,
lalu pastikan keduanya terhitung di rentang Bulanan. Uji minggu yang melintasi pergantian
tahun. Pastikan angka di Beranda sama persis dengan Laporan rentang Tahunan.

**Hasil (18 September 2026):** rumus hidup di `services/laporan-rumus.ts` (murni, menerima
Db) dengan 6 tes SQLite in-memory: batas bulan (1 dan 28 Feb ikut, 31 Jan dan 1 Mar tidak),
minggu 29 Des 2025 – 4 Jan 2026, penyaring jenis tidak mengubah Sisa Kas Awal/Akhir,
catatan terhapus tidak ikut, persen per jenis (0 bila total 0), grafik 12 bulan.
`services/laporan.ts` mengikatnya ke database (`susunLaporan`, `dataBeranda`). Lewat UI di
Electron 22 / Node 16: catatan 1 Agu + 31 Agu (+ 31 Jul sebagai pembanding) → Bulanan
Agustus masuk 100.000, keluar 40.000, 2 catatan, Sisa Kas Awal 1.593.000 (= 500.000 saldo
awal + semua sebelum 1 Agu); Mingguan acuan 1 Jan 2026 → *29 Desember 2025 sampai
4 Januari 2026*, 111.000/22.000, catatan 5 Jan tidak ikut; Harian 31 Agu benar; penyaring
jenis Iuran: masuk berubah, Sisa Kas Akhir tetap 1.653.000; **Beranda Sisa Kas =
Laporan Tahunan Sisa Kas Akhir (Rp 2.508.000)** dan Uang Masuk/Keluar Bulan Ini = Laporan
Bulanan. Grafik Recharts: sumbu Y rupiah penuh, legenda urutan tetap dengan teks token,
tabel alternatif; palet batang divalidasi untuk buta warna (mode gelap memakai
`--color-grafik-*` yang lebih gelap). 360px tanpa geser samping.

Catatan: tombol **Cetak** di Laporan menyusul di Fase 7 bersama rutenya — supaya tidak ada
tautan buntu. Gradien kartu sisa kas ditulis sebagai utilitas sendiri (`gradien-primary`)
karena `bg-linear-*` Tailwind 4 memakai sintaks `in oklab` yang tidak dikenal Chromium 108.

---

## Fase 7 — Cetak

```
src/app/cetak/[dokumen]/page.tsx
src/app/cetak/cetak.css
src/components/keuangan/cetak/{Kop,TandaTangan}.tsx
```

Ketentuan sesuai `docs/02` §7. Uji dengan sekitar 300 baris untuk memastikan judul kolom
berulang di setiap halaman dan tidak ada baris yang terpotong di tengah.

**Bukti selesai:** ketiga dokumen tercetak rapi lewat pratinjau cetak browser di kertas A4,
dan angkanya sama dengan tampilan layar untuk rentang yang sama. Nama bendahara kosong
menghasilkan garis tanda tangan kosong, bukan tulisan "null".

**Hasil (18 September 2026):** 300 baris uji disisipkan (total 308 dalam rentang 1 Agu –
18 Sep 2026); ketiga dokumen dirender di Electron 22 dan diekspor `printToPDF` A4:
`ringkas` 2 halaman (Sisa Kas Akhir Rp 36.983.000 dan 308 catatan = layar Laporan),
`buku-kas` lanskap 18 halaman dengan judul kolom berulang dan baris utuh (diperiksa
visual halaman 2), `pemeriksaan` 2 halaman dengan 15 perubahan dalam rentang. Tidak ada
"null"/"undefined" di dokumen mana pun; nama ketua kosong → garis kosong. Berita Acara
menunjukkan TIDAK COCOK — benar, karena 300 baris uji masuk tanpa log (database uji
dikembalikan sesudahnya). Tombol Cetak di Laporan membuka pilihan tiga dokumen dengan
rentang/penyaring yang sedang tampil.

Keputusan: Buku Kas mengabaikan penyaring jenis/cara bayar (saldo berjalan hanya bermakna
untuk seluruh catatan). Nomor halaman: Chromium tidak mendukung `@page` margin box, jadi
nomor halaman datang dari header/footer bawaan dialog cetak (opsi *Headers and footers*)
dan, di Electron, dari `footerTemplate` pada `printToPDF` (Fase 9). `?cetak=0` mematikan
pemanggilan `window.print()` otomatis (dipakai pengujian).

---

## Fase 8 — Anggota, jenis, pengaturan, cadangan

```
src/app/(app)/anggota/page.tsx
src/app/(app)/pengaturan/page.tsx
src/server/actions/{anggota.ts,jenis.ts,pengaturan.ts,cadangan.ts}
src/server/services/cadangan.ts
src/app/api/cadangan/route.ts
```

Ketentuan:

- Jenis bawaan tidak bisa dihapus — ditegakkan di server, bukan hanya tombol dinonaktifkan.
- Jenis yang sudah dipakai catatan tidak bisa dihapus; tangkap galat kunci asing dan ubah
  jadi pesan Indonesia yang menyarankan menonaktifkannya saja.
- Ganti PIN meminta PIN lama.
- Cadangan otomatis dengan `VACUUM INTO` saat aplikasi dibuka, sisakan 10 berkas.
- Pulihkan menampilkan ringkasan isi berkas sebelum konfirmasi.

**Bukti selesai:** buat cadangan, tambah beberapa catatan, pulihkan cadangan tadi, dan
pastikan data kembali ke keadaan semula beserta cadangan otomatis "sebelum-pulihkan".

**Hasil (18 September 2026):** 26 langkah di Electron 22 / Node 16 (mode browser, tanpa
`window.stm`): cadangan otomatis `stm-YYYYMMDD-HHmm.db` tercipta saat aplikasi dibuka;
anggota ditambah lewat panel geser, validasi nama pendek, catatan atas nama anggota
menaikkan *Total iuran* di kartunya; jenis baru "Arisan Bulanan" ditambah, tombol Hapus
hanya ada untuk jenis buatan sendiri, hapus jenis yang sudah dipakai ditolak dengan
kalimat yang menyarankan nonaktifkan (galat kunci asing ditangkap), nonaktifkan berhasil;
ganti PIN dengan PIN lama salah ditolak, PIN mudah ditebak ditolak, PIN benar diganti dan
membuka kunci; tutup pembukuan sampai 31 Agustus → catatan 15 Agustus ditolak dengan pesan
docs/02 §5.5, buka penguncian; **Buat Cadangan Sekarang** membuat `manual-*.db` + unduhan
`/api/cadangan`; tambah 2 catatan (8 → 10); Pulihkan dari daftar menampilkan ringkasan
(nama STM, jumlah catatan, rentang, sisa kas) → 8 catatan lagi, `sebelum-pulihkan-*.db`
tercipta, Pemeriksaan Kas Cocok; saldo awal 1.500.000 langsung mengubah sisa kas Beranda.

Keputusan: koneksi database dipegang lewat Proxy (`db/index.ts`) sehingga pulihkan cukup
menutup dan membuka ulang koneksi tanpa mulai ulang proses — berlaku di browser maupun
Electron. Di Electron, alur cadangan: `window.stm.pilihLokasiCadangan()` → path →
`cadangkanKeLokasi(path)` (VACUUM INTO tetap di server); pulihkan:
`pilihBerkasPulihkan()` → `periksaBerkasPulihkan(path)` → dialog → `pulihkanDari(path)`.
Di browser: unduhan `/api/cadangan` dan unggah berkas lewat Server Action. Kartu **Tutup
Pembukuan** ditambahkan di Pengaturan (dibutuhkan docs/02 §5.5, belum tercantum di
tabel docs/01 §5.9). Jenis: kode buatan pengguna melanjutkan PMxx/PKxx; arah jenis tidak
bisa diubah setelah dibuat.

---

## Sisipan — pilihan bisa dicari, kalender, logo (18 September 2026)

Atas permintaan: semua `<select>` diganti `PilihanCari` (cmdk) termasuk kolom "Dari /
Untuk siapa" yang kini menerima anggota terdaftar **atau** nama bebas dari kotak yang sama;
semua `<input type="date">` diganti `PilihTanggal` (react-day-picker, Senin pertama,
dropdown bulan/tahun, tanggal masa depan nonaktif); logo `src/assets/logo-app.png`
dipasang di layar kunci, pengaturan awal, sidebar, header sempit; favicon dan
`build/icon.ico` dibuat oleh `scripts/buat-ikon.mjs`. Diuji di Electron 22 / Node 16:
cari "santun" → satu hasil, nama bebas "Ibu Marni" tersimpan sebagai `nama_pihak`,
kalender memilih 2 September dan mengunci tanggal setelah hari ini, penyaring Catatan Kas
dan Laporan bekerja lewat combobox/kalender, 360px tanpa geser samping.

## Sisipan — Spesifikasi Pembaruan 2 (`docs/STM_KEUANGAN_SPEC_2.md`), 18 September 2026

Spec 2 ditulis untuk repo Laravel `stm-management-lite`; diterjemahkan ke arsitektur ini
dengan aturan bisnis yang sama. Pemetaan:

| Spec 2 | Di repo ini |
| --- | --- |
| `keuangan_anggota_keluarga` | tabel `anggota_keluarga` (migrasi `0001_keluarga_nominal_periode.sql`) |
| kolom `status`, `tanggal_meninggal`, `ditandai_oleh_transaksi_id` | kolom sama di `anggota` dan `anggota_keluarga`; `anggota_asal_id`, `tanggal_bergabung`, `pindah_ke_anggota_id` (Bagian C) |
| `keuangan_tipe.menandai_meninggal`, `nominal_bawaan`, `nominal_dikunci`, `periode` | kolom sama di `jenis`; nominal INTEGER rupiah penuh |
| `PenandaMeninggalService` + `TransaksiObserver` | `services/penanda-meninggal.ts` (murni, menerima Db) dipanggil dari `services/transaksi.ts` pada buat/ubah/hapus/kembalikan — bukan dari Server Action |
| `TransaksiRequest::after()` | `services/aturan-catatan.ts`: `periksaKeluargaMilik`, `periksaNominal`, `cariDuplikat` per periode |
| Route keluarga | halaman `/anggota/[id]/keluarga` + aksi `tambahKeluarga/ubahKeluarga/hapusKeluarga/pecahKeluarga` |
| `?jenis=masuk&tipe=PM11&anggota=` | dibaca `catatan/baru/page.tsx` sebagai nilai awal form |
| Permission | tidak ada (aplikasi satu pengguna) |
| Test §A8, §B7 | `services/penanda-meninggal.test.ts` (9 tes: penanda, batal, manual tak tersentuh, pindah sasaran, ganti jenis, kepemilikan, kunci nominal, duplikat per periode, seed 21) |

Tambahan atas permintaan: **nomor anggota** (`anggota.nomor`, unik, disarankan `A-0001`
berurutan tapi bisa diubah) dan **alamat dengan pin peta** (Leaflet + ubin OpenStreetMap,
pusat bawaan 3.5916998, 98.7858193; `anggota.lat/lng` REAL). Peta adalah **pengecualian
aturan tanpa internet**: ubin butuh koneksi; tanpa koneksi peta kosong tapi pin dan
koordinat tetap tersimpan. Marker memakai SVG inline supaya tidak bergantung berkas Leaflet.

**Hasil uji (Electron 22 / Node 16, 30 langkah):** PM01 nominal 50.000 + kunci → form
mengisi 50.000, `readOnly`, petunjuk; iuran kedua bulan sama → dialog *"Sepertinya Budi
Santoso sudah membayar Iuran Wajib Anggota untuk September 2026 (nomor bukti KM-2026-0006).
Tetap simpan?"*; sakelar penanda hanya tampil untuk uang keluar; label opsi *Iuran Wajib
Anggota · Rp 50.000 / bulan*; nomor anggota disarankan A-0001; klik peta → koordinat
tersimpan; tiga tanggungan (satu meninggal manual); santunan untuk Ani → kotak *"Siapa yang
meninggal?"*, kalimat penegas, kartu catatan *Meninggal: Ani Santoso · Istri*, DB Ani
meninggal dengan penanda; santunan kedua → peringatan santunan ganda; hapus → Ani aktif
lagi, Nenek (manual) tetap meninggal; santunan tanpa tanggungan menandai Budi sendiri;
pecah Cahyo → anggota baru "Pecah KK, bergabung 18 September 2026", induk menampilkan
*Sudah jadi anggota sendiri*, diarahkan ke `/catatan/baru?jenis=masuk&tipe=PM11&anggota=3`
dengan jenis dan nama terisi; tombol pecah tidak tampil untuk yang meninggal; 360px tanpa
geser samping.

Jebakan E1 (tanggal sebagai UTC) tidak berlaku: semua tanggal `TEXT 'YYYY-MM-DD'`. E2 (soft
delete melewati FK) sudah ditangani sejak Fase 8: pemakaian diperiksa eksplisit.

## Sisipan — Iuran Duka, menu Jenis Uang, daftar anggota besar, peta anggota (18 September 2026)

- Jenis bawaan `PM12` Iuran Duka (seed idempoten menambahkannya ke pemasangan lama saat
  start; 22 jenis).
- Menu **Jenis Uang** (`/jenis`) terpisah dari Pengaturan; Pengaturan menyisakan tautan.
- Keterangan catatan terisi otomatis dari jenis dan boleh diubah (`FormCatatan`).
- Daftar anggota: 25 per halaman, pencarian & penyaring di server (`daftarAnggota(filter,
  halaman)`, `ringkasanAnggota()`), tabel di layar lebar, kartu di layar sempit.
- `/peta`: halaman penuh, `semuaTitikAnggota()`, klaster marker, pencarian menyaring marker.
- Uji dengan 300 anggota acak di sekitar Medan (Electron 22 / Node 16): 13 halaman,
  cari "Sari Nas" → 1 hasil lewat URL tanpa kehilangan fokus, penyaring Meninggal, peta
  16 klaster + 8 marker tunggal untuk 301 titik, cari "Budi" menyaring 13 marker dan
  popup terbuka saat hasil diklik, keterangan otomatis mengikuti jenis tapi tidak menimpa
  yang diketik sendiri, 360px tanpa geser samping (baris halaman dibuat membungkus).

## Sisipan — Penyetor & tim pengutip (langkah 1 dari 3, 18 September 2026)

Kolom `penyetor_anggota_id` di transaksi dan `pengutip` di anggota (migrasi 0002). Form
catat mendapat kolom *Disetor oleh / Diserahkan oleh* (pilihan bisa cari, pengutip di
kelompok teratas, bawaan *Bendahara (sendiri)*); kartu & Buku Kas menyebutnya; penyaring
di Catatan Kas & Laporan; **Rekap per Penyetor** di Laporan dan cetak ringkas; riwayat
membandingkan "Penyetor". Uji Electron 22 / Node 16: tandai pengutip → badge dan penyaring
*Tim pengutip (1)*; catatan disetor Rahmat → kartu *Disetor oleh Bpk. Rahmat Hidayat*;
label uang keluar *Diserahkan oleh*; penyaring `?penyetor=1` → 1 catatan; rekap Bendahara
12 catatan / Rahmat 1; ubah penyetor → riwayat *Penyetor Bpk. Rahmat Hidayat → Bendahara*.
Tes `rekapPenyetor` (38 tes).

**Langkah 2 — setoran kolektif** (`docs/02` §5.1b): migrasi 0003 (`periode`, `setoranId`,
tabel `setoran`, isi periode catatan lama). Uji Electron 22 / Node 16: PM01 terkunci
50.000, periode Oktober, penyetor Rahmat, 4 anggota dicentang (Eko 3 bulan) → ringkasan
*4 anggota · 6 catatan · Rp 300.000*, `SI-2026-0001`, Eko mendapat KM-0010/0011/0012 untuk
Okt/Nov/Des; Budi yang bayar September tampil *Sudah bayar September 2026 · KM-2026-0007*
hanya saat periode September; mengulang Oktober → 4 abu-abu, November → Eko abu-abu;
tanda terima 12 baris → PDF; Buku Kas: subjudul *Setoran SI-2026-0001 · disetor oleh …*
+ subtotal; hapus setoran → 0 catatan hidup, 6 entri Dihapus di Riwayat dengan Kembalikan;
360px tanpa geser samping. 40 tes (periode eksplisit, tambahBulan).

**Perombakan setoran kolektif (banyak jenis, modal anggota)** — `docs/02` §5.1b diperbarui.
Uji Electron 22 / Node 16: jenis utama Iuran Wajib (kunci 50.000, Desember), modal
"centang semua" menambah 6 anggota, Budi + Iuran Tahunan 120.000 + Iuran Duka 2 almarhum
× 10.000, kartu tanpa nama 4 orang → *7 anggota · 9 catatan · Rp 640.000*; DB: Budi
KM-0034 Des, KM-0035 "Iuran Tahunan — 2026", KM-0036 "Iuran duka alm. Nenek Sumi & alm.
Budi Santoso" 20.000; tanpa nama "… — Desember 2026 (4 orang)" 200.000. Temuan: kunci
nominal harus dibandingkan per satuan untuk catatan gabungan; migrasi yang membangun ulang
tabel butuh `PRAGMA foreign_keys=OFF` **sebelum** transaksi migrasi (diatur di `db/index.ts`,
diperiksa `foreign_key_check` sesudahnya). Nama PM12 → "Iuran Duka / Kemalangan" (migrasi 0005).

**Jenis kelamin & keluarga saat tambah anggota** (migrasi `0007_jenis_kelamin.sql`): kolom
`jenis_kelamin` (`L`/`P`, boleh kosong) di `anggota` dan `anggota_keluarga`. Form Tambah
Anggota memuat bagian *Keluarga / tanggungan* (nama, hubungan, jenis kelamin; disimpan
satu transaksi bersama anggota lewat `skemaAnggotaBaru`); Ubah Anggota mengarahkan ke
halaman Keluarga. Aturan: **Istri selalu perempuan, Suami selalu laki-laki** — pilihan
terkunci di form (`PilihJenisKelamin`) dan dipaksa lagi di action (`jenisKelaminDariHubungan`),
apa pun yang dikirim klien. Pecah KK membawa jenis kelamin tanggungan ke anggota baru. Uji
Electron 22: anggota + 3 keluarga (Istri → P terkunci, Anak → P dipilih, Anak → kosong) →
DB sesuai; ubah Siti (Istri) tombol terkunci; detail anggota menampilkan "Jenis kelamin".

**Form catat — "Dari anggota" & jumlah**: label "Dari siapa" → "Dari anggota (boleh kosong)"
dengan kotak info: isi bila dari satu anggota; kutipan banyak anggota → kosongkan dan tulis
ringkasan di keterangan, atau pakai Catat Iuran Kolektif (tautan). Petunjuk Jumlah Uang
menyesuaikan: nominal terkunci + tanpa nama → kolom bisa diisi total, harus kelipatan nominal
(petunjuk menghitung "= 12 orang"); dengan nama tetap terkunci. Uji Electron 22: Iuran Wajib
tanpa nama Rp 600.000 tersimpan (KM-2026-0042), Rp 75.000 ditolak, dengan nama Dewi tetap
`readOnly` 50.000.

**Peta di Windows 7, tautan Google Maps, bilah muat** (19 September 2026): laporan pemilik —
peta OSM kosong di paket `.exe` pada Windows 7. Penyebab yang paling masuk akal: toko
sertifikat Windows 7 tanpa akar Let's Encrypt (Chromium 108 memakai toko Windows). Solusi:
ubin lewat `/api/ubin/{z}/{x}/{y}` dengan cache di folder data (`docs/02` §5.1d) — sekaligus
peta tetap tampil offline untuk area yang pernah dibuka. Tautan peta di detail & daftar
anggota → Google Maps. **Tirai muat satu layar** (`kerangka/TiraiMuat.tsx`, atas permintaan
pemilik): `PemantauNavigasi` menyalakannya saat tautan internal diklik dan mematikannya saat
pathname berubah; `(app)/loading.tsx` menampilkan tirai yang sama sampai isi halaman tiba.
Temuan: pathname berubah saat batas loading tampil (rute sudah di-prefetch), bukan saat isi
tiba — jadi `setAktif(true)` tidak boleh ditunda, kalau tidak tirai tertinggal; kedip halaman
instan dicegah animasi muncul tertunda 100 ms. **Daftar tanggungan** di detail anggota jadi
kartu sendiri (`anggota/DaftarTanggungan.tsx`): avatar inisial, hubungan, jenis kelamin,
umur (`umurTahun`), status meninggal + tanggal, keterangan, dan chip "sudah jadi anggota
sendiri" bertaut ke anggotanya.
Uji Electron 22/Node 16: proxy 200 `image/png` 1.610 B, cache tertulis, ambil kedua 1 ms,
ubin tak valid 400, halaman peta memuat 24 ubin dari `/api/ubin/15/…`, tirai tampil satu layar
saat navigasi diperlambat 1,5 s dan hilang saat tiba (juga tidak tertinggal pada navigasi
instan), tautan detail `google.com/maps?q=3.5916998,98.7858193`, daftar tanggungan 4 orang +
1 pecah tanpa geser samping di 360px.

**Buku Duka + form ramah lansia** (19 September 2026): `docs/02` §5.1e dan `docs/01` §4.
Migrasi `0008_buku_duka.sql` (`kejadian_duka`, `pembayaran_duka`, `anggota.tanggal_nonaktif`).
`lib/duka.ts` + 6 tes aturan wajib (bergabung belakangan, almarhum sendiri, meninggal
sebelumnya, nonaktif dengan/tanpa tanggal, tunggakan mengikuti tarif tiap kejadian).
Uji Electron 22/Node 16 (`uji-duka.js`): menu 8 item; kejadian 1 "Bpk. Karim" 10 Jun 2024
Rp 5.000 lewat kalender inline di panel; kejadian 2 dipilih dari data (Nenek Sumi → nama,
"Orang Tua dari Budi Santoso", tanggal terisi) tarif bawaan 5.000 diubah 7.000; kejadian 1
wajib 4 (Budi, Dewi, Fitri nonaktif sejak 2025-02, Gani meninggal 2024-12) dan 2 tidak wajib
(Eko bergabung 2025-07, Cahyo 2026-09); centang Dewi → DB + kepala 1/4; tandai semua → 4;
hapus centang Budi → 3; detail Budi "Menunggak 2 kejadian Rp 12.000" (5.000 + 7.000); saring
nunggak-duka: Budi 2, Dewi 1, Eko 1; cetak tunggakan kejadian 2: 3 baris. Form catat:
kalender inline, tanpa Hari Ini/Kemarin, footer `sticky`, tepi input 2px `#8a93a6`.

**Tunggakan lama & centang di detail anggota** (19 September 2026): `docs/02` §5.1e. Model
pertama (satu angka per anggota) ditolak pemilik: buku manual mencatat per kelompok tarif
("6 × 5.000 pengurus lama, 10 × 7.000 pengurus baru") dan itu harus tampil jelas — diganti tabel
`tunggakan_duka_lama` (migrasi 0010 memindahkan data 0009). Uji Electron 22 (`uji-duka2/3.js`):
centang Karim langsung di detail → DB + ringkasan; migrasi 0010 memindahkan baris Dewi 2 ×
5.000; tambah dua baris sekaligus (tarif saran 5.000 terisi) → kartu "6 × Rp 5.000 = Rp 30.000"
dan "10 × Rp 7.000 = Rp 70.000", ringkasan Menunggak 18 · Rp 112.000; bayar 4 dari 6 → sisa 2;
Lunas Semua → baris hilang; bayar 11 dari 10 ditolak; badge daftar "Nunggak duka 12 (termasuk
10 tunggakan lama)".

**Sidebar tablet & tombol Kembali**: sidebar penuh 240px di laptop dan desktop (≥ 1024px);
di 768–1023px sidebar ikon melebar ke 240px saat
kursor/fokus keyboard berada di atasnya (menimpa isi, bukan menggeser; `z-20` di atas header)
sehingga nama menu terbaca sebelum diklik. Halaman Catat dan Catat Iuran Kolektif memiliki
tombol **Kembali** (`TombolKembali`, ke `/catatan`) di kepala halaman.

**Langkah 3 — detail anggota** (`docs/02` §5.1c): `/anggota/[id]` dengan matriks periode dan
riwayat; nama di daftar, popup peta, dan halaman keluarga menautkannya. Uji: setoran Eko
Jul–Sep → matriks 2026 `––––––✓✓✓···` (Okt–Des "belum jatuh tempo"), Iuran Tahunan
per tahun, riwayat 6 catatan dengan tautan setoran, 360px tanpa geser samping. Bug yang
tertangkap lewat uji ini: kode jenis buatan pengguna bentrok dengan bawaan baru (PM10),
seed melewati Iuran Tahunan — diperbaiki (kode `UMxx/UKxx` + migrasi 0004); pada database
uji `UM10 Arisan Bulanan` dan `PM10 Iuran Tahunan` kini sama-sama ada (23 jenis).

## Fase 9 — Electron

Ikuti `docs/03` seluruhnya, dan `docs/05` untuk Windows 7.

```
electron/{main.js,preload.js,memuat.html}       # jalankan-server.js & polyfill sudah ada sejak Fase 1
scripts/salin-standalone.mjs
build/icon.ico
```

Urutan yang disarankan:

1. Jalankan `next build` dan pastikan `.next/standalone/server.js` bisa dijalankan manual
   dengan `node` — sebelum menyentuh Electron sama sekali.
2. Baru bungkus dengan Electron dalam mode pengembangan.
3. Terakhir `electron-builder`.

**Bukti selesai:** seluruh daftar periksa di `docs/03` §9, terutama pemasangan di komputer
bersih tanpa Node.js **dan di VM Windows 7 SP1 32-bit**.

**Hasil (18 September 2026):** `electron/{main.js,preload.js,memuat.html,logo.png}`,
`scripts/{salin-standalone,unduh-native,dev-electron}.mjs`, konfigurasi `build` di
`package.json`, `electron-builder` 24.13.3 sebagai devDependency (dependensi baru, alasan:
satu-satunya cara membuat NSIS + portable ia32/x64 dari macOS tanpa Wine).
`npm run dist:win` di macOS menghasilkan `release/AplikasiKasSTM-Setup-0.1.0.exe` (148 MB,
ia32+x64), `AplikasiKasSTM-Portable-0.1.0-ia32.exe` (72 MB), `-x64.exe` (76 MB), dan
`-Portable-0.1.0.exe` gabungan. Isi paket diperiksa: `resources/standalone/` berisi
`server.js`, `drizzle/` (9 migrasi), `.next/static`, `public`, dan `better_sqlite3.node`
yang **berbeda per arch** (ia32 2,3 MB / x64 2,9 MB); asar 140 KB tanpa `node_modules`.
Alur proses utama diuji lewat paket macOS (`--mac dir`, prebuild darwin dari uji `docs/05`
§4): layar muat → fork `jalankan-server.js` → migrasi → jendela membuka `/setup`; data di
`Application Support/Aplikasi Kas STM/data/` (`stm.db`, `.secret`, `aplikasi.log`); keluar
mematikan server (log "berhenti, kode 0", port tertutup). Temuan: (1) `productName` harus di
tingkat atas `package.json`, kalau tidak `userData` bernama `stm-management-app`; (2) `files`
harus mengecualikan `node_modules` (asar 306 MB → 140 KB); (3) penyalinan `.node` per arch tidak boleh lewat makro `${platform}` (= platform mesin
pembangun) — paket Windows pertama yang diuji pemilik di Windows 10 x64 gagal 500 "Could not
locate the bindings file"; diganti hook `afterPack` `scripts/pasang-native.js` yang memakai
platform/arch target dan diverifikasi ada di kedua paket. **Belum dilakukan** (butuh mesin Windows): daftar
periksa `docs/03` §9 — pemasangan di komputer bersih, VM Windows 7 SP1 32/64-bit, cetak PDF,
cadangan, portable dari flash disk.

---

## Fase 10 — Pengujian & panduan

Buat pengujian untuk bagian yang salahnya tidak terlihat:

| Berkas | Yang diuji |
| --- | --- |
| `rupiah.test.ts` | Format dan terbilang, termasuk 0, satuan, belasan, dan miliar |
| `tanggal.test.ts` | Rentang periode, termasuk minggu lintas bulan dan tahun |
| `laporan.test.ts` | Seluruh rumus §6.2, dengan data di batas rentang |
| `nomor-bukti.test.ts` | Urutan berlanjut dan tidak memakai ulang nomor terhapus |
| `pin.test.ts` | Penolakan PIN mudah, jeda bertambah, kode pemulihan |

Lalu dua panduan berbahasa Indonesia untuk dicetak:

- `docs/PANDUAN-PEMASANGAN.md` — cara memasang, termasuk langkah melewati peringatan
  SmartScreen, dengan gambar.
- `docs/PANDUAN-PEMAKAIAN.md` — dua halaman, satu kalimat per langkah: cara membuka,
  mencatat uang masuk, mencatat uang keluar, mencetak laporan bulanan, membuat cadangan,
  dan apa yang harus dilakukan bila salah input.

**Bukti selesai:**

```bash
npm run typecheck && npm run lint && npm test && npm run dist:win
```

Keempatnya bersih.

---

## Aturan kerja

1. **Jangan membuat pola baru** bila polanya sudah ada di berkas lain.
2. **Jangan menambah dependensi** di luar `CLAUDE.md` tanpa menuliskan alasannya.
3. **Jangan menjalankan `electron-rebuild` sebelum Fase 9** — akan merusak `npm run dev`.
   Untuk menguji di runtime Node 16, pakai salinan terpisah seperti di `docs/05` §4.
4. **Jangan menaikkan versi yang dikunci di `docs/05` §2.** Setiap menaikkan versi paket
   lain, ulangi uji `docs/05` §4.
5. **Setiap akhir fase**, laporkan: berkas yang dibuat/diubah, bukti selesai yang
   dijalankan beserta hasilnya, dan hal yang sengaja ditunda.
6. **Bila dokumen bertentangan dengan kenyataan kode, tanyakan.** Jangan menebak.
