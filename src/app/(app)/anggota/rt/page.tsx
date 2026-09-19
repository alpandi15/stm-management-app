import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { daftarRt, jumlahTanpaRt } from '@/server/queries/rt'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KelolaRt } from '@/components/anggota/KelolaRt'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Data RT — Aplikasi Kas STM' }

// Data induk RT untuk anggota (tambah/ubah/hapus).
export default async function HalamanRt() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="halus" className="-ml-2 w-fit px-2 text-muted">
        <Link href="/anggota">
          <ArrowLeft /> Kembali ke Anggota
        </Link>
      </Button>
      <JudulHalaman>Data RT</JudulHalaman>
      <p className="-mt-3 text-isi text-muted">RT dipilih saat menambah atau mengubah anggota. Daftar anggota bisa disaring per RT.</p>
      <KelolaRt daftar={daftarRt()} tanpaRt={jumlahTanpaRt()} />
    </div>
  )
}
