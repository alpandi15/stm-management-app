import { CheckCircle2, XCircle } from 'lucide-react'
import type { PemeriksaanKas } from '@/server/services/laporan'
import { formatRupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

/** Kartu Pemeriksaan Kas di atas Riwayat (docs/01 §5.7). */
export function KartuPemeriksaan({ p }: { p: PemeriksaanKas }) {
  const Baris = ({ label, nilai, tanda }: { label: string; nilai: number; tanda?: '+' | '−' | '=' }) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-isi text-muted">
        {tanda && <span className="mr-2 inline-block w-3 text-center font-semibold text-text">{tanda}</span>}
        {label}
      </span>
      <span className="angka font-semibold">{formatRupiah(nilai)}</span>
    </div>
  )
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Pemeriksaan Kas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-judul-kartu font-semibold">Pemeriksaan Kas</h2>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-badge px-4 py-1.5 text-label font-semibold',
            p.cocok ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar',
          )}
        >
          {p.cocok ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
          {p.cocok ? 'Cocok' : 'Tidak Cocok'}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Baris label="Saldo Awal" nilai={p.saldoAwal} />
        <Baris label="Uang Masuk" nilai={p.masuk} tanda="+" />
        <Baris label="Uang Keluar" nilai={p.keluar} tanda="−" />
        <div className="my-1 border-t border-border" />
        <Baris label="Sisa Kas Seharusnya" nilai={p.seharusnya} tanda="=" />
        <Baris label={`Hitungan dari riwayat (${p.jumlahLog} catatan perubahan)`} nilai={p.sebenarnya} />
      </div>
      <p className="mt-4 text-ket text-muted">
        {p.cocok
          ? 'Sisa kas dari catatan dan dari riwayat perubahan sama persis. Pembukuan Anda utuh.'
          : 'Sisa kas dari catatan berbeda dengan hitungan riwayat. Periksa catatan yang baru diubah, atau pulihkan cadangan terakhir di Pengaturan.'}
      </p>
    </section>
  )
}
