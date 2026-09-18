# CLAUDE.md

Panduan kerja untuk Claude Code di repositori ini. Baca berkas ini lebih dulu, setiap sesi.

## Apa yang sedang dibangun

**Aplikasi Kas STM** — aplikasi pembukuan kas untuk STM (Serikat Tolong Menolong),
organisasi warga yang mengumpulkan iuran anggota dan menyalurkannya sebagai santunan.

Bentuk akhirnya adalah **aplikasi desktop Windows** (`.exe` installer dan portable),
dipakai **satu orang** — bendahara — di satu komputer. Bukan aplikasi web multi-pengguna.

**Aplikasi harus bisa dijalankan di Windows 7 SP1, 32-bit maupun 64-bit.** Syarat ini
mengunci beberapa versi dependensi (lihat `docs/05`). Jangan menaikkan versi yang dikunci.

Status repo: Fase 0–2 selesai (fondasi, pengaturan awal, login PIN). Lihat `docs/04`
untuk fase berikutnya.

## Dokumen (baca berurutan)

| Berkas | Isi |
| --- | --- |
| `docs/01-PRODUK-DAN-UI.md` | Siapa penggunanya, prinsip UX, sistem desain, dan tampilan tiap halaman |
| `docs/02-SPEC-TEKNIS.md` | Stack, setup dari nol, skema database, login PIN, rumus laporan, cetak, backup |
| `docs/03-ELECTRON-BUILD.md` | Menggabungkan Next.js ke Electron dan membuat `.exe` |
| `docs/04-RENCANA-BUILD.md` | Urutan fase pengerjaan beserta bukti selesai |
| `docs/05-DUKUNGAN-WINDOWS-7.md` | Kenapa versi tertentu dikunci, polyfill Node 16, cara mengujinya |

`docs/02` adalah rujukan utama saat ragu soal perilaku. `docs/01` menang bila menyangkut
tampilan dan kata-kata di layar.

## Stack yang sudah diputuskan

Jangan menggantinya tanpa membahas dulu. Versi yang **dikunci** ditandai tebal —
alasannya di `docs/05`.

- Next.js **14.2** (App Router) + TypeScript, `output: 'standalone'`, React **18.3**
- SQLite lewat **better-sqlite3 9.6.0** + Drizzle ORM + Drizzle Kit
- Tailwind CSS 4 + komponen bergaya shadcn/ui (ditulis sendiri di `components/ui/`, di atas
  `radix-ui` + cva; CLI shadcn tidak dipakai) + lucide-react — token warna hex, tanpa oklch
- Recharts untuk grafik
- Zod + React Hook Form
- **`jose` 4.x** untuk sesi, `bcryptjs` untuk PIN
- **Electron 22.3.27** + electron-builder (target `nsis` dan `portable`, arch `ia32` + `x64`)
- Node **20** di mesin pengembangan (`nvm use`); runtime pengguna adalah Node 16.17 di Electron

## Aturan kerja

1. **Bahasa.** Seluruh teks yang dilihat pengguna, komentar kode, dan pesan commit
   ditulis dalam Bahasa Indonesia. Nama variabel, fungsi, dan berkas dalam Bahasa Inggris.
2. **Server Actions untuk semua perubahan data.** Route Handler hanya untuk hal yang
   memang butuh HTTP: mengambil berkas bukti, unduh backup, halaman cetak.
3. **Akses database hanya dari `src/server/`.** Komponen tidak pernah mengimpor Drizzle
   secara langsung.
4. **Semua uang adalah `INTEGER` rupiah penuh.** Tidak ada desimal, tidak ada `float`,
   tidak ada sen. Alasannya ada di `docs/02`.
5. **Jangan menambah dependensi** di luar daftar di atas tanpa menuliskan alasannya
   dalam laporan fase.
6. **Jangan memakai fitur yang butuh server eksternal.** Tidak ada email, OAuth, API
   pihak ketiga, atau upload ke cloud. Aplikasi ini harus berjalan penuh tanpa internet.
7. **Kerjakan satu fase per sesi** sesuai `docs/04`, lalu laporkan berkas yang dibuat dan
   bukti selesai yang benar-benar dijalankan.
8. **Bila dokumen bertentangan dengan kode yang ada, tanyakan.** Jangan menebak.
   Ini aplikasi keuangan; kesalahan angka tidak terlihat sampai tutup buku.

## Perintah

```bash
nvm use                # Node 20 — wajib, lihat docs/05 §3
npm run dev            # Next.js saja, di browser (paling cepat untuk membangun UI)
npm run dev:electron   # Next dev + jendela Electron
npm run db:generate    # Buat berkas migrasi dari perubahan skema Drizzle
npm run db:migrate     # Terapkan migrasi
npm run db:studio      # Lihat isi database
npm run build          # Build Next standalone
npm run dist:win       # Hasilkan installer .exe dan versi portable
npm run lint && npm run typecheck
npm test               # node --test lewat tsx
```

## Jebakan yang sudah diketahui

Semuanya akan memakan waktu Anda kalau diabaikan. Rinciannya di `docs/03` dan `docs/05`.

1. **better-sqlite3 adalah modul native.** Harus dikompilasi ulang untuk ABI Electron
   (`@electron/rebuild`), bukan ABI Node sistem.
2. **Berkas database tidak boleh berada di dalam `asar`.** Lokasinya di
   `app.getPath('userData')`, dan path itu dikirim ke server Next lewat variabel lingkungan.
3. **Aplikasi ini tidak bisa di-deploy ke Vercel.** SQLite butuh disk permanen.
   Kalau suatu saat perlu versi web, itu keputusan arsitektur terpisah.
4. **Runtime pengguna adalah Node 16.17.** Next 14 butuh `electron/polyfill-node16.js`
   dan flag `--experimental-fetch` untuk jalan di situ. Setiap menaikkan versi paket,
   ulangi uji di `docs/05` §4. Jangan memakai API Node 18+ (`fetch` tanpa flag,
   `Array.prototype.findLast`, `structuredClone`, `File`, `Blob` global) di kode server
   tanpa memastikan ada di polyfill.
5. **Jangan `npm install` di Node 22/24.** better-sqlite3 9.6.0 tidak punya prebuild untuk
   itu dan akan gagal kompilasi. `.npmrc` memaksa `engine-strict`.
6. **Beberapa terminal menyetel `ELECTRON_RUN_AS_NODE=1`.** Electron lalu berjalan sebagai
   Node dan mengeluh `Cannot find module 'electron'`. Pakai `env -u ELECTRON_RUN_AS_NODE`.
7. **Next 14, bukan 15/16.** Nama konfigurasinya berbeda: `next.config.mjs` (bukan `.ts`),
   `experimental.serverComponentsExternalPackages` (bukan `serverExternalPackages`),
   `middleware.ts` selalu edge runtime (tidak bisa membuka SQLite), `useFormState`
   (bukan `useActionState`), `params` dan `cookies()` sinkron.
