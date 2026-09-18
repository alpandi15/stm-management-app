import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { ambilAnggota, daftarKeluarga } from '@/server/queries/anggota'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarKeluarga } from '@/components/anggota/DaftarKeluarga'

export const dynamic = 'force-dynamic'

// Halaman Keluarga (Spec 2 §A2, §C3): tanggungan seorang anggota.
export default async function HalamanKeluarga({ params }: { params: { id: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const a = Number.isInteger(id) ? ambilAnggota(id) : null
  if (!a) notFound()
  const asal = a.anggotaAsalId ? ambilAnggota(a.anggotaAsalId) : null
  const { aktif, pecah } = daftarKeluarga(a.id)
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="halus" className="-ml-2 w-fit px-2 text-muted">
        <Link href={`/anggota/${a.id}`}>
          <ArrowLeft /> Kembali ke {a.nama}
        </Link>
      </Button>
      <div>
        <JudulHalaman>Keluarga {a.nama}</JudulHalaman>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-isi text-muted">
          {a.nomor && <span className="angka">{a.nomor}</span>}
          {a.status === 'meninggal' && <span className="rounded-badge bg-keluar-soft px-3 py-0.5 text-ket font-semibold text-keluar">Meninggal dunia</span>}
          {asal && (
            <span>
              Pecah dari keluarga <Link href={`/anggota/${asal.id}/keluarga`} className="font-semibold text-primary underline-offset-4 hover:underline">{asal.nama}</Link>
              {a.tanggalBergabung && `, bergabung ${formatTanggal(a.tanggalBergabung)}`}
            </span>
          )}
        </div>
      </div>
      <DaftarKeluarga anggota={{ id: a.id, nama: a.nama }} aktif={aktif} pecah={pecah} />
    </div>
  )
}
