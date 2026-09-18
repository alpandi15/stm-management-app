'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { aturAutoKunci, buatUlangKodePemulihan, gantiPin } from '@/server/actions/pengaturan'
import type { Pengaturan } from '@/server/db/schema'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { KodePemulihan } from '@/components/auth/KodePemulihan'

const hanyaAngka = (s: string) => s.replace(/\D/g, '').slice(0, 6)

export function KartuKeamanan({ p }: { p: Pengaturan }) {
  const router = useRouter()
  const [pin, setPin] = React.useState({ lama: '', baru: '', ulang: '' })
  const [galatPin, setGalatPin] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [pinKode, setPinKode] = React.useState('')
  const [galatKode, setGalatKode] = React.useState<string | null>(null)
  const [kodeBaru, setKodeBaru] = React.useState<string | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function kirimPin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.baru !== pin.ulang) {
      setGalatPin({ pesan: 'PIN baru yang diulang tidak sama.', field: 'ulang' })
      return
    }
    mulai(async () => {
      const hasil = await gantiPin({ pinLama: pin.lama, pinBaru: pin.baru })
      if (!hasil.ok) {
        setGalatPin({ pesan: hasil.pesan, field: hasil.field === 'pinLama' ? 'lama' : hasil.field === 'pinBaru' ? 'baru' : undefined })
        return
      }
      setGalatPin(null)
      setPin({ lama: '', baru: '', ulang: '' })
      toast.success('PIN diganti. Pakai PIN baru saat membuka aplikasi.')
    })
  }

  function kirimKode(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const hasil = await buatUlangKodePemulihan(pinKode)
      if (!hasil.ok) {
        setGalatKode(hasil.pesan)
        return
      }
      setGalatKode(null)
      setPinKode('')
      setKodeBaru(hasil.data.kodePemulihan)
    })
  }

  function ubahMenit(menit: number) {
    mulai(async () => {
      const hasil = await aturAutoKunci(menit)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`Aplikasi akan terkunci sendiri setelah ${menit} menit tidak dipakai.`)
      router.refresh()
    })
  }

  // Fungsi render biasa, bukan komponen — supaya input tidak kehilangan fokus tiap ketikan
  const fieldPin = ({ id, label, k }: { id: string; label: string; k: keyof typeof pin }) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin[k]} onChange={(e) => setPin({ ...pin, [k]: hanyaAngka(e.target.value) })} className="angka tracking-[0.3em]" aria-invalid={galatPin?.field === k} />
      {galatPin?.field === k && <PesanGalat>{galatPin.pesan}</PesanGalat>}
    </div>
  )

  return (
    <Kartu judul="Keamanan" keterangan="PIN, kode pemulihan, dan kunci otomatis.">
      <div className="flex flex-col gap-8">
        <form onSubmit={kirimPin} className="flex flex-col gap-4" noValidate>
          <h3 className="font-semibold">Ganti PIN</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {fieldPin({ id: 'pin-lama', label: 'PIN lama', k: 'lama' })}
            {fieldPin({ id: 'pin-baru', label: 'PIN baru', k: 'baru' })}
            {fieldPin({ id: 'pin-ulang', label: 'Ulangi PIN baru', k: 'ulang' })}
          </div>
          {galatPin && !galatPin.field && <PesanGalat>{galatPin.pesan}</PesanGalat>}
          <Button type="submit" ukuran="aksi" className="sm:w-fit" disabled={sedangKirim || pin.lama.length < 6 || pin.baru.length < 6 || pin.ulang.length < 6}>
            Ganti PIN
          </Button>
        </form>

        <form onSubmit={kirimKode} className="flex flex-col gap-4" noValidate>
          <div>
            <h3 className="font-semibold">Buat ulang kode pemulihan</h3>
            <p className="text-ket text-muted">Kode lama tidak berlaku lagi. Kode baru ditampilkan sekali saja.</p>
          </div>
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="pin-kode">Masukkan PIN untuk melanjutkan</Label>
            <Input id="pin-kode" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pinKode} onChange={(e) => setPinKode(hanyaAngka(e.target.value))} className="angka tracking-[0.3em]" aria-invalid={!!galatKode} />
            <PesanGalat>{galatKode}</PesanGalat>
          </div>
          <Button type="submit" variant="sekunder" ukuran="aksi" className="sm:w-fit" disabled={sedangKirim || pinKode.length < 6}>
            Buat Kode Baru
          </Button>
        </form>

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="auto-kunci">Kunci otomatis bila tidak dipakai selama</Label>
          <PilihanCari<number>
            id="auto-kunci"
            nilai={p.autoKunciMenit}
            onUbah={(v) => v !== null && ubahMenit(v)}
            nonaktif={sedangKirim}
            pilihan={[5, 15, 30, 60].map((m) => ({ nilai: m, label: `${m} menit` }))}
          />
        </div>
      </div>

      <Dialog open={kodeBaru !== null} onOpenChange={() => {}}>
        <DialogContent judul="Kode pemulihan baru" tanpaTutup>
          {kodeBaru && <KodePemulihan kode={kodeBaru} namaStm={p.namaStm} judul="Simpan kode pemulihan yang baru" onLanjut={() => setKodeBaru(null)} />}
        </DialogContent>
      </Dialog>
    </Kartu>
  )
}
