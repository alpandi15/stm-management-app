'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { simpanSaldoAwal } from '@/server/actions/pengaturan'
import type { Pengaturan } from '@/server/db/schema'
import { hariIni } from '@/lib/tanggal'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { InputRupiah } from '@/components/keuangan/InputRupiah'

export function KartuSaldoAwal({ p }: { p: Pengaturan }) {
  const router = useRouter()
  const [saldoAwal, setSaldoAwal] = React.useState<number | null>(p.saldoAwal || null)
  const [tanggalMulai, setTanggalMulai] = React.useState(p.tanggalMulai)
  const [galat, setGalat] = React.useState<string | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const hasil = await simpanSaldoAwal({ saldoAwal: saldoAwal ?? 0, tanggalMulai })
      if (!hasil.ok) {
        setGalat(hasil.pesan)
        return
      }
      setGalat(null)
      toast.success('Saldo awal tersimpan. Semua laporan dihitung ulang.')
      router.refresh()
    })
  }
  return (
    <Kartu judul="Saldo Awal" keterangan="Uang kas yang sudah ada sebelum aplikasi ini dipakai, dan tanggal mulai pembukuan.">
      <div className="mb-4 flex items-start gap-3 rounded-input border border-warning bg-warning-soft p-3 text-warning">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <p className="text-isi font-medium">Mengubah saldo awal atau tanggal mulai mengubah Sisa Uang Kas dan semua laporan, termasuk yang sudah pernah dicetak.</p>
      </div>
      <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="saldo-awal">Saldo awal</Label>
          <InputRupiah id="saldo-awal" nilai={saldoAwal} onUbah={setSaldoAwal} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tanggal-mulai">Tanggal mulai pembukuan</Label>
          <Input id="tanggal-mulai" type="date" className="angka sm:max-w-xs" value={tanggalMulai} max={hariIni()} onChange={(e) => setTanggalMulai(e.target.value)} />
          <p className="text-ket text-muted">Catatan dengan tanggal sebelum ini tidak bisa dibuat.</p>
        </div>
        <PesanGalat>{galat}</PesanGalat>
        <Button type="submit" ukuran="aksi" className="sm:w-fit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan…' : 'Simpan Saldo Awal'}
        </Button>
      </form>
    </Kartu>
  )
}
