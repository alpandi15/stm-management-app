# 05 — Dukungan Windows 7 (32-bit dan 64-bit)

Aplikasi ini **harus bisa dijalankan di Windows 7 SP1**, baik 32-bit maupun 64-bit,
di samping Windows 8/10/11. Syarat ini mengunci beberapa versi dependensi pada nilai
yang lebih tua dari versi terbaru. Dokumen ini adalah satu-satunya tempat alasannya
ditulis — bila suatu saat syarat Windows 7 dicabut, mulai dari sini.

## 1. Rantai sebab-akibat

```
Windows 7
  └─ Electron terakhir yang mendukungnya: 22.3.27 (Chromium 108, Node 16.17.1, ABI 110)
       ├─ Next.js harus bisa jalan di Node 16.17
       │    └─ Next 15/16 butuh Node ≥ 18.18 / 20.9 dan membuang polyfill → Next 14.2
       │         └─ Next 14 memakai React 18 → React 18.3.1
       ├─ better-sqlite3 butuh biner untuk ABI 110 win32-ia32 dan win32-x64
       │    └─ versi terakhir yang menyediakannya: 9.6.0 (10.0.0 ke atas tidak ada lagi)
       ├─ jose harus jalan di Node 16 → jose 4.x (5.x butuh Node 18)
       └─ Tailwind 4 harus dirender Chromium 108 → token warna hex, bukan oklch
```

## 2. Versi yang dikunci — JANGAN dinaikkan

| Paket | Versi | Alasan | Yang terjadi bila dinaikkan |
| --- | --- | --- | --- |
| `electron` | **22.3.27** (tepat) | Electron 23+ memakai Chromium 110+ yang tidak jalan di Windows 7/8/8.1 | Aplikasi tidak bisa dibuka sama sekali di Windows 7 |
| `better-sqlite3` | **9.6.0** (tepat) | Rilis terakhir dengan `electron-v110-win32-ia32` dan `-x64` | `electron-builder` mencoba kompilasi dari sumber, butuh Visual Studio, dan tidak bisa dari macOS |
| `next` | **14.2.x** | Terakhir yang masih bisa jalan di Node 16 dengan polyfill kecil | `Request`/`ReadableStream`/`crypto` tidak ada → server gagal start |
| `react`, `react-dom` | **18.3.1** | Pasangan Next 14 | Next 14 tidak mendukung React 19 |
| `jose` | **4.x** | Versi 5 mensyaratkan Node 18 | Galat saat menandatangani sesi |
| `@types/react`, `@types/react-dom` | **18.x** | Mengikuti React | Tipe tidak cocok |
| `eslint` + `eslint-config-next` | **8.x / 14.2.x** | `next lint` di Next 14 memakai konfigurasi lama (`.eslintrc.json`), bukan flat config | `next lint` tidak mengenali konfigurasi |

Versi ini diverifikasi 18 September 2026 dengan mengunduh daftar rilis better-sqlite3 dan
`releases.electronjs.org/releases.json`. Bukti eksekusinya ada di §4.

Dependensi lain (Drizzle, Zod, date-fns, Recharts, lucide, Tailwind 4, React Hook Form)
boleh memakai versi terbaru karena murni JavaScript dan dijalankan di Node 16 tanpa masalah
— **tapi setiap kali menaikkan versi, ulangi uji §4.** Tidak ada cara lain untuk tahu.

## 3. Node untuk pengembangan: 20.x

Mesin pengembangan memakai **Node 20** (`.nvmrc`, `engines` di `package.json`,
`engine-strict=true` di `.npmrc`). Alasannya bukan Windows 7, melainkan better-sqlite3 9.6.0:
prebuild untuk Node hanya tersedia sampai Node 21 (`node-v120`). Di Node 22/24 `npm install`
akan mencoba kompilasi dari sumber dan gagal pada header V8 yang lebih baru.

```bash
nvm use            # membaca .nvmrc
npm install
```

