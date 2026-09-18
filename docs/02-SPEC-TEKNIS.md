# 02 — Spesifikasi Teknis

## 1. Stack dan alasannya

| Bagian | Pilihan | Kenapa |
| --- | --- | --- |
| Framework | Next.js **14.2** App Router + TypeScript, React **18.3** | Server Actions menghapus kebutuhan menulis API. Versi 14 karena harus jalan di Node 16 (`docs/05`) |
| Database | SQLite via `better-sqlite3` **9.6.0** | Satu berkas, tanpa server, mudah dicadangkan. Versi 9.6.0 karena prebuild Electron 22 ia32 (`docs/05`) |
| ORM | Drizzle ORM + Drizzle Kit | Ringan, migrasi berupa berkas SQL biasa, tidak membawa biner engine seperti Prisma |
| Styling | Tailwind CSS 4 + shadcn/ui | Komponen disalin ke repo, bukan dependensi — bebas disesuaikan untuk target sentuh besar |
| Ikon | lucide-react | |
| Grafik | Recharts | Cukup untuk satu grafik batang |
| Validasi | Zod | Satu skema dipakai di klien dan server |
| Form | React Hook Form + `@hookform/resolvers` | |
| Sesi | `jose` **4.x** (JWT di cookie httpOnly) | Murni JavaScript, tanpa modul native. 4.x karena 5.x butuh Node 18 |
| Hash PIN | `bcryptjs` | Murni JavaScript — penting, lihat catatan di bawah |
| Tanggal | `date-fns` + `date-fns/locale/id` | |
| Peta alamat | `leaflet` + `leaflet.markercluster` + ubin OpenStreetMap | Pin alamat anggota (permintaan pengguna). Satu-satunya fitur yang butuh internet; tanpa koneksi pin/koordinat tetap bekerja |
| Pilihan & kalender | `cmdk` + `react-day-picker` | Komponen Combobox dan Calendar shadcn/ui: semua pilihan bisa dicari (pengganti `<select>`), pemilih tanggal berbahasa Indonesia dengan dropdown bulan/tahun. Keduanya hanya berjalan di klien |
| Desktop | Electron **22.3.27** + electron-builder | Lihat `docs/03` dan `docs/05` — versi terakhir untuk Windows 7 |
| Uji | `node --test` + `tsx` | Bawaan Node; `tsx` hanya untuk menjalankan `.ts` tanpa langkah kompilasi |

**Catatan `bcryptjs`, bukan `bcrypt`.** Setiap modul native tambahan berarti satu lagi yang
harus dikompilasi ulang untuk ABI Electron. `better-sqlite3` sudah tidak terhindarkan;
jangan menambah beban kedua demi selisih kecepatan hash yang tidak akan pernah terasa
pada satu pengguna.

## 2. Setup dari nol

Sudah dikerjakan pada Fase 1; ditinggalkan di sini sebagai catatan.

### 2.1 Dependensi

Versi yang dikunci ada di `docs/05` §2 dan tercermin di `package.json`. Ringkasnya:

```bash
nvm use    # Node 20
npm i next@14.2 react@18.3.1 react-dom@18.3.1 better-sqlite3@9.6.0 jose@4 \
      drizzle-orm zod react-hook-form @hookform/resolvers bcryptjs date-fns \
      recharts lucide-react clsx tailwind-merge server-only
npm i -D typescript @types/node@20 @types/react@18 @types/react-dom@18 \
      @types/better-sqlite3 drizzle-kit tailwindcss @tailwindcss/postcss \
      eslint@8 eslint-config-next@14.2 tsx electron@22.3.27
# Fase 9: electron-builder @electron/rebuild cross-env
```

`bcryptjs` 3.x sudah membawa tipe sendiri, tidak perlu `@types/bcryptjs`. `server-only`
dipakai di `src/server/db/index.ts` supaya impor tak sengaja dari komponen klien gagal
saat build, bukan saat dijalankan.

**Pilihan dan tanggal.** Tidak ada `<select>` maupun `<input type="date">` di aplikasi:
semua pilihan memakai `components/ui/pilihan-cari.tsx` (Popover + cmdk, dengan kotak
cari, kelompok, dan mode `bolehBebas` untuk nama anggota/nama bebas), semua tanggal
memakai `components/ui/pilih-tanggal.tsx` (Popover + `components/ui/kalender.tsx`, minggu
mulai Senin, `captionLayout="dropdown"`, tanggal di luar batas dinonaktifkan, `required`
supaya klik ulang tidak membatalkan pilihan).

**Logo dan ikon.** Sumber `src/assets/logo-app.png`; `public/logo-app.png` (512px)
dipakai `components/kerangka/Logo.tsx` di layar kunci, pengaturan awal, sidebar, dan
header layar sempit. `scripts/buat-ikon.mjs` membuat `src/app/favicon.ico` dan
`build/icon.ico` (7 ukuran, entri PNG) dari sumber itu — jalankan ulang bila logo berubah.

**shadcn/ui tanpa CLI.** CLI shadcn v4 memasang paket runtime (`shadcn`, `cn`,
`tw-animate-css`), font Geist, dan palet oklch yang tidak dikenal Chromium 108. Karena itu
komponen ditulis langsung di `src/components/ui/` mengikuti pola shadcn (cva + Radix) di
atas token kita: `radix-ui` (paket tunggal semua primitif) dan `class-variance-authority`.
Saat butuh komponen baru (dialog, sheet, select, dropdown, switch), tulis dengan pola yang
sama — lihat `button.tsx` dan `checkbox.tsx` sebagai contoh.

