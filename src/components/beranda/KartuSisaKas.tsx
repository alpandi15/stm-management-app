import { AlertTriangle } from 'lucide-react'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal, type TanggalISO } from '@/lib/tanggal'
import { cn } from '@/lib/utils'

/** Kartu sisa kas lebar penuh (docs/01 §5.3): gradien halus primary; merah + peringatan bila minus. */
export function KartuSisaKas({ sisaKas, diperbarui }: { sisaKas: number; diperbarui: TanggalISO | null }) {
  const minus = sisaKas < 0
  return (
    <section
      aria-label="Sisa Uang Kas"
      className={cn(
        'rounded-kartu p-6 text-white shadow-kartu sm:p-8',
        minus ? 'gradien-keluar' : 'gradien-primary',
      )}
    >
      <p className="text-label font-semibold uppercase tracking-wide opacity-90">Sisa Uang Kas</p>
      <p className="angka mt-2 text-saldo font-bold">{formatRupiah(sisaKas)}</p>
      <p className="mt-2 text-isi opacity-90">{diperbarui ? `Diperbarui ${formatTanggal(diperbarui)}` : 'Belum ada catatan'}</p>
      {minus && (
        <p className="mt-4 flex items-start gap-2 rounded-input bg-white-soft p-3 text-isi font-medium">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          Sisa uang kas tercatat minus. Coba periksa kembali catatan Anda.
        </p>
      )}
    </section>
  )
}