Perhatikan: Node 20 hanya untuk **membangun** (build, lint, drizzle-kit). Yang dijalankan
pengguna di Windows 7 adalah Node 16.17.1 di dalam Electron.

## 4. Polyfill Node 16 dan cara mengujinya

Next 14 mengasumsikan beberapa Web API sudah global. Di Node 16 kelas-kelasnya ada,
tetapi belum dipasang sebagai global. Dua hal menutup celah itu:

1. **`electron/polyfill-node16.js`** — memasang `ReadableStream` & kawan-kawan dari
   `stream/web`, `Blob` (dari `buffer`) dan `File` minimal, `crypto.webcrypto`,
   `structuredClone`, `DOMException`, `AbortSignal.timeout`, `Array.prototype.findLast`,
   `Object.hasOwn`. `Blob`/`File` dibutuhkan saat Server Action menerima berkas (foto bukti).
2. **Flag `--experimental-fetch`** — memasang `fetch`, `Request`, `Response`, `Headers`,
   `FormData` bawaan Node 16.15+. Tanpa ini `NextRequest extends Request` gagal saat modul dimuat.

Keduanya dirangkai oleh **`electron/jalankan-server.js`**, yang dipanggil `main.js`
sebagai pengganti `server.js` langsung (lihat `docs/03` §3).

### Uji wajib setelah `next build` atau menaikkan versi paket apa pun

Dijalankan di mesin pengembangan, tanpa Windows, tanpa membuat installer:

```bash
# 1. Bangun standalone
npm run build

# 2. Salin ke folder uji dan pasang biner better-sqlite3 untuk ABI Electron 110
#    (jangan mengganti yang ada di node_modules — itu merusak `npm run dev`)
UJI=/tmp/uji-electron22 && rm -rf $UJI && mkdir -p $UJI
cp -R .next/standalone/. $UJI/ && mkdir -p $UJI/.next/static
cp -R .next/static/. $UJI/.next/static/ && cp -R public $UJI/public
curl -sSL https://github.com/WiseLibs/better-sqlite3/releases/download/v9.6.0/better-sqlite3-v9.6.0-electron-v110-darwin-arm64.tar.gz \
  | tar xz -C $UJI            # ganti darwin-arm64 sesuai mesin: darwin-x64, linux-x64, win32-x64
cp $UJI/build/Release/better_sqlite3.node $UJI/node_modules/better-sqlite3/build/Release/

# 3. Jalankan dengan runtime Electron 22 sebagai Node 16
ELECTRON_RUN_AS_NODE=1 NODE_OPTIONS=--experimental-fetch NODE_ENV=production \
PORT=3979 HOSTNAME=127.0.0.1 STM_DATA_DIR=$UJI/data STM_SERVER_JS=$UJI/server.js \
  ./node_modules/.bin/electron electron/jalankan-server.js

# 4. Di terminal lain
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3979/   # harus 200
```

Yang harus lolos: halaman yang membaca database merender (200), berkas CSS terlayani,
dan sebuah Server Action berjalan. Untuk Server Action, buka halamannya di Electron 22
(bukan curl — React menolak multipart buatan tangan) dan tekan tombolnya.

**Hasil uji 18 September 2026** (Fase 1, macOS arm64, Electron 22.3.27):
`process.versions` = node 16.17.1 / electron 22.3.27 / modules 110. Halaman `/` yang
membaca 19 jenis dari SQLite → HTTP 200; CSS → 200; rute tak dikenal → 404; Server Action
`ujiTerbilang` mengembalikan `{"ok":true,"data":{"terbilang":"Satu juta dua ratus lima
puluh ribu rupiah","totalJenis":19}}`. Tangkapan layar Chromium 108 menampilkan font
Plus Jakarta Sans, token warna, radius 16px, dan tinggi baris 48px dengan benar.

## 5. Chromium 108 dan CSS

Tailwind 4 secara bawaan memakai `oklch()` dan `color-mix()`, yang baru dikenal
Chromium 111. Chromium 108 mengabaikan deklarasi itu — warnanya hilang tanpa galat.