### 2.2 Struktur folder

```
src/
  app/
    (auth)/page.tsx                  # layar kunci PIN (rute "/")
    setup/page.tsx                   # pengaturan awal
    (app)/
      layout.tsx                     # sidebar + header, wajib sudah login
      beranda/page.tsx
      catatan/page.tsx
      catatan/baru/page.tsx
      catatan/[id]/ubah/page.tsx
      laporan/page.tsx
      riwayat/page.tsx
      anggota/page.tsx
      pengaturan/page.tsx
    cetak/[dokumen]/page.tsx         # halaman khusus cetak, tanpa sidebar
    api/
      bukti/[nama]/route.ts          # menyajikan foto bukti dari disk
      cadangan/route.ts              # unduh berkas cadangan
  server/
    db/
      index.ts                       # koneksi better-sqlite3 + Drizzle
      schema.ts                      # seluruh tabel
      migrate.ts                     # jalankan migrasi saat aplikasi start
      seed.ts                        # 19 jenis bawaan
    auth/
      session.ts                     # buat/baca/hapus cookie sesi
      pin.ts                         # hash, verifikasi, batas percobaan
    actions/                         # Server Actions, satu berkas per domain
      transaksi.ts  jenis.ts  anggota.ts  pengaturan.ts  setup.ts  cadangan.ts
    queries/                         # baca data untuk RSC
      transaksi.ts  laporan.ts  riwayat.ts  beranda.ts
    services/
      nomor-bukti.ts  laporan.ts  log.ts  penguncian.ts  cadangan.ts
      transaksi.ts                     # service penyimpanan: buat/ubah/hapus/kembalikan + log
      bukti.ts                         # simpan/hapus berkas foto, validasi nama berkas
    galat.ts                           # GalatPengguna: pesan untuk pengguna dari service
  lib/
    rupiah.ts                        # format + terbilang
    tanggal.ts                       # rentang periode, format Indonesia
    validasi.ts                      # skema Zod bersama
    utils.ts                         # cn()
  components/
    ui/                              # shadcn
    keuangan/                        # komponen domain
electron/
  main.js  preload.js  memuat.html
  jalankan-server.js  polyfill-node16.js   # pembungkus server untuk Node 16 (docs/05 §4)
drizzle/                             # hasil drizzle-kit; ikut disalin ke bundel
data/                                # database saat mode pengembangan (di .gitignore)
```

Berkas uji diletakkan di sebelah berkas yang diuji (`src/lib/rupiah.test.ts`), dijalankan
`npm test` (`node --test` lewat `tsx`).

### 2.3 Variabel lingkungan

Semuanya punya nilai bawaan supaya aplikasi tetap jalan tanpa berkas `.env`.

| Nama | Bawaan | Isi |
| --- | --- | --- |
| `STM_DATA_DIR` | `./data` | Folder database dan foto bukti. Diisi Electron ke `userData` saat terbundel |
| `STM_MIGRATIONS_DIR` | `<cwd>/drizzle` | Folder berkas migrasi. Di bundel, `drizzle/` ikut ke `standalone/` sehingga bawaan sudah benar |
| `STM_SESSION_SECRET` | dibuat sekali lalu disimpan di `STM_DATA_DIR/.secret` | Kunci penanda cookie sesi |
| `STM_SERVER_JS` | `<cwd>/server.js` | Hanya untuk `electron/jalankan-server.js`: lokasi `server.js` standalone |

Sengaja **tidak** memakai `.env` untuk rahasia sesi. Aplikasi terbundel tidak punya tempat
aman menyimpan `.env`, dan pengguna tidak akan pernah mengisinya. Kunci dibuat sendiri
saat pertama jalan lalu disimpan di folder data.

## 3. Database

### 3.1 Koneksi

```ts
// src/server/db/index.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const file = path.join(process.env.STM_DATA_DIR ?? './data', 'stm.db')
const sqlite = new Database(file)

sqlite.pragma('journal_mode = WAL')   // tulis-baca bersamaan lebih aman
sqlite.pragma('foreign_keys = ON')    // SQLite mematikannya secara bawaan
sqlite.pragma('busy_timeout = 5000')

export const db = drizzle(sqlite, { schema })
export { sqlite }
```

`foreign_keys = ON` wajib ditulis eksplisit. SQLite mematikan penegakan kunci asing secara
bawaan, jadi tanpa baris ini relasi di skema hanya jadi dokumentasi.

Koneksi dibuat sekali sebagai modul singleton. Di mode pengembangan Next melakukan hot
reload yang bisa membuat koneksi ganda — simpan instance di `globalThis` seperti pola
umum Prisma/Drizzle.

### 3.2 Aturan tipe data

SQLite tidak punya `DECIMAL` maupun `DATE`. Karena itu:

| Data | Tipe SQLite | Bentuk |
| --- | --- | --- |
| **Uang** | `INTEGER` | Rupiah penuh, tanpa sen. `1250000` berarti Rp 1.250.000 |
| **Tanggal kejadian** | `TEXT` | `'2026-01-05'`, bisa dibandingkan dan diurutkan langsung sebagai teks |
| **Waktu sistem** | `INTEGER` | Unix milidetik |
| **Boolean** | `INTEGER` | 0 / 1 |
| **JSON** | `TEXT` | Hasil `JSON.stringify` |

