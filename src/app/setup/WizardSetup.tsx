'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { selesaikanSetup } from '@/server/actions/setup'
import { bukaKunci } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { InputPin } from '@/components/auth/InputPin'
import { KodePemulihan } from '@/components/auth/KodePemulihan'
import { cn } from '@/lib/utils'

// Tiga langkah, satu pertanyaan per layar (docs/01 §5.1), lalu layar Kode Pemulihan.
type Langkah = 1 | 2 | 3

export function WizardSetup() {
  const router = useRouter()
  const [langkah, setLangkah] = useState<Langkah>(1)
  const [namaStm, setNamaStm] = useState('')
  const [namaBendahara, setNamaBendahara] = useState('')
  const [pinPertama, setPinPertama] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [resetPin, setResetPin] = useState(0)
  const [kode, setKode] = useState<string | null>(null)
  const [pinFinal, setPinFinal] = useState<string | null>(null)
  const [sedangKirim, mulaiKirim] = useTransition()

  function keLangkah(l: Langkah) {
    setGalat(null)
    setLangkah(l)
  }

  function lanjutNamaStm() {
    if (namaStm.trim().length < 3) return setGalat('Nama STM belum diisi. Tulis minimal 3 huruf.')
    keLangkah(2)
  }

  function lanjutNamaBendahara() {
    if (namaBendahara.trim().length < 3) return setGalat('Nama Anda belum diisi. Tulis minimal 3 huruf.')
    keLangkah(3)
  }

  function pinSelesai(pin: string) {
    if (pinPertama === null) {
      setPinPertama(pin)
      setGalat(null)
      setResetPin((n) => n + 1)
      return
    }
    if (pin !== pinPertama) {
      setPinPertama(null)
      setGalat('PIN yang diulang tidak sama. Coba buat lagi dari awal.')
      setResetPin((n) => n + 1)
      return
    }
    mulaiKirim(async () => {
      const hasil = await selesaikanSetup({ namaStm: namaStm.trim(), namaBendahara: namaBendahara.trim(), pin })
      if (!hasil.ok) {
        setPinPertama(null)
        setResetPin((n) => n + 1)
        if (hasil.field === 'namaStm') keLangkah(1)
        else if (hasil.field === 'namaBendahara') keLangkah(2)
        setGalat(hasil.pesan)
        return
      }
      setPinFinal(pin)
      setKode(hasil.data.kodePemulihan)
    })
  }

  // Sesi baru dibuat di sini, setelah kode pemulihan dikonfirmasi tersimpan
  function lanjutKeBeranda() {
    mulaiKirim(async () => {
      const hasil = await bukaKunci(pinFinal ?? '')
      if (!hasil.ok) {
        setGalat(hasil.pesan)
        return
      }
      router.replace('/beranda')
      router.refresh()
    })
  }

  if (kode) {
    return (
      <KodePemulihan kode={kode} namaStm={namaStm.trim()} onLanjut={lanjutKeBeranda} sedangKirim={sedangKirim} galat={galat} />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {langkah > 1 && (
        <Button variant="halus" className="-ml-2 w-fit px-2 text-muted" onClick={() => keLangkah((langkah - 1) as Langkah)} disabled={sedangKirim}>
          <ArrowLeft /> Kembali
        </Button>
      )}

      {langkah === 1 && (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            lanjutNamaStm()
          }}
        >
          <div>
            <h1 className="text-judul font-bold">Selamat datang.</h1>
            <p className="mt-1 text-judul-kartu font-semibold">Apa nama STM Anda?</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nama-stm">Nama STM</Label>
            <Input
              id="nama-stm"
              value={namaStm}
              onChange={(e) => setNamaStm(e.target.value)}
              autoFocus
              autoComplete="organization"
              aria-invalid={!!galat}
              maxLength={120}
            />
            <p className="text-ket text-muted">Contoh: STM Setia Kawan Blok C</p>
            <PesanGalat>{galat}</PesanGalat>
          </div>
          <Button type="submit" ukuran="aksi" className="w-full">
            Lanjut
          </Button>
        </form>
      )}

      {langkah === 2 && (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            lanjutNamaBendahara()
          }}
        >
          <h1 className="text-judul font-bold">Siapa nama Anda?</h1>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nama-bendahara">Nama bendahara</Label>
            <Input
              id="nama-bendahara"
              value={namaBendahara}
              onChange={(e) => setNamaBendahara(e.target.value)}
              autoFocus
              autoComplete="name"
              aria-invalid={!!galat}
              maxLength={120}
            />
            <p className="text-ket text-muted">Dipakai di laporan sebagai nama bendahara.</p>
            <PesanGalat>{galat}</PesanGalat>
          </div>
          <Button type="submit" ukuran="aksi" className="w-full">
            Lanjut
          </Button>
        </form>
      )}

      {langkah === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-judul font-bold">Buat PIN untuk membuka aplikasi</h1>
            <p className="mt-1 text-isi text-muted">
              {pinPertama === null ? 'Enam angka. Anda akan diminta mengulanginya.' : 'Ulangi PIN yang sama sekali lagi.'}
            </p>
          </div>
          <InputPin
            label={pinPertama === null ? 'PIN baru' : 'Ulangi PIN'}
            onSelesai={pinSelesai}
            galat={galat}
            kunciReset={resetPin}
            nonaktif={sedangKirim}
          />
          {sedangKirim && <p className="text-center text-ket text-muted">Menyiapkan aplikasi…</p>}
        </div>
      )}

      <div className="flex justify-center gap-2" aria-label={`Langkah ${langkah} dari 3`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn('size-2.5 rounded-full', n === langkah ? 'bg-primary' : 'bg-border')} />
        ))}
      </div>
    </div>
  )
}
