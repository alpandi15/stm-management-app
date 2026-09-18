'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { simpanIdentitas } from '@/server/actions/pengaturan'
import type { Pengaturan } from '@/server/db/schema'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'

export function KartuIdentitas({ p }: { p: Pengaturan }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ namaStm: p.namaStm, alamat: p.alamat ?? '', namaBendahara: p.namaBendahara, namaKetua: p.namaKetua ?? '' })
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const hasil = await simpanIdentitas({ ...form, alamat: form.alamat || null, namaKetua: form.namaKetua || null })
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      setGalat(null)
      toast.success('Identitas STM tersimpan.')
      router.refresh()
    })
  }
  // Fungsi render biasa (bukan komponen): komponen yang dibuat di dalam render akan
  // di-mount ulang tiap ketikan dan input kehilangan fokus.
  const field = ({ id, label, k, opsional }: { id: string; label: string; k: keyof typeof form; opsional?: boolean }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} {opsional && <span className="font-normal text-muted">(boleh kosong)</span>}
      </Label>
      <Input id={id} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} maxLength={k === 'alamat' ? 255 : 120} aria-invalid={galat?.field === k} />
      {galat?.field === k && <PesanGalat>{galat.pesan}</PesanGalat>}
    </div>
  )
  return (
    <Kartu judul="Identitas STM" keterangan="Dipakai di kop laporan dan blok tanda tangan.">
      <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
        {field({ id: 'nama-stm', label: 'Nama STM', k: 'namaStm' })}
        {field({ id: 'alamat-stm', label: 'Alamat', k: 'alamat', opsional: true })}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {field({ id: 'nama-bendahara', label: 'Nama bendahara', k: 'namaBendahara' })}
          {field({ id: 'nama-ketua', label: 'Nama ketua', k: 'namaKetua', opsional: true })}
        </div>
        {galat && !galat.field && <PesanGalat>{galat.pesan}</PesanGalat>}
        <Button type="submit" ukuran="aksi" className="sm:w-fit" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan…' : 'Simpan Identitas'}
        </Button>
      </form>
    </Kartu>
  )
}
