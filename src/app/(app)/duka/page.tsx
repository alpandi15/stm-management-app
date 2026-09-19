import { wajibSesi } from '@/server/auth/session'
import { daftarKejadian, pilihanAlmarhum, tarifBerlaku } from '@/server/queries/duka'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarKejadian } from '@/components/duka/DaftarKejadian'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Buku Duka — Aplikasi Kas STM' }

// Buku Duka (docs/02 §5.1e): daftar kejadian meninggal + siapa yang sudah/belum bayar iurannya.
export default async function HalamanDuka() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Buku Duka</JudulHalaman>
      <p className="-mt-3 text-isi text-muted">Satu baris untuk setiap orang yang meninggal. Buka salah satu untuk mencentang siapa yang sudah membayar iuran dukanya.</p>
      <DaftarKejadian daftar={daftarKejadian()} pilihanAlmarhum={pilihanAlmarhum()} tarifBerlaku={tarifBerlaku()} />
    </div>
  )
}