**Jangan pernah menyimpan uang sebagai `REAL`.** Menyimpan rupiah sebagai bilangan pecahan
akan menghasilkan sisa `0.000001` yang membuat pemeriksaan kas tidak pernah cocok, dan
kesalahan itu baru ketahuan berbulan-bulan kemudian. Rupiah tidak punya pecahan dalam
praktik STM, jadi integer adalah representasi yang benar, bukan sekadar yang praktis.

Tanggal sebagai `TEXT 'YYYY-MM-DD'` dipilih supaya `WHERE tanggal BETWEEN ? AND ?` bekerja
tanpa konversi dan tanpa jebakan zona waktu. Seluruh perhitungan tanggal dilakukan di
JavaScript dengan waktu lokal, tidak pernah UTC.

### 3.3 Skema

```ts
// src/server/db/schema.ts — ringkasan; tulis lengkap dengan tipe Drizzle
export const pengaturan = sqliteTable('pengaturan', {
  id: integer('id').primaryKey(),                  // selalu 1
  namaStm: text('nama_stm').notNull(),
  alamat: text('alamat'),
  namaBendahara: text('nama_bendahara').notNull(),
  namaKetua: text('nama_ketua'),
  saldoAwal: integer('saldo_awal').notNull().default(0),
  tanggalMulai: text('tanggal_mulai').notNull(),
  terkunciSampai: text('terkunci_sampai'),
  pinHash: text('pin_hash').notNull(),
  pemulihanHash: text('pemulihan_hash').notNull(),
  gagalLogin: integer('gagal_login').notNull().default(0),
  kunciSampai: integer('kunci_sampai'),             // unix ms
  autoKunciMenit: integer('auto_kunci_menit').notNull().default(15),
  tema: text('tema').notNull().default('sistem'),
  dibuatPada: integer('dibuat_pada').notNull(),
  diubahPada: integer('diubah_pada').notNull(),
})

export const jenis = sqliteTable('jenis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  arah: text('arah', { enum: ['masuk', 'keluar'] }).notNull(),
  keterangan: text('keterangan'),
  urutan: integer('urutan').notNull().default(0),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  bawaan: integer('bawaan', { mode: 'boolean' }).notNull().default(false),
})

export const anggota = sqliteTable('anggota', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  noHp: text('no_hp'),
  alamat: text('alamat'),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  dibuatPada: integer('dibuat_pada').notNull(),
})

export const transaksi = sqliteTable('transaksi', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noBukti: text('no_bukti').notNull().unique(),
  tanggal: text('tanggal').notNull(),                     // YYYY-MM-DD
  arah: text('arah', { enum: ['masuk', 'keluar'] }).notNull(),
  jenisId: integer('jenis_id').notNull().references(() => jenis.id),
  anggotaId: integer('anggota_id').references(() => anggota.id),
  namaPihak: text('nama_pihak'),
  keterangan: text('keterangan').notNull(),
  metode: text('metode', { enum: ['tunai', 'transfer'] }).notNull().default('tunai'),
  jumlah: integer('jumlah').notNull(),                    // rupiah penuh
  buktiFile: text('bukti_file'),
  dihapusPada: integer('dihapus_pada'),                   // soft delete
  dibuatPada: integer('dibuat_pada').notNull(),
  diubahPada: integer('diubah_pada').notNull(),
}, (t) => ({
  idxTanggal: index('idx_trx_tanggal').on(t.tanggal),
  idxArahTanggal: index('idx_trx_arah_tanggal').on(t.arah, t.tanggal),
  idxJenis: index('idx_trx_jenis').on(t.jenisId),
}))

export const log = sqliteTable('log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transaksiId: integer('transaksi_id'),      // tanpa FK, agar bertahan setelah hapus permanen
  noBukti: text('no_bukti'),
  aksi: text('aksi', { enum: ['buat', 'ubah', 'hapus', 'kembalikan'] }).notNull(),
  dataLama: text('data_lama'),               // JSON
  dataBaru: text('data_baru'),               // JSON
  dibuatPada: integer('dibuat_pada').notNull(),
}, (t) => ({ idxWaktu: index('idx_log_waktu').on(t.dibuatPada) }))
```

Kolom `arah` di `transaksi` sengaja menduplikasi `jenis.arah`. Laporan tahunan menjumlahkan
ribuan baris, dan melakukan join hanya untuk mengetahui arah uang adalah beban yang tidak
perlu. Konsistensinya dijaga di satu tempat — service penyimpanan menyalin ulang nilainya
dari jenis yang dipilih, bukan menerima dari form.

### 3.4 Migrasi dan seed

`drizzle.config.ts` menunjuk ke `src/server/db/schema.ts`, keluaran ke `drizzle/`.

Migrasi **dijalankan otomatis saat aplikasi start**, bukan lewat perintah manual:

```ts
// dipanggil sekali dari src/server/db/index.ts
migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
```

Alasannya penting untuk aplikasi desktop: pengguna memperbarui aplikasi dengan menjalankan
installer baru, dan tidak akan pernah mengetik perintah migrasi. Skema harus menyesuaikan
diri sendiri saat dibuka.

