import { AlertTriangle } from 'lucide-react'
import { formatRupiah } from '@/lib/rupiah'

/** Banner menetap saat sisa kas minus (docs/02 §5.6). Tidak tampil bila ≥ 0. */
export function BannerKasMinus({ sisaKas }: { sisaKas: number }) {
  if (sisaKas >= 0) return null
  return (
    <div role="status" className="flex items-start gap-3 rounded-kartu border border-warning bg-warning-soft p-4 text-warning">
      <AlertTriangle className="mt-0.5 size-6 shrink-0" />
      <p className="text-isi font-medium">
        Sisa uang kas tercatat minus <span className="angka font-bold">{formatRupiah(Math.abs(sisaKas))}</span>. Coba periksa kembali catatan Anda.
      </p>
    </div>
  )
}
