# CLAUDE.md

Panduan kerja untuk Claude Code di repositori ini. Baca berkas ini lebih dulu, setiap sesi.

## Apa yang sedang dibangun

**Aplikasi Kas STM** — aplikasi pembukuan kas untuk STM (Serikat Tolong Menolong),
organisasi warga yang mengumpulkan iuran anggota dan menyalurkannya sebagai santunan.

Bentuk akhirnya adalah **aplikasi desktop Windows** (`.exe` installer dan portable),
dipakai **satu orang** — bendahara — di satu komputer. Bukan aplikasi web multi-pengguna.

Status repo saat ini: proyek Next.js baru hasil `create-next-app`, **belum ada fitur apa pun**.
Seluruh aplikasi dibangun dari nol mengikuti dokumen di bawah.

## Dokumen (baca berurutan)

| Berkas | Isi |
| --- | --- |
| `docs/01-PRODUK-DAN-UI.md` | Siapa penggunanya, prinsip UX, sistem desain, dan tampilan tiap halaman |
| `docs/02-SPEC-TEKNIS.md` | Stack, setup dari nol, skema database, login PIN, rumus laporan, cetak, backup |
| `docs/03-ELECTRON-BUILD.md` | Menggabungkan Next.js ke Electron dan membuat `.exe` |
| `docs/04-RENCANA-BUILD.md` | Urutan fase pengerjaan beserta bukti selesai |

`docs/02` adalah rujukan utama saat ragu soal perilaku. `docs/01` menang bila menyangkut
tampilan dan kata-kata di layar.

## Stack yang sudah diputuskan

Jangan menggantinya tanpa membahas dulu.

- Next.js (App Router) + TypeScript, `output: 'standalone'`
- SQLite lewat **better-sqlite3** + **Drizzle ORM** + Drizzle Kit
- Tailwind CSS 4 + shadcn/ui + lucide-react
- Recharts untuk grafik
- Zod + React Hook Form
- `jose` untuk sesi, `bcryptjs` untuk PIN
- Electron + electron-builder (target `nsis` dan `portable`)

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
npm run dev            # Next.js saja, di browser (paling cepat untuk membangun UI)
npm run dev:electron   # Next dev + jendela Electron
npm run db:generate    # Buat berkas migrasi dari perubahan skema Drizzle
npm run db:migrate     # Terapkan migrasi
npm run db:studio      # Lihat isi database
npm run build          # Build Next standalone
npm run dist:win       # Hasilkan installer .exe dan versi portable
npm run lint && npm run typecheck
```

## Jebakan yang sudah diketahui

Ketiganya akan memakan waktu Anda kalau diabaikan. Rinciannya di `docs/03`.

1. **better-sqlite3 adalah modul native.** Harus dikompilasi ulang untuk ABI Electron
   (`@electron/rebuild`), bukan ABI Node sistem.
2. **Berkas database tidak boleh berada di dalam `asar`.** Lokasinya di
   `app.getPath('userData')`, dan path itu dikirim ke server Next lewat variabel lingkungan.
3. **Aplikasi ini tidak bisa di-deploy ke Vercel.** SQLite butuh disk permanen.
   Kalau suatu saat perlu versi web, itu keputusan arsitektur terpisah.