Seed 19 jenis bawaan (`bawaan = true`, idempoten berdasarkan `kode`):

Uang masuk — `PM01` Iuran Wajib Anggota (bulanan), `PM02` Iuran Sukarela, `PM03` Uang
Pangkal Anggota Baru (sekali), `PM04` Sumbangan / Donasi, `PM05` Denda Anggota, `PM06`
Hasil Usaha & Kegiatan, `PM07` Pengembalian Pinjaman, `PM08` Jasa / Bunga Bank, `PM09`
Penerimaan Lain-lain, `PM10` Iuran Tahunan (tahunan), `PM11` Uang Pangkal Anggota Pecah dari
Orang Tua (sekali), `PM12` Iuran Duka. Total **22** jenis. `PK01` berperiode sekali dan satu-satunya yang
`menandaiMeninggal`. Seed tidak pernah menulis nominal — itu milik pengurus.

Uang keluar — `PK01` Santunan Duka / Kemalangan, `PK02` Bantuan Sakit / Rawat Inap,
`PK03` Bantuan Pernikahan, `PK04` Konsumsi Rapat & Kegiatan, `PK05` Transportasi &
Akomodasi, `PK06` Perlengkapan & ATK, `PK07` Sewa Tempat & Peralatan, `PK08` Biaya
Administrasi Bank, `PK09` Sumbangan Sosial Keluar, `PK10` Pengeluaran Lain-lain.

## 4. Pengaturan awal dan login PIN

### 4.1 Penentuan keadaan

Dua pemeriksaan pada setiap permintaan halaman:

1. Baris `pengaturan` id=1 belum ada → arahkan ke `/setup`.
2. Sudah ada tapi cookie sesi tidak sah → arahkan ke `/` (layar kunci).

**Pembagian tugasnya penting.** Di Next 14, `middleware.ts` selalu berjalan di edge
runtime dan **tidak bisa membuka SQLite**. Selain itu `NextURL` milik Next mengganti
`127.0.0.1` menjadi `localhost` pada setiap pengalihan dari middleware — di Electron, yang
memuat `http://127.0.0.1:PORT`, itu berarti pindah origin dan cookie sesi hilang. Karena itu:

- `middleware.ts` **tidak mengalihkan**. Ia hanya memperpanjang cookie sesi yang sah
  (`jose`, murni JS, jalan di edge) dan membersihkan yang tidak sah.
- Pengalihan ke layar kunci dilakukan `wajibSesi()` (`server/auth/session.ts`) yang
  dipanggil di awal `src/app/(app)/layout.tsx` **dan setiap halaman** di bawahnya —
  layout tidak dirender ulang pada navigasi antar halaman, jadi halaman harus memeriksa
  sendiri. `redirect()` dari Server Component menghasilkan `Location` relatif yang aman.
- Pemeriksaan **"pengaturan sudah ada?"** juga di Server Component:
  `(app)/layout.tsx` dan `(auth)/page.tsx` memanggil `queries/pengaturan.ts` lalu
  `redirect('/setup')` bila belum ada; `setup/page.tsx` melakukan kebalikannya.
- Setiap Server Action dibungkus `aksiTerlindungi()` yang memeriksa sesi sendiri.

Rute `/setup` hanya bisa diakses saat keadaan (1). Setelah pengaturan dibuat, membuka
`/setup` langsung diarahkan ke `/` — supaya tidak ada jalan menimpa PIN lewat URL.
Server Action `selesaikanSetup()` **juga** menolak bila baris sudah ada — pengalihan di
halaman hanya kenyamanan, penolakan di server yang menentukan.

### 4.2 Pengaturan awal

Server Action `selesaikanSetup()` menerima nama STM, nama pengguna, dan PIN,
lalu dalam satu transaksi SQLite:

1. Validasi Zod: nama minimal 3 karakter; PIN tepat 6 digit angka.
2. Tolak PIN yang terlalu mudah ditebak: enam angka sama (`111111`), atau berurutan
   naik/turun (`123456`, `654321`). Pesannya ramah, bukan menggurui:
   *"PIN ini terlalu mudah ditebak. Coba angka lain supaya catatan uang Anda aman."*
3. Hash PIN dengan bcryptjs, cost 10.
4. Buat kode pemulihan 10 karakter dari alfabet tanpa karakter rancu
   (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — tanpa I, O, 0, 1), format `XXXXX-XXXXX`,
   simpan hash-nya, kembalikan versi terangnya **sekali saja** untuk ditampilkan.
5. Isi `tanggalMulai` dengan tanggal hari ini.
6. Jalankan seed jenis bawaan.
7. **Jangan membuat sesi di sini.** Server Action yang memasang cookie membuat Next
   me-refresh halaman; `/setup` lalu mengalihkan ke `/beranda` dan layar Kode Pemulihan
   terlewati sebelum terbaca. Sesi dibuat lewat `bukaKunci(pin)` saat pengguna menekan
   *Lanjut ke Beranda* setelah mencentang *"Saya sudah menyimpannya"*. Berlaku sama untuk
   `pulihkanPin()` di §4.5.

### 4.3 Verifikasi PIN

Server Action `bukaKunci(pin)`:

