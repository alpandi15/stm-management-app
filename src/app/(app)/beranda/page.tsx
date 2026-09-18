import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'

export const dynamic = 'force-dynamic'

// Kerangka kosong; isi sungguhan (sisa kas, grafik, catatan terakhir) dibuat di Fase 6.
export default async function HalamanBeranda() {
  await wajibSesi()
  const p = ambilPengaturan()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-judul font-bold">Beranda</h1>
      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu">
        <p className="text-isi text-muted">Halo, {p?.namaBendahara}. Pengaturan awal selesai dan aplikasi terbuka.</p>
        <p className="mt-2 text-ket text-muted">Fitur pencatatan akan tersedia pada fase berikutnya.</p>
      </section>
    </div>
  )
}
