'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { hapusKejadian } from '@/server/actions/duka'
import type { BarisKejadian } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalLengkap } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { FormKejadian, type PilihanAlmarhum } from './FormKejadian'

/** Kepala halaman satu kejadian: identitas almarhum, angka ringkas, tombol ubah/cetak/hapus. */
export function KepalaKejadian({ kejadian: k, pilihanAlmarhum, tarifBerlaku }: { kejadian: BarisKejadian; pilihanAlmarhum: PilihanAlmarhum[]; tarifBerlaku: number | null }) {
  const router = useRouter()
  const [ubah, setUbah] = React.useState(false)
  const [hapus, setHapus] = React.useState(false)
  const [sedangKirim, mulai] = React.useTransition()
  const belum = k.jumlahWajib - k.jumlahBayar

  function hapusSekarang() {
    mulai(async () => {
      const hasil = await hapusKejadian(k.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`Kejadian Alm. ${k.namaAlmarhum} dihapus.`)
      router.push('/duka')
      router.refresh()
    })
  }

  return (
    <section className="rounded-kartu border border-border bg-surface p-5 shadow-kartu sm:p-6" aria-label="Kejadian duka">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="angka flex size-14 shrink-0 items-center justify-center rounded-full bg-bg text-judul font-bold text-muted">{k.nomor}</span>
          <div>
            <p className="text-ket font-semibold uppercase tracking-wide text-muted">Kejadian ke-{k.nomor}</p>
            <h1 className="text-judul font-bold">Alm. {k.namaAlmarhum}</h1>
            <p className="text-isi text-muted">{[k.hubungan, formatTanggalLengkap(k.tanggalMeninggal)].filter(Boolean).join(' · ')}</p>
            {k.keterangan && <p className="mt-1 text-ket text-muted">{k.keterangan}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="sekunder" onClick={() => setUbah(true)}>
            <Pencil /> Ubah
          </Button>
          <Button asChild variant="sekunder">
            <Link href={`/cetak/duka/${k.id}`} target="_blank">
              <Printer /> Cetak Daftar Tunggakan
            </Link>
          </Button>
          <Button variant="halus" className="text-keluar" onClick={() => setHapus(true)}>
            <Trash2 /> Hapus
          </Button>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <div>
          <dt className="text-ket text-muted">Iuran per anggota</dt>
          <dd className="angka text-judul-kartu font-bold">{formatRupiah(k.tarif)}</dd>
        </div>
        <div>
          <dt className="text-ket text-muted">Sudah bayar</dt>
          <dd className="angka text-judul-kartu font-bold text-masuk">
            {k.jumlahBayar} <span className="text-isi font-normal text-muted">/ {k.jumlahWajib} anggota</span>
          </dd>
        </div>
        <div>
          <dt className="text-ket text-muted">Terkumpul</dt>
          <dd className="angka text-judul-kartu font-bold text-masuk">{formatRupiah(k.totalTerkumpul)}</dd>
        </div>
        <div>
          <dt className="text-ket text-muted">Belum bayar</dt>
          <dd className="angka text-judul-kartu font-bold text-keluar">
            {belum} <span className="text-isi font-normal text-muted">· {formatRupiah(k.totalNunggak)}</span>
          </dd>
        </div>
      </dl>

      <FormKejadian terbuka={ubah} onTutup={() => setUbah(false)} awal={k} pilihanAlmarhum={pilihanAlmarhum} tarifBerlaku={tarifBerlaku} />

      <Dialog open={hapus} onOpenChange={(o) => !o && setHapus(false)}>
        <DialogContent judul="Hapus kejadian ini?">
          <p className="text-judul-kartu font-semibold">Alm. {k.namaAlmarhum}</p>
          <DialogDescription className="text-isi text-muted">Semua centang pembayaran ({k.jumlahBayar} anggota) untuk kejadian ini ikut terhapus. Catatan kas tidak tersentuh.</DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="keluar" ukuran="aksi" className="sm:flex-1" onClick={hapusSekarang} disabled={sedangKirim}>
              Ya, Hapus
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setHapus(false)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
