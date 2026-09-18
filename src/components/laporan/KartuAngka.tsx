import { formatRupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

/** Satu angka dengan label — kartu statistik di Beranda dan ringkasan Laporan. */
export function KartuAngka({
  label,
  nilai,
  warna = 'text',
  keterangan,
  angkaBiasa,
}: {
  label: string
  nilai: number
  warna?: 'text' | 'masuk' | 'keluar' | 'primary' | 'otomatis'
  keterangan?: string
  /** Tampilkan sebagai bilangan (bukan rupiah), mis. jumlah catatan */
  angkaBiasa?: boolean
}) {
  const kelasWarna =
    warna === 'otomatis' ? (nilai < 0 ? 'text-keluar' : 'text-text') : { text: 'text-text', masuk: 'text-masuk', keluar: 'text-keluar', primary: 'text-primary' }[warna]
  return (
    <div className="rounded-kartu border border-border bg-surface p-5 shadow-kartu">
      <p className="text-label text-muted">{label}</p>
      <p className={cn('angka mt-1 text-judul font-bold', kelasWarna)}>{angkaBiasa ? nilai.toLocaleString('id-ID') : formatRupiah(nilai)}</p>
      {keterangan && <p className="mt-1 text-ket text-muted">{keterangan}</p>}
    </div>
  )
}
