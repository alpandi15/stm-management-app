import Link from 'next/link'
import { wajibSesi } from '@/server/auth/session'
import { daftarRiwayat, PER_HALAMAN_RIWAYAT } from '@/server/queries/riwayat'
import { periksaKas } from '@/server/services/laporan'
import { formatTanggalLengkap } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { KartuPemeriksaan } from '@/components/riwayat/KartuPemeriksaan'
import { EntriRiwayat } from '@/components/riwayat/EntriRiwayat'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HalamanRiwayat({ searchParams }: { searchParams: { hal?: string } }) {
  await wajibSesi()
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  const { hari, total } = daftarRiwayat(halaman)
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN_RIWAYAT))
  const pemeriksaan = periksaKas()

  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Riwayat</JudulHalaman>
      <KartuPemeriksaan p={pemeriksaan} />

      {hari.length === 0 ? (
        <KeadaanKosong
          judul="Belum ada riwayat"
          kalimat="Setiap catatan yang dibuat, diubah, atau dihapus akan tercatat di sini dan bisa dikembalikan."
          tombol={{ label: 'Ke Catatan Kas', href: '/catatan' }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {hari.map((h) => (
            <section key={h.tanggal} aria-label={formatTanggalLengkap(h.tanggal)}>
              <h2 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted">{formatTanggalLengkap(h.tanggal)}</h2>
              <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-2">
                {h.entri.map((e) => (
                  <EntriRiwayat key={e.id} entri={e} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {totalHalaman > 1 && (
        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Halaman">
          <Button asChild variant="sekunder" className={cn(halaman <= 1 && 'pointer-events-none opacity-50')}>
            <Link href={`/riwayat?hal=${halaman - 1}`}>Sebelumnya</Link>
          </Button>
          <span className="order-first w-full text-center text-isi text-muted sm:order-none sm:w-auto">
            Halaman {halaman} dari {totalHalaman}
          </span>
          <Button asChild variant="sekunder" className={cn(halaman >= totalHalaman && 'pointer-events-none opacity-50')}>
            <Link href={`/riwayat?hal=${halaman + 1}`}>Berikutnya</Link>
          </Button>
        </nav>
      )}
    </div>
  )
}