1. Bila `kunciSampai` masih di masa depan → tolak dengan sisa waktu dalam detik.
2. Bandingkan dengan `bcrypt.compare`.
3. Salah → `gagalLogin += 1`. Pada kelipatan 5, set `kunciSampai` dengan jeda bertambah:
   percobaan ke-5 jeda 1 menit, ke-10 jeda 5 menit, ke-15 dan seterusnya 15 menit.
4. Benar → nolkan `gagalLogin` dan `kunciSampai`, buat sesi.

Jeda disimpan di database, bukan di memori, supaya menutup aplikasi tidak meniadakan
hukumannya.

### 4.4 Sesi

JWT ditandatangani `jose` HS256, berisi `{ v: 1, iat, exp }` — tanpa data pribadi karena
penggunanya hanya satu. Cookie `stm_sesi`: `httpOnly`, `sameSite: 'lax'`,
`secure: false` (aplikasi berjalan di `http://localhost` dalam Electron), masa berlaku
mengikuti `autoKunciMenit`.

Sesi diperpanjang otomatis pada setiap navigasi. Kunci otomatis terjadi karena tidak ada
aktivitas, bukan karena batas waktu mutlak.

Tombol **Kunci** di header menghapus cookie dan kembali ke layar PIN.

### 4.5 Lupa PIN

Form meminta kode pemulihan. Bila cocok: pengguna langsung diminta membuat PIN baru,
kode pemulihan lama dibatalkan, dan kode baru ditampilkan sekali.

Bila kode juga hilang, tidak ada jalan masuk — dan itu memang benar. Sampaikan apa adanya
di halaman bantuan: *"Data Anda tetap aman di komputer ini, tapi tanpa PIN atau kode
pemulihan, aplikasi tidak bisa dibuka. Inilah kenapa kode pemulihan perlu dicatat."*
Jangan membuat pintu belakang berupa kata sandi induk; itu membuat seluruh PIN tidak ada
artinya.

## 5. Aturan bisnis

### 5.1 Validasi catatan

Satu skema Zod di `src/lib/validasi.ts`, dipakai di form dan di Server Action.
Validasi klien untuk kenyamanan; validasi server adalah yang menentukan.

| Field | Aturan | Pesan |
| --- | --- | --- |
| `tanggal` | wajib, ≤ hari ini, ≥ `tanggalMulai` | "Tanggal belum diisi." / "Tanggal tidak boleh melewati hari ini." |
| `arah` | wajib | "Pilih dulu Uang Masuk atau Uang Keluar." |
| `jenisId` | wajib, ada, **dan `arah` jenis harus sama dengan `arah` catatan** | "Pilihan tidak sesuai. Pilih ulang dari daftar." |
| `keterangan` | wajib, 3–255 karakter | "Keterangan belum diisi. Tulis singkat untuk apa uang ini." |
| `jumlah` | wajib, bilangan bulat, 1 – 999.999.999.999 | "Jumlah uang belum diisi." / "Jumlah uang harus lebih dari nol." |
| `metode` | wajib | "Pilih cara pembayarannya." |
| `buktiFile` | opsional, gambar, ≤ 5 MB | "Foto bukti terlalu besar. Maksimal 5 MB." |

Kecocokan `jenisId` dengan `arah` **wajib diperiksa di server**. Ini satu-satunya cara isi
laporan bisa salah arah tanpa terlihat, dan dropdown di klien tidak bisa dipercaya.

### 5.2 Kemungkinan duplikat

Saat menyimpan, cari catatan lain yang belum terhapus. Bila ada, **jangan tolak** — duplikat
asli memang terjadi. Kembalikan status `perluKonfirmasi` beserta kalimat dan nomor bukti
yang mirip, tampilkan dialog, dan simpan ulang dengan `abaikanDuplikat: true` bila pengguna
memilih lanjut. Aturannya bergantung pada `jenis.periode` (Spec 2 §B4, `services/aturan-catatan.ts`):

| `periode` | Dianggap duplikat bila ada catatan lain dengan |
| --- | --- |
| `bebas`, atau nama lepas tanpa anggota | tanggal + jenis + jumlah sama |
| `bulanan` | anggota + jenis + bulan & tahun sama |
| `tahunan` | anggota + jenis + tahun sama |
| `sekali` | anggota + jenis, kapan pun |

### 5.1a Penyetor dan tim pengutip

Setiap catatan boleh menyebut **siapa yang membawa uangnya**: `transaksi.penyetorAnggotaId`
(anggota terdaftar; kosong = bendahara sendiri). Label mengikuti arah: uang masuk *"Disetor
oleh"*, uang keluar *"Diserahkan oleh"*. Anggota bertanda `pengutip` (tim pengutip iuran)
muncul paling atas di pilihannya. Tampil di kartu, Buku Kas, riwayat perubahan
("Penyetor"), jadi penyaring di Catatan Kas & Laporan (`penyetor=<id>|bendahara`), dan
Laporan memuat **Rekap per Penyetor** (`rekapPenyetor()` di `laporan-rumus.ts`) — juga di
dokumen cetak ringkas.

### 5.1b Periode eksplisit dan setoran kolektif

`transaksi.periode` menyimpan periode yang dibayar (`'2026-10'` bulanan, `'2026'` tahunan;
null untuk jenis bebas/sekali) — **eksplisit, bukan diturunkan dari tanggal**, karena
tanggal setor 18 September bisa membayar Oktober. Form catat memilih "Untuk bulan/tahun"
(bawaan mengikuti tanggal). Deteksi duplikat per periode (`cariDuplikat`) dan daftar
"sudah bayar" (`sudahBayar`) memakai kolom ini; migrasi 0003 mengisinya untuk catatan lama.

