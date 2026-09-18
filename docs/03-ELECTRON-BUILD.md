# 03 — Electron dan Pembuatan `.exe`

Dokumen ini menjelaskan cara membungkus aplikasi Next.js menjadi aplikasi Windows
berbentuk installer dan portable.

Kerjakan bab ini **paling akhir** (Fase 9 di `docs/04`). Membangun fitur di browser jauh
lebih cepat, dan Electron hanya menambah lapisan yang memperlambat siklus coba-perbaiki.
Tapi bacalah lebih awal — beberapa keputusan di sini memengaruhi cara menulis kode sejak
Fase 1.

## 1. Cara kerjanya

Next.js dengan Server Actions dan SQLite butuh proses Node yang hidup. Jadi ini **bukan**
aplikasi statis yang dibuka Electron; polanya:

```
Electron (proses utama)
  ├─ cari port kosong
  ├─ jalankan .next/standalone/server.js sebagai proses anak
  │    dengan ELECTRON_RUN_AS_NODE=1 dan process.execPath
  ├─ tunggu server siap (polling http://127.0.0.1:PORT)
  └─ BrowserWindow.loadURL('http://127.0.0.1:PORT')
```

Server Next berjalan sebagai proses anak yang memakai biner Electron dalam mode Node.
Konsekuensinya penting dan akan dibahas di §4: modul native harus cocok dengan ABI
Electron, bukan ABI Node yang terpasang di sistem.

## 2. Konfigurasi Next

```ts
// next.config.ts
const nextConfig = {
  output: 'standalone',
  // Modul native tidak boleh ikut dibundel — biarkan di-require saat berjalan
  serverExternalPackages: ['better-sqlite3'],
  images: { unoptimized: true },  // pengoptimal gambar butuh sharp; tidak perlu di sini
}
```

`output: 'standalone'` menghasilkan `.next/standalone/` berisi `server.js` dan
`node_modules` seperlunya. Tapi ia **tidak** menyalin `.next/static` dan `public` —
keduanya harus disalin manual sebagai bagian dari skrip build:

```json
"build:app": "next build && node scripts/salin-standalone.mjs"
```

Skrip itu menyalin `.next/static` → `.next/standalone/.next/static` dan
`public` → `.next/standalone/public`. Tanpa langkah ini aplikasi terpaket akan terbuka
tanpa CSS sama sekali, dan gejalanya membingungkan karena di mode pengembangan semuanya
normal.

## 3. Proses utama Electron

