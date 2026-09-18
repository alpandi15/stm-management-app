import { wajibSesi } from '@/server/auth/session'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

// Kerangka Fase 3; isi sungguhan menyusul sesuai docs/04.
export default async function Halaman() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Anggota</JudulHalaman>
      <KeadaanKosong
        judul="Belum ada anggota"
        kalimat="Daftar anggota memudahkan mencatat iuran. Anda juga bisa mengetik nama bebas saat mencatat."
        tombol={{ label: 'Ke Beranda', href: '/beranda' }}
      />
    </div>
  )
}
