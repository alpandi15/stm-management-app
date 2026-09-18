import { wajibSesi } from '@/server/auth/session'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

// Kerangka Fase 3; isi sungguhan menyusul sesuai docs/04.
export default async function Halaman() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Laporan</JudulHalaman>
      <KeadaanKosong
        judul="Laporan belum bisa dibuat"
        kalimat="Laporan dihitung dari catatan kas. Setelah ada catatan, ringkasan dan rincian per jenis akan tampil di sini."
        tombol={{ label: 'Ke Catatan Kas', href: '/catatan' }}
      />
    </div>
  )
}
