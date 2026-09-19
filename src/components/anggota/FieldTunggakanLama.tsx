'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { InputRupiah } from '@/components/keuangan/InputRupiah'

export type BarisTunggakanForm = { kunci: number; jumlah: string; tarif: number | null; keterangan: string }
let kunciBaris = 0
export const barisTunggakanBaru = (tarif: number | null = null): BarisTunggakanForm => ({ kunci: ++kunciBaris, jumlah: '', tarif, keterangan: '' })

/** Satu baris isian tunggakan duka lama: berapa kejadian × iuran per kejadian + keterangan. Dipakai di detail anggota dan form tambah anggota. */
export function FieldTunggakanLama({
  b,
  onUbah,
  awalan,
  galat,
}: {
  b: BarisTunggakanForm
  onUbah: (u: Partial<BarisTunggakanForm>) => void
  awalan: string
  galat?: { pesan: string; field?: string } | null
}) {
  const pesan = (k: string) => (galat?.field === `${k}-${b.kunci}` || galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${awalan}-jumlah-${b.kunci}`}>Berapa kejadian</Label>
        <Input
          id={`${awalan}-jumlah-${b.kunci}`}
          inputMode="numeric"
          className="angka"
          value={b.jumlah}
          onChange={(e) => onUbah({ jumlah: e.target.value.replace(/\D/g, '') })}
          aria-invalid={galat?.field === `jumlah-${b.kunci}` || galat?.field === 'jumlah'}
          placeholder="6"
        />
        {pesan('jumlah')}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${awalan}-tarif-${b.kunci}`}>Iuran per kejadian</Label>
        <InputRupiah id={`${awalan}-tarif-${b.kunci}`} nilai={b.tarif} onUbah={(n) => onUbah({ tarif: n })} galat={galat?.field === `tarif-${b.kunci}` || galat?.field === 'tarif'} />
        {pesan('tarif')}
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${awalan}-ket-${b.kunci}`}>
          Keterangan <span className="font-normal text-muted">(boleh kosong)</span>
        </Label>
        <Input id={`${awalan}-ket-${b.kunci}`} value={b.keterangan} onChange={(e) => onUbah({ keterangan: e.target.value })} maxLength={255} placeholder="Contoh: Januari–Mei 2026, pengurus lama" />
      </div>
    </div>
  )
}