**Setoran kolektif** (`setoran` + `transaksi.setoranId`, `services/setoran.ts`): satu
kejadian pengutip menyetor iuran banyak anggota. Satu catatan per anggota **per periode**
(baris boleh membayar n bulan/tahun sekaligus → n catatan, keterangan ditambah nama
periode), semuanya dalam satu transaksi SQLite lewat `buatCatatan()` — nomor bukti
berurutan, log, kunci nominal, penanda, dan penguncian berlaku otomatis. Nomor setoran
`SI-2026-0001` per tahun. Hanya untuk uang masuk. Hapus setoran = hapus lunak semua
catatannya lewat service (masing-masing bisa dikembalikan dari Riwayat). Halaman:
`/catatan/setoran` (daftar), `/catatan/setoran/baru` (daftar centang; yang sudah bayar
periode itu abu-abu dengan nomor buktinya), `/catatan/setoran/[id]` (detail + hapus),
`/cetak/setoran/[id]` (tanda terima untuk pengutip). Buku Kas mengelompokkan baris satu
setoran dengan subjudul dan subtotal.

### 5.2a Nominal per jenis dan penanda meninggal (Spec 2)

- `jenis.nominalBawaan` mengisi kolom Jumlah saat jenis dipilih; `nominalDikunci` membuat
  kolom `readOnly` **dan** server menolak `jumlah ≠ nominal` (`periksaNominal`). Mengubah
  nominal tidak mengubah catatan lama. Label opsi: `Iuran Wajib Anggota · Rp 50.000 / bulan`.
- `jenis.menandaiMeninggal` (hanya uang keluar, dipaksa false untuk uang masuk): mencatat
  jenis ini atas nama anggota menandai sasarannya meninggal — `anggotaKeluargaId` bila
  terisi, kalau tidak anggotanya sendiri, kalau nama lepas tidak ada yang ditandai.
  `services/penanda-meninggal.ts`: `terapkan` (buat, kembalikan), `batalkan` (hapus, lewat
  `ditandaiOlehTransaksiId`, bukan sasaran saat ini), `segarkan` (ubah). Sasaran yang sudah
  meninggal tidak disentuh; status manual (penanda kosong) tidak pernah dibatalkan.
- `anggotaKeluargaId` wajib milik `anggotaId` — diperiksa di server (`periksaKeluargaMilik`).

### 5.3 Nomor bukti

Format `KM-2026-0001` / `KK-2026-0001`, diurutkan per arah per tahun.
Dihitung di dalam transaksi SQLite, dan **memperhitungkan catatan yang sudah dihapus**:

```ts
const awalan = `${arah === 'masuk' ? 'KM' : 'KK'}-${tahun}-`
const terakhir = db.select({ n: max(transaksi.noBukti) })
  .from(transaksi).where(like(transaksi.noBukti, `${awalan}%`)).get()
const urut = terakhir?.n ? Number(terakhir.n.slice(-4)) + 1 : 1
```

Nomor yang sudah dipakai lalu dihapus tidak boleh dipakai ulang, karena nomornya sudah
terlanjur tertulis di kuitansi fisik yang dipegang warga.

Dalam implementasi, `max()` diambil sebagai **angka** (`max(cast(substr(no_bukti, 9) as
integer))`), bukan `max()` teks seperti cuplikan di atas: setelah `0009999`, `"10000"` lebih
kecil dari `"9999"` secara teks dan nomornya akan kembar. Ada tes untuk kasus ini.

Konsekuensi nomor yang sudah terbit: **arah catatan tidak bisa diubah** di mode ubah
(KM tidak bisa jadi KK). Pesannya menyarankan hapus lalu buat baru.

better-sqlite3 bersifat sinkron dan aplikasi ini satu pengguna, jadi membungkus proses
baca-lalu-tulis dengan `sqlite.transaction(...)` sudah cukup untuk menjamin tidak ada
nomor kembar.

### 5.4 Hapus dan kembalikan

Hapus mengisi `dihapusPada`, tidak menghapus baris. Semua query pembacaan menambahkan
`isNull(transaksi.dihapusPada)`. Buat satu helper query dasar dan pakai di semua tempat —
satu saja yang lupa, angkanya akan berbeda dari halaman lain.

Catatan terhapus masih tampil di Riwayat dan bisa dikembalikan.

### 5.5 Penguncian periode

Bila `terkunciSampai` terisi, catatan dengan tanggal ≤ nilai itu tidak bisa dibuat, diubah,
atau dihapus. Diperiksa di satu tempat: `services/penguncian.ts`, dipanggil dari ketiga
Server Action. Pesan: *"Pembukuan sampai [tanggal] sudah ditutup. Buka dulu penguncian di
Pengaturan bila memang perlu diperbaiki."*

Berbeda dengan versi multi-pengguna, di sini pengguna boleh membuka penguncian sendiri —
ia memang pemilik tunggal datanya. Penguncian di sini berfungsi sebagai pagar terhadap
kekeliruan, bukan pembatasan wewenang.

### 5.6 Kas minus

Diizinkan disimpan — bendahara kadang menalangi lebih dulu. Tapi munculkan banner
menetap di Beranda dan di Catatan Kas: *"Sisa uang kas tercatat minus Rp X. Coba periksa
kembali catatan Anda."*

