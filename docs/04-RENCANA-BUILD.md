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
| 3 | Kerangka aplikasi (sidebar, header, tema) |
| 4 | Catatan kas — inti aplikasi |
| 5 | Riwayat & log |
| 6 | Laporan |
| 7 | Cetak |
| 8 | Anggota, jenis, pengaturan, cadangan |
| 9 | Electron & pembuatan `.exe` |
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

---

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
