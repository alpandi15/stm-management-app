import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { ambilSetoran } from '@/server/queries/setoran'
import { formatRupiah, terbilangRupiah } from '@/lib/rupiah'
import { formatPeriode, formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarCatatan } from '@/components/keuangan/DaftarCatatan'
import { HapusSetoran } from '@/components/setoran/HapusSetoran'

export const dynamic = 'force-dynamic'

export default async function HalamanDetailSetoran({ params }: { params: { id: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const s = Number.isInteger(id) ? ambilSetoran(id) : null
  if (!s) notFound()
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="halus" className="-ml-2 w-fit px-2 text-muted">
        <Link href="/catatan/setoran">
          <ArrowLeft /> Semua setoran
        </Link>
      </Button>
      <JudulHalaman
        aksi={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="sekunder">
              <Link href={`/cetak/setoran/${s.id}`}>
                <Printer /> Tanda Terima
              </Link>
            </Button>
            <HapusSetoran id={s.id} nomor={s.nomor} jumlahCatatan={s.jumlahCatatan} total={s.total} />
          </div>
        }
      >
        Setoran {s.nomor}
      </JudulHalaman>

      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Kepala setoran">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-isi sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Jenis</dt>
          <dd className="font-semibold">{s.namaJenis}</dd>
          {s.periode && (
            <>
              <dt className="text-muted">Periode awal</dt>
              <dd>{formatPeriode(s.periode)}</dd>
            </>
          )}
          <dt className="text-muted">Tanggal setor</dt>
          <dd>{formatTanggal(s.tanggal)}</dd>
          <dt className="text-muted">Disetor oleh</dt>
          <dd>{s.namaPenyetor ?? 'Bendahara'}</dd>
          <dt className="text-muted">Cara bayar</dt>
          <dd>{s.metode === 'tunai' ? 'Tunai' : 'Transfer'}</dd>
          <dt className="text-muted">Keterangan</dt>
          <dd>{s.keterangan}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border pt-4">
          <span className="text-isi text-muted">
            {s.jumlahAnggota} anggota · {s.jumlahCatatan} catatan
          </span>
          <span className="angka text-judul font-bold text-masuk">{formatRupiah(s.total)}</span>
          <span className="w-full text-ket text-muted">{terbilangRupiah(s.total)}</span>
        </div>
        {s.buktiFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/bukti/${s.buktiFile}`} alt={`Bukti setoran ${s.nomor}`} className="mt-4 max-h-72 rounded-input object-contain" />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Catatan dalam setoran">
        <h2 className="text-judul-kartu font-semibold">Catatan per anggota</h2>
        {s.catatan.length === 0 ? <p className="text-isi text-muted">Semua catatan dalam setoran ini sudah dihapus.</p> : <DaftarCatatan baris={s.catatan} />}
      </section>
    </div>
  )
}
