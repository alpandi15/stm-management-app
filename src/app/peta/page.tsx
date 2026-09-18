import { wajibSesi } from '@/server/auth/session'
import { ringkasanAnggota, semuaTitikAnggota } from '@/server/queries/anggota'
import { PetaSemuaDinamis } from '@/components/anggota/PetaSemuaDinamis'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Peta Anggota — Aplikasi Kas STM' }

// Peta seluruh alamat anggota: halaman penuh di luar kerangka (tanpa sidebar), klaster marker.
export default async function HalamanPeta() {
  await wajibSesi()
  return <PetaSemuaDinamis titik={semuaTitikAnggota()} totalAnggota={ringkasanAnggota().semua} />
}
