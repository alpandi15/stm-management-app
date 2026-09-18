import { redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { Sidebar } from '@/components/kerangka/Sidebar'
import { BilahBawah } from '@/components/kerangka/BilahBawah'
import { Header } from '@/components/kerangka/Header'
import { Toaster } from '@/components/kerangka/Toaster'

export const dynamic = 'force-dynamic'

// Kerangka aplikasi (docs/01 §4): sidebar kiri, header, bilah bawah di layar sempit.
// Setiap halaman di bawahnya tetap memanggil wajibSesi() sendiri — layout tidak dirender
// ulang pada navigasi antar halaman.
export default async function LayoutAplikasi({ children }: { children: React.ReactNode }) {
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  await wajibSesi()

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar namaStm={p.namaStm} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header namaStm={p.namaStm} />
        <main className="mx-auto w-full max-w-konten flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
      </div>
      <BilahBawah />
      <Toaster />
    </div>
  )
}