```js
// electron/main.js
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

let server, win

// Data pengguna TIDAK boleh di dalam folder aplikasi:
// folder itu bersifat baca-saja dan akan terhapus saat aplikasi diperbarui.
const dataDir = path.join(app.getPath('userData'), 'data')
fs.mkdirSync(dataDir, { recursive: true })

function portKosong() {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

async function jalankanServer() {
  const port = await portKosong()
  const serverPath = path.join(process.resourcesPath, 'standalone', 'server.js')

  server = fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      STM_DATA_DIR: dataDir,
      ELECTRON_RUN_AS_NODE: '1',
    },
    cwd: path.dirname(serverPath),
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })

  server.stderr.on('data', (d) => console.error('[server]', d.toString()))
  await tungguSiap(`http://127.0.0.1:${port}`)
  return port
}
```

Ketentuan lain di proses utama:

- **Satu instans saja.** `app.requestSingleInstanceLock()` — kalau tidak, dua jendela akan
  menulis ke berkas SQLite yang sama.
- **Matikan server saat keluar.** `app.on('before-quit')` → `server.kill()`. Proses Node
  yang tertinggal akan mengunci berkas database dan membuat aplikasi gagal dibuka
  berikutnya.
- **Jendela**: lebar awal 1280×800, minimum 900×640, `show: false` sampai
  `ready-to-show` supaya tidak berkedip putih.
- **Layar muat**: karena server Next butuh 1–3 detik untuk siap, tampilkan
  `electron/memuat.html` berisi logo dan tulisan *"Menyiapkan aplikasi…"* lebih dulu,
  baru `loadURL` ke server. Tanpa ini pengguna melihat jendela kosong dan mengira aplikasi
  hang.
- **Menu bawaan dihapus** (`Menu.setApplicationMenu(null)`) — menu File/Edit/View bahasa
  Inggris tidak relevan dan membingungkan.
- **Tautan luar** dibuka di browser sistem lewat `setWindowOpenHandler` + `shell.openExternal`.
- **Keamanan**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
  Renderer hanya berbicara ke proses utama lewat `preload.js` dengan daftar kanal terbatas.

### Kanal IPC yang disediakan

| Kanal | Untuk |
| --- | --- |
| `cetak:pdf` | `webContents.printToPDF` lalu dialog simpan berkas |
| `cadangan:simpan` | Dialog simpan, lalu `VACUUM INTO` ke lokasi pilihan |
| `cadangan:pulihkan` | Dialog buka berkas `.db`, verifikasi, mulai ulang |
| `data:buka-folder` | `shell.openPath(dataDir)` |
| `app:versi` | Menampilkan versi di halaman Tentang |

Semuanya lewat `contextBridge.exposeInMainWorld('stm', {...})` di `preload.js`.
Kode aplikasi memeriksa `typeof window.stm !== 'undefined'` untuk tahu apakah sedang
berjalan di Electron atau di browser saat pengembangan, dan menyediakan alternatif
(unduhan biasa, `window.print()`) bila tidak.

## 4. better-sqlite3 dan ABI Electron

Ini penyebab kegagalan paling umum. Gejalanya:

```
Error: The module was compiled against a different Node.js version
NODE_MODULE_VERSION 115 vs 127
```

Penyebabnya: `npm install` mengompilasi `better-sqlite3` untuk Node yang terpasang di
sistem, sementara aplikasi menjalankannya di dalam Electron yang membawa versi Node
sendiri.

Penyelesaian:

```bash
npx electron-rebuild -f -w better-sqlite3
```

Jadikan langkah tetap:

```json
"postinstall": "electron-rebuild -f -w better-sqlite3"
```

Dan di `electron-builder`, modul native harus berada **di luar arsip asar**, karena berkas
`.node` tidak bisa dimuat dari dalam asar:

```json
"asarUnpack": ["**/*.node"]
```

Konsekuensi yang perlu disadari: setelah `electron-rebuild`, menjalankan
`npm run dev` di browser biasa akan gagal memuat `better-sqlite3` karena ABI-nya kini
milik Electron. Karena itu selama fase pengembangan fitur (Fase 1–8), **jangan**
menjalankan `electron-rebuild`. Pasang skrip `postinstall` itu belakangan, saat mulai
Fase 9, dan sediakan dua perintah terpisah:

```json
"rebuild:node": "npm rebuild better-sqlite3",
"rebuild:electron": "electron-rebuild -f -w better-sqlite3"
```

Sebutkan hal ini di `CLAUDE.md` bila belum ada — ini akan membingungkan siapa pun yang
berpindah antara dua mode tanpa tahu penyebabnya.

## 5. Konfigurasi electron-builder

```json
{
  "appId": "id.stm.kas",
  "productName": "Aplikasi Kas STM",
  "directories": { "output": "release", "buildResources": "build" },
  "files": ["electron/**/*", "package.json"],
  "extraResources": [
    { "from": ".next/standalone", "to": "standalone" }
  ],
  "asarUnpack": ["**/*.node"],
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64"] },
      { "target": "portable", "arch": ["x64"] }
    ],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Aplikasi Kas STM",
    "installerLanguages": ["id_ID", "en_US"],
    "deleteAppDataOnUninstall": false
  },
  "portable": { "artifactName": "AplikasiKasSTM-Portable-${version}.exe" }
}
```

Beberapa pilihan di atas sengaja:

- **`oneClick: false`** — installer satu klik langsung memasang tanpa bertanya apa pun,
  dan pengguna tidak tahu aplikasinya masuk ke mana. Pemasang bertahap lebih menenangkan.
- **`deleteAppDataOnUninstall: false`** — mencopot aplikasi tidak boleh menghapus
  pembukuan bertahun-tahun. Ini keputusan yang tidak bisa ditawar.
- **`installerLanguages` Indonesia** — installer berbahasa Inggris adalah gesekan pertama
  yang dialami pengguna, sebelum aplikasinya sempat terbuka.

### Versi portable

Target `portable` menghasilkan satu `.exe` yang dijalankan langsung dari flash disk.
Perlu diperhatikan: Electron portable mengekstrak dirinya ke folder sementara, dan
`app.getPath('userData')` tetap menunjuk ke `%APPDATA%` komputer yang dipakai — artinya
datanya **tidak** ikut berpindah bersama flash disk.

Bila yang diinginkan benar-benar "bawa data di flash disk", tambahkan pemeriksaan:
bila ada berkas `stm-portable.txt` di sebelah `.exe`, pakai folder `data` di sebelahnya
sebagai `dataDir`. Tulis ini eksplisit karena asumsi pengguna soal "portable" hampir selalu
mencakup datanya.

## 6. Ikon dan identitas

- `build/icon.ico` berisi ukuran 16, 24, 32, 48, 64, 128, 256 piksel.
- Desain ikon: sederhana, satu bentuk kuat (misalnya buku kas atau dompet) di atas warna
  primary. Harus tetap terbaca di 16px pada taskbar.
- `productName` memakai spasi dan bahasa Indonesia karena inilah yang muncul di Start Menu
  dan di dialog "Aplikasi ini ingin membuat perubahan".

## 7. Penandatanganan kode

Tanpa sertifikat penandatangan, Windows SmartScreen akan menampilkan peringatan
*"Windows protected your PC"* saat installer pertama kali dijalankan. Pengguna harus
menekan **More info → Run anyway**.

Ini tidak bisa dihindari secara teknis, hanya bisa dibeli (sertifikat OV/EV, biayanya
jutaan rupiah per tahun). Untuk penyebaran terbatas di satu STM, jalan yang wajar adalah
menyertakan satu halaman panduan bergambar yang menunjukkan langkah tersebut. Jangan
menyarankan pengguna mematikan SmartScreen.

Catat ini di `docs/PANDUAN-PEMASANGAN.md` yang dibuat pada fase terakhir.

## 8. Pembaruan aplikasi

Untuk sekarang: pembaruan dilakukan dengan menjalankan installer versi baru di atas yang
lama. Data aman karena berada di `userData`, dan migrasi database berjalan otomatis saat
aplikasi dibuka (lihat `docs/02` §3.4).

`electron-updater` sengaja tidak dipakai karena butuh server rilis dan penandatanganan
kode. Bila suatu saat diperlukan, itu keputusan terpisah.

## 9. Daftar periksa sebelum rilis

- [ ] `npm run dist:win` menghasilkan installer dan portable tanpa galat.
- [ ] Installer dijalankan di komputer **bersih** (tanpa Node.js terpasang) dan aplikasi terbuka.
- [ ] Pengaturan awal berjalan, PIN tersimpan, aplikasi bisa dikunci dan dibuka lagi.
- [ ] Menutup dan membuka ulang aplikasi menampilkan data yang sama.
- [ ] Berkas database benar-benar berada di `%APPDATA%/Aplikasi Kas STM/data/`.
- [ ] Mencetak laporan memunculkan dialog cetak Windows dan bisa disimpan sebagai PDF.
- [ ] Cadangan bisa dibuat dan dipulihkan.
- [ ] Memasang ulang versi baru di atas versi lama tidak menghilangkan data.
- [ ] Mencopot aplikasi tidak menghapus folder data.
- [ ] Versi portable berjalan dari flash disk.