### 5.7 Pencatatan log

Ditulis dari **service penyimpanan**, bukan dari Server Action, sehingga setiap jalur
penulisan tercatat. `dataLama` dan `dataBaru` disimpan sebagai JSON utuh dari baris
transaksi; perbandingan field dihitung saat menampilkan, bukan saat menyimpan — supaya
bisa dibaca ulang dengan cara berbeda di kemudian hari.

**Pemeriksaan Kas** (`services/laporan.ts` → `periksaKas()`) membandingkan dua jalur:
rumus dari tabel `transaksi` melawan pemutaran ulang seluruh log (buat +jumlah, hapus
−jumlah, kembalikan +jumlah, ubah selisih baru−lama). Karena itu log **tidak boleh
dihapus atau dipangkas** — ia adalah pembanding independen bagi tabel transaksi.

## 6. Laporan

Seluruh rumus hidup di `src/server/services/laporan-rumus.ts` (fungsi murni yang menerima
`Db`, sehingga bisa diuji dengan SQLite in-memory) dan diikat ke database sungguhan oleh
`src/server/services/laporan.ts` (`susunLaporan`, `dataBeranda`, `hitungSisaKas`,
`periksaKas`). Beranda, halaman Laporan, dan dokumen cetak semuanya memanggil service yang
sama. Ini yang menjamin angkanya tidak pernah berbeda antar halaman.

### 6.1 Menentukan rentang

```ts
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

// minggu dimulai hari Senin — konvensi Indonesia
const opsi = { weekStartsOn: 1 as const }
```

| Pilihan | Awal | Akhir |
| --- | --- | --- |
| Harian | tanggal acuan | tanggal acuan |
| Mingguan | `startOfWeek(acuan, opsi)` | `endOfWeek(acuan, opsi)` |
| Bulanan | `startOfMonth` | `endOfMonth` |
| Tahunan | `startOfYear` | `endOfYear` |
| Pilih Sendiri | input pengguna | input pengguna |

Hasilnya diubah ke `'yyyy-MM-dd'` sebelum dipakai di query.

### 6.2 Rumus

| Angka | Cara hitung |
| --- | --- |
| Sisa Kas Awal | `saldoAwal` + Σ masuk (`tanggal < awal`) − Σ keluar (`tanggal < awal`) |
| Uang Masuk | Σ `jumlah` where `arah='masuk'`, dalam rentang, lolos penyaring |
| Uang Keluar | Σ `jumlah` where `arah='keluar'`, dalam rentang, lolos penyaring |
| Selisih | Uang Masuk − Uang Keluar |
| Sisa Kas Akhir | Sisa Kas Awal + Σ masuk dalam rentang **tanpa penyaring** − Σ keluar dalam rentang **tanpa penyaring** |
| Rincian per jenis | `groupBy(jenisId)` dengan `sum(jumlah)` dan `count()` |
| Persentase | nilai ÷ total arah tersebut; **bila total 0 maka 0** |

Sisa Kas Awal dan Akhir sengaja mengabaikan penyaring jenis, metode, dan pencarian,
karena keduanya menggambarkan posisi uang yang sebenarnya — bukan irisan yang sedang
dilihat. Perbedaan ini harus dijelaskan di layar (lihat `docs/01` §5.6).

Semua penjumlahan memakai agregat SQL (`sum()`, `count()`), bukan mengambil seluruh baris
lalu menjumlahkan di JavaScript.

### 6.3 Yang harus diuji

Buat data uji dengan transaksi tepat di tanggal pertama dan tanggal terakhir rentang,
lalu pastikan keduanya ikut terhitung. Kesalahan `<` versus `<=` di batas periode adalah
galat paling sering di aplikasi keuangan, dan tidak akan terlihat sampai tutup buku.

Uji juga minggu yang melintasi pergantian bulan dan tahun (misalnya 29 Desember 2025 –
4 Januari 2026).

## 7. Cetak

Karena aplikasi berjalan di Electron, cetak memakai jalur asli browser — tanpa pustaka PDF
tambahan.

Rute `/cetak/[dokumen]` merender halaman bersih tanpa sidebar, dengan CSS cetak
(`@page { size: A4; margin: 15mm }`), lalu memanggil `window.print()` saat siap.
Di Electron, dialog cetak asli Windows muncul lengkap dengan pilihan **Microsoft Print to
PDF**, sehingga pengguna bisa menyimpan PDF tanpa kode tambahan.

| Dokumen | Isi | Orientasi |
| --- | --- | --- |
| `ringkas` | Kop, ringkasan, rincian per jenis, blok tanda tangan | Potret |
| `buku-kas` | Kop, daftar seluruh catatan dalam rentang dengan kolom saldo berjalan | Lanskap |
| `pemeriksaan` | Kop, hasil pemeriksaan kas, daftar perubahan dalam rentang, tanda tangan | Potret |

Ketentuan:

- Kop berisi nama STM, alamat, judul dokumen, dan kalimat rentang tanggal.
- `thead { display: table-header-group }` supaya judul kolom berulang tiap halaman.
- Nomor halaman di kanan bawah. Chromium tidak mendukung `@page { @bottom-right }`, jadi
  nomor halaman berasal dari header/footer bawaan dialog cetak (aktif secara bawaan) dan,
  untuk *Simpan sebagai PDF* di Electron, dari `footerTemplate` `printToPDF` dengan
  `<span class="pageNumber">`.
