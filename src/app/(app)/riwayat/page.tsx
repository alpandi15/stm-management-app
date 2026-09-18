import { wajibSesi } from '@/server/auth/session'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

// Kerangka Fase 3; isi sungguhan menyusul sesuai docs/04.
export default async function Halaman() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Riwayat</JudulHalaman>
      <KeadaanKosong
        judul="Belum ada riwayat"
        kalimat="Setiap catatan yang dibuat, diubah, atau dihapus akan tercatat di sini dan bisa dikembalikan."
        tombol={{ label: 'Ke Catatan Kas', href: '/catatan' }}
      />
    </div>
  )
}
