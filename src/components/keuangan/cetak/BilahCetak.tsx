'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { diElectron } from '@/lib/electron'
import { Button } from '@/components/ui/button'

/**
 * Bilah alat di atas dokumen (tidak ikut tercetak). Di Electron, "Simpan sebagai PDF"
 * memakai printToPDF lewat IPC dengan nama berkas deskriptif; di browser jatuh ke
 * dialog cetak biasa yang juga punya pilihan Simpan sebagai PDF.
 * Memanggil window.print() otomatis saat siap, kecuali ?cetak=0 (docs/02 §7).
 */
export function BilahCetak({ namaBerkas, otomatis }: { namaBerkas: string; otomatis: boolean }) {
  const router = useRouter()
  const [electron, setElectron] = React.useState(false)
  const [sedangSimpan, setSedangSimpan] = React.useState(false)

  React.useEffect(() => {
    setElectron(diElectron())
    if (!otomatis) return
    const t = setTimeout(() => {
      // Tunggu font terpasang supaya pratinjau tidak memakai font cadangan
      const siap = document.fonts?.ready ?? Promise.resolve()
      siap.then(() => window.print())
    }, 400)
    return () => clearTimeout(t)
  }, [otomatis])

  async function simpanPdf() {
    if (!window.stm) {
      window.print()
      return
    }
    setSedangSimpan(true)
    try {
      const hasil = await window.stm.cetakPdf(namaBerkas)
      if (hasil.ok) toast.success(`PDF tersimpan: ${hasil.data.path}`)
      else toast.error(hasil.pesan)
    } finally {
      setSedangSimpan(false)
    }
  }

  return (
    <div className="tanpa-cetak sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <Button variant="halus" onClick={() => router.back()}>
        <ArrowLeft /> Kembali
      </Button>
      <span className="flex-1" />
      <Button variant="sekunder" onClick={() => window.print()}>
        <Printer /> Cetak
      </Button>
      <Button onClick={simpanPdf} disabled={sedangSimpan}>
        <FileDown /> {sedangSimpan ? 'Menyimpan…' : 'Simpan sebagai PDF'}
      </Button>
      {!electron && (
        <p className="w-full text-ket text-muted sm:w-auto">Di dialog cetak, pilih tujuan <strong>Simpan sebagai PDF</strong> bila ingin berkasnya.</p>
      )}
    </div>
  )
}