- Buku Kas mengabaikan penyaring jenis/cara bayar: saldo berjalan hanya bermakna untuk
  seluruh catatan. Laporan ringkas dan pemeriksaan mengikuti penyaring seperti di layar.
- Parameter URL sama dengan halaman Laporan (`periode`, `acuan`, `awal`, `akhir`, `jenis`,
  `metode`); `cetak=0` mematikan `window.print()` otomatis.
- Blok tanda tangan memakai nama bendahara dan ketua dari Pengaturan; bila kosong, cetak
  garis kosong — jangan pernah mencetak "null" atau "undefined".
- Sediakan juga tombol **Simpan sebagai PDF** yang memanggil `webContents.printToPDF`
  lewat IPC Electron, sehingga menghasilkan berkas langsung dengan nama deskriptif
  (`Laporan-Ringkas-Januari-2026.pdf`). Nama berkas penting karena hasilnya akan dikirim
  lewat WhatsApp.

## 8. Cadangan data

Ini fitur wajib, bukan tambahan. Seluruh pembukuan STM ada dalam satu berkas di satu
laptop, dan laptop rusak atau hilang bukan kejadian langka.

### 8.1 Cadangan otomatis

Setiap kali aplikasi dibuka, jalankan `VACUUM INTO` ke
`STM_DATA_DIR/cadangan/stm-YYYYMMDD-HHmm.db`, lalu sisakan 10 berkas terbaru.

`VACUUM INTO` menghasilkan salinan yang konsisten walau database sedang dipakai, dan
sekaligus memampatkannya — jauh lebih aman daripada menyalin berkas `.db` mentah yang bisa
tertangkap di tengah penulisan WAL.

### 8.2 Cadangan manual

Tombol **Buat Cadangan Sekarang** di Pengaturan memanggil `VACUUM INTO` ke lokasi yang
dipilih pengguna lewat dialog simpan Electron. Bila dijalankan di browser saat
pengembangan, jatuh ke unduhan biasa lewat `/api/cadangan`.

### 8.3 Pulihkan

Memilih berkas `.db`, lalu:

1. Verifikasi berkas dengan membukanya read-only dan memeriksa tabel `pengaturan` ada.
2. Tampilkan ringkasan isinya — jumlah catatan, rentang tanggal, sisa kas — dan minta
   konfirmasi.
3. Cadangkan database yang sedang aktif ke `cadangan/sebelum-pulihkan-*.db`.
4. Tutup koneksi, buang `-wal`/`-shm` lama, timpa berkas, buka ulang koneksi.

Langkah 4 tidak perlu mulai ulang aplikasi: `src/server/db/index.ts` mengekspor `db` dan
`sqlite` sebagai Proxy ke koneksi yang sedang aktif, jadi `tutupKoneksi()` +
`bukaUlangKoneksi()` cukup. Sumber berkas: di Electron path dari dialog buka
(`window.stm.pilihBerkasPulihkan`), di browser unggahan lewat Server Action yang disimpan
sebagai `cadangan/unggah-*.db`, atau salah satu berkas di daftar cadangan.

Langkah 2 penting. Memulihkan cadangan lama tanpa melihat isinya adalah cara paling mudah
kehilangan sebulan pencatatan tanpa sadar.

## 9. Berkas bukti

Foto bukti disimpan di `STM_DATA_DIR/bukti/` dengan nama acak
(`crypto.randomUUID()` + ekstensi asli), bukan di `public/` — folder `public` berada di
dalam bundel aplikasi dan bersifat baca-saja setelah dipaket.

Penyajiannya lewat `GET /api/bukti/[nama]`, yang membaca berkas dari folder data setelah
memastikan nama berkas tidak mengandung `..` atau pemisah path. Kompres gambar di sisi
klien (`canvas`, lebar maksimum 1600px, kualitas 0.8) sebelum dikirim, supaya folder data
tidak membengkak dan cadangan tetap ringan.

## 10. Kualitas kode

- `strict: true` di TypeScript. Tidak ada `any` tanpa komentar alasan.
- Kode server tidak memakai API yang baru ada di Node 18+ kecuali sudah ada di
  `electron/polyfill-node16.js` (`docs/05` §4). Contoh yang **tidak boleh**: `instanceof File`
  (pakai pemeriksaan bentuk: ada `arrayBuffer` dan `type`), `fs.promises.cp`,
  `Array.prototype.toSorted`, `Object.groupBy`.
  Contoh yang aman: `fetch` (lewat flag), `crypto.randomUUID()`, `AbortController`,
  `stream/web`, `fs.promises`, `structuredClone` (polyfill).
- Semua Server Action diawali pemeriksaan sesi. Buat pembungkus
  `aksiTerlindungi(fn)` supaya tidak ada yang lupa.
- Semua Server Action mengembalikan bentuk seragam:
  `{ ok: true, data } | { ok: false, pesan, field? }`.
- `revalidatePath()` setelah setiap perubahan data.
- Uang diformat hanya lewat `lib/rupiah.ts`. Tidak ada `toLocaleString` tersebar di komponen.
- Tanggal diformat hanya lewat `lib/tanggal.ts` dengan locale `id`.
