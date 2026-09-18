/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dibungkus Electron sebagai server Node mandiri (lihat docs/03 §2)
  output: 'standalone',
  // Modul native tidak boleh ikut dibundel webpack — di-require apa adanya saat berjalan.
  // Catatan: di Next 14 namanya masih `experimental.serverComponentsExternalPackages`
  // (baru jadi `serverExternalPackages` di Next 15).
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // Pengoptimal gambar butuh `sharp` (modul native lagi); tidak diperlukan di aplikasi ini.
  images: { unoptimized: true },
};

export default nextConfig;
