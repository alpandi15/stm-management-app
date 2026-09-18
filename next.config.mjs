import { createRequire } from 'node:module'

// Kunci sesi dipasang ke process.env sebelum server dimuat, supaya middleware (edge)
// bisa memverifikasi cookie. Lihat electron/sesi-secret.js dan docs/02 §4.4.
const require = createRequire(import.meta.url)
require('./electron/sesi-secret.js').pasangSecretSesi()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dibungkus Electron sebagai server Node mandiri (lihat docs/03 §2)
  output: 'standalone',
  // Modul native tidak boleh ikut dibundel webpack — di-require apa adanya saat berjalan.
  // Catatan: di Next 14 namanya masih `experimental.serverComponentsExternalPackages`
  // (baru jadi `serverExternalPackages` di Next 15).
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    // Foto bukti dikirim lewat Server Action (maks 5 MB, docs/02 §5.1); bawaan Next 1 MB
    serverActions: { bodySizeLimit: '6mb' },
  },
  // Pengoptimal gambar butuh `sharp` (modul native lagi); tidak diperlukan di aplikasi ini.
  images: { unoptimized: true },
};

export default nextConfig;
