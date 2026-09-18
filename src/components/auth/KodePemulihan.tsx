'use client'
import { useState } from 'react'
import { Copy, Printer, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'

/**
 * Layar Kode Pemulihan (docs/01 §5.1): kode besar, Salin, Cetak, dan centang wajib
 * sebelum lanjut. Satu-satunya gesekan yang sengaja dibuat di seluruh aplikasi.
 */
export function KodePemulihan({
  kode,
  namaStm,
  onLanjut,
  judul = 'Simpan kode pemulihan Anda',
  sedangKirim,
  galat,
}: {
  kode: string
  namaStm: string
  onLanjut: () => void
  judul?: string
  sedangKirim?: boolean
  galat?: string | null
}) {
  const [disimpan, setDisimpan] = useState(false)
  const [tersalin, setTersalin] = useState(false)

  async function salin() {
    try {
      await navigator.clipboard.writeText(kode)
      setTersalin(true)
      setTimeout(() => setTersalin(false), 2000)
    } catch {
      // Clipboard tidak tersedia (mis. halaman tanpa fokus): pilih teksnya agar bisa disalin manual
      const el = document.getElementById('kode-pemulihan')
      if (el) window.getSelection()?.selectAllChildren(el)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-judul font-bold">{judul}</h1>
        <p className="mt-2 text-isi text-muted print:hidden">
          Simpan kode ini. Kalau suatu saat Anda lupa PIN, hanya kode ini yang bisa membukanya.
          Tulis di buku, atau cetak dan simpan di tempat aman. Kode ini tidak akan ditampilkan lagi.
        </p>
      </div>

      <div className="rounded-kartu border-2 border-dashed border-primary bg-primary-soft p-6 text-center">
        <p className="text-ket font-semibold uppercase tracking-wide text-muted">Kode pemulihan · {namaStm}</p>
        <p id="kode-pemulihan" className="angka mt-2 select-all whitespace-nowrap text-[30px] font-bold tracking-[0.1em] text-primary sm:text-saldo sm:tracking-[0.12em]">
          {kode}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <Button variant="sekunder" onClick={salin}>
          {tersalin ? <Check /> : <Copy />}
          {tersalin ? 'Tersalin' : 'Salin'}
        </Button>
        <Button variant="sekunder" onClick={() => window.print()}>
          <Printer />
          Cetak
        </Button>
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <Checkbox id="sudah-simpan" checked={disimpan} onCheckedChange={(v) => setDisimpan(v === true)} />
        <Label htmlFor="sudah-simpan" className="cursor-pointer text-isi font-medium">
          Saya sudah menyimpannya
        </Label>
      </div>

      <PesanGalat className="print:hidden">{galat}</PesanGalat>
      <Button ukuran="aksi" className="w-full print:hidden" disabled={!disimpan || sedangKirim} onClick={onLanjut}>
        {sedangKirim ? 'Membuka…' : 'Lanjut ke Beranda'}
      </Button>
    </div>
  )
}
