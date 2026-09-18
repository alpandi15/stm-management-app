import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, Pencil, Phone, Users } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { ambilAnggota, daftarKeluarga, matriksPeriode, riwayatAnggota, PER_HALAMAN_RIWAYAT_ANGGOTA } from '@/server/queries/anggota'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarCatatan } from '@/components/keuangan/DaftarCatatan'
import { MatriksPeriode } from '@/components/anggota/MatriksPeriode'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Detail anggota: data diri, keluarga, matriks periode, riwayat pembayaran.
export default async function HalamanDetailAnggota({ params, searchParams }: { params: { id: string }; searchParams: { hal?: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const a = Number.isInteger(id) ? ambilAnggota(id) : null
  if (!a) notFound()
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  const riwayat = riwayatAnggota(a.id, halaman)
  const totalHalaman = Math.max(1, Math.ceil(riwayat.total / PER_HALAMAN_RIWAYAT_ANGGOTA))
  const keluarga = daftarKeluarga(a.id)
  const asal = a.anggotaAsalId ? ambilAnggota(a.anggotaAsalId) : null

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="halus" className="-ml-2 w-fit px-2 text-muted">
        <Link href="/anggota">
          <ArrowLeft /> Kembali ke Anggota
        </Link>
      </Button>

      <JudulHalaman
        aksi={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="sekunder">
              <Link href={`/anggota/${a.id}/keluarga`}>
                <Users /> Keluarga ({keluarga.aktif.length})
              </Link>
            </Button>
            <Button asChild variant="sekunder">
              <Link href={`/anggota?cari=${encodeURIComponent(a.nomor ?? a.nama)}`}>
                <Pencil /> Ubah
              </Link>
            </Button>
          </div>
        }
      >
        {a.nama}
      </JudulHalaman>

      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Data anggota">
        <div className="flex flex-wrap items-center gap-2">
          {a.nomor && <span className="angka rounded-badge bg-bg px-3 py-0.5 text-ket font-semibold text-muted">{a.nomor}</span>}
          <span className={cn('rounded-badge px-3 py-0.5 text-ket font-semibold', a.aktif ? 'bg-masuk-soft text-masuk' : 'bg-border text-muted')}>{a.aktif ? 'Aktif' : 'Nonaktif'}</span>
          {a.status === 'meninggal' && <span className="rounded-badge bg-keluar-soft px-3 py-0.5 text-ket font-semibold text-keluar">Meninggal{a.tanggalMeninggal && ` · ${formatTanggal(a.tanggalMeninggal)}`}</span>}
          {a.pengutip && <span className="rounded-badge bg-warning-soft px-3 py-0.5 text-ket font-semibold text-warning">Tim pengutip</span>}
          {asal && <span className="rounded-badge bg-primary-soft px-3 py-0.5 text-ket font-semibold text-primary">Pecah KK</span>}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-isi sm:grid-cols-[auto_1fr]">
          {a.noHp && (
            <>
              <dt className="text-muted">Nomor HP</dt>
              <dd className="angka flex items-center gap-2"><Phone className="size-4 text-muted" /> {a.noHp}</dd>
            </>
          )}
          <dt className="text-muted">Alamat</dt>
          <dd>
            {a.alamat ?? '–'}
            {a.lat != null && a.lng != null && (
              <a href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="size-4" /> peta
              </a>
            )}
          </dd>
          {asal && (
            <>
              <dt className="text-muted">Asal</dt>
              <dd>
                Pecah dari keluarga <Link href={`/anggota/${asal.id}`} className="font-semibold text-primary hover:underline">{asal.nama}</Link>
                {a.tanggalBergabung && `, bergabung ${formatTanggal(a.tanggalBergabung)}`}
              </dd>
            </>
          )}
          <dt className="text-muted">Tanggungan</dt>
          <dd>{keluarga.aktif.length === 0 ? '–' : keluarga.aktif.map((k) => `${k.nama} (${k.hubungan}${k.status === 'meninggal' ? ', meninggal' : ''})`).join(', ')}</dd>
        </dl>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="text-ket text-muted">Total uang masuk atas nama ini</p>
            <p className="angka text-judul-kartu font-bold text-masuk">{formatRupiah(riwayat.totalMasuk)}</p>
          </div>
          <div>
            <p className="text-ket text-muted">Total uang keluar (santunan, dll.)</p>
            <p className="angka text-judul-kartu font-bold text-keluar">{formatRupiah(riwayat.totalKeluar)}</p>
          </div>
          <div>
            <p className="text-ket text-muted">Jumlah catatan</p>
            <p className="angka text-judul-kartu font-bold">{riwayat.total}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="Pembayaran per periode">
        <h2 className="text-judul-kartu font-semibold">Pembayaran per Periode</h2>
        <MatriksPeriode daftar={matriksPeriode(a, ambilPengaturan()?.tanggalMulai ?? '')} />
      </section>

      <section className="flex flex-col gap-3" aria-label="Riwayat pembayaran">
        <h2 className="text-judul-kartu font-semibold">Riwayat Catatan</h2>
        {riwayat.baris.length === 0 ? <p className="text-isi text-muted">Belum ada catatan atas nama anggota ini.</p> : <DaftarCatatan baris={riwayat.baris} />}
        {totalHalaman > 1 && (
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Halaman">
            <Button asChild variant="sekunder" className={cn(halaman <= 1 && 'pointer-events-none opacity-50')}>
              <Link href={`/anggota/${a.id}?hal=${halaman - 1}`}>Sebelumnya</Link>
            </Button>
            <span className="order-first w-full text-center text-isi text-muted sm:order-none sm:w-auto">
              Halaman {halaman} dari {totalHalaman}
            </span>
            <Button asChild variant="sekunder" className={cn(halaman >= totalHalaman && 'pointer-events-none opacity-50')}>
              <Link href={`/anggota/${a.id}?hal=${halaman + 1}`}>Berikutnya</Link>
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}