Ketentuan:

- Semua token warna di `globals.css` ditulis **hex**, dan palet bawaan Tailwind dimatikan
  (`--color-*: initial`) supaya tidak ada yang tak sengaja memakai `bg-blue-500`.
- Hindari pengubah opasitas warna (`bg-primary/50`) — Tailwind mengubahnya menjadi
  `color-mix()`. Bila perlu warna lembut, buat token sendiri (`--color-masuk-soft`).
- Periksa hasil build: `grep -c oklch .next/static/css/*.css` harus `0`.
- Fitur yang **tidak ada** di Chromium 108 dan jangan dipakai: `:has()` bertingkat rumit,
  `@container` query, `text-wrap: balance`, `@starting-style`, `field-sizing`,
  `dialog` `closedby`, `popover`. `:has()` sederhana, `@layer`, `gap`, `inset`, `aspect-ratio`,
  `dvh` ada dan aman.
- Recharts, Radix (shadcn), dan React 18 tidak memakai API yang hilang di Chromium 108.

## 6. Konfigurasi build untuk dua arsitektur

Di `electron-builder`:

```json
"win": {
  "target": [
    { "target": "nsis", "arch": ["ia32", "x64"] },
    { "target": "portable", "arch": ["ia32", "x64"] }
  ]
}
```

- Target `nsis` dengan dua arch menghasilkan **satu installer** yang memilih sendiri
  arsitektur saat dipasang — pengguna tidak perlu tahu komputernya 32 atau 64 bit.
- Target `portable` menghasilkan **dua berkas**, `-ia32` dan `-x64`. Berikan keduanya;
  versi ia32 jalan di kedua Windows bila ragu.
- Saat build, electron-builder memanggil `@electron/rebuild` per arch. Untuk 9.6.0 ia
  hanya **mengunduh** prebuild dari GitHub, tidak mengompilasi — karena itu build Windows
  bisa dilakukan dari macOS/Linux. Butuh internet saat build.
- `electron-builder` boleh versi terbaru; ia tidak membatasi versi Electron.

## 7. Yang perlu diperhatikan di mesin Windows 7 sungguhan

- **Wajib SP1.** Chromium 108 tidak jalan di Windows 7 tanpa Service Pack 1.
- **Akselerasi GPU.** Laptop tua dengan driver GPU lama kadang menampilkan jendela
  putih/hitam. `main.js` memanggil `app.disableHardwareAcceleration()` — aplikasi ini
  tidak butuh GPU, dan mematikannya menghilangkan satu sumber masalah yang tidak bisa
  didiagnosis dari jauh.
- **32-bit = batas memori 2 GB per proses.** Cukup untuk aplikasi ini; hindari memuat
  ribuan foto bukti sekaligus di satu halaman.
- **SmartScreen di Windows 7** lebih jarang muncul daripada di Windows 10, tapi tetap ada
  bila installer diunduh lewat browser. Panduan pemasangan tetap memuat langkahnya.
- **Font.** Plus Jakarta Sans dibundel `next/font`, jadi tidak bergantung pada font sistem.
  Windows 7 tidak punya Segoe UI Emoji yang lengkap — jangan memakai emoji di antarmuka.
- Sebelum rilis, uji di **VM Windows 7 SP1 32-bit bersih** (tanpa Node, tanpa Visual C++
  Redistributable tambahan). Daftar periksanya ada di `docs/03` §9.

## 8. Catatan lingkungan pengembangan

Sebagian terminal/agen menyetel `ELECTRON_RUN_AS_NODE=1` secara global. Bila
`./node_modules/.bin/electron main.js` malah berjalan sebagai Node dan mengeluh
`Cannot find module 'electron'`, jalankan dengan `env -u ELECTRON_RUN_AS_NODE`.
Skrip `dev:electron` (dibuat di Fase 9) harus memakai `env -u ELECTRON_RUN_AS_NODE` atau
`cross-env ELECTRON_RUN_AS_NODE=` supaya tidak terjebak hal ini.
