import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { ambilKejadian, daftarAnggotaKejadian, pilihanAlmarhum, tarifBerlaku } from '@/server/queries/duka'
import { Button } from '@/components/ui/button'
import { KepalaKejadian } from '@/components/duka/KepalaKejadian'
import { DaftarCentangDuka } from '@/components/duka/DaftarCentangDuka'

export const dynamic = 'force-dynamic'

// Satu kejadian duka: identitas, angka ringkas, dan daftar centang pembayaran per anggota.
export default async function HalamanKejadian({ params }: { params: { id: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const k = Number.isInteger(id) ? ambilKejadian(id) : null
  if (!k) notFound()
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="halus" className="-ml-2 w-fit px-2 text-muted">
        <Link href="/duka">
          <ArrowLeft /> Buku Duka
        </Link>
      </Button>
      <KepalaKejadian kejadian={k} pilihanAlmarhum={pilihanAlmarhum()} tarifBerlaku={tarifBerlaku()} />
      <section className="flex flex-col gap-3" aria-label="Pembayaran per anggota">
        <h2 className="text-judul-kartu font-semibold">Siapa yang sudah bayar?</h2>
        <p className="-mt-2 text-ket text-muted">Klik nama untuk mencentang. Tersimpan langsung, tidak perlu tombol simpan.</p>
        <DaftarCentangDuka kejadianId={k.id} tarif={k.tarif} anggota={daftarAnggotaKejadian(k.id)} />
      </section>
    </div>
  )
}
