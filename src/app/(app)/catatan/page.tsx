import { wajibSesi } from '@/server/auth/session'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

// Kerangka Fase 3; isi sungguhan menyusul sesuai docs/04.
export default async function Halaman() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Catatan Kas</JudulHalaman>
      <KeadaanKosong
        judul="Belum ada catatan kas"
        kalimat="Setiap uang yang masuk dan keluar dicatat di sini. Mulai dengan mencatat yang pertama."
        tombol={{ label: 'Catat Uang Masuk', href: '/catatan/baru?jenis=masuk' }}
      />
    </div>
  )
}
