'use client'
import { useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { bukaKunci, pulihkanPin } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { InputPin } from '@/components/auth/InputPin'
import { KodePemulihan } from '@/components/auth/KodePemulihan'

/** Lupa PIN (docs/02 §4.5): kode pemulihan → PIN baru (dua kali) → kode baru sekali. */
export function FormLupaPin({ namaStm, onBatal }: { namaStm: string; onBatal: () => void }) {
  const [kode, setKode] = useState('')
  const [tahap, setTahap] = useState<'kode' | 'pin'>('kode')
  const [pinPertama, setPinPertama] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [reset, setReset] = useState(0)
  const [kodeBaru, setKodeBaru] = useState<string | null>(null)
  const [pinFinal, setPinFinal] = useState<string | null>(null)
  const [sedangKirim, mulaiKirim] = useTransition()

  function formatKode(teks: string) {
    const bersih = teks.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    return bersih.length > 5 ? `${bersih.slice(0, 5)}-${bersih.slice(5)}` : bersih
  }

  function lanjutKePin() {
    if (kode.replace('-', '').length !== 10) {
      return setGalat('Kode pemulihan terdiri dari 10 huruf dan angka, misalnya ABCDE-23456.')
    }
    setGalat(null)
    setTahap('pin')
  }

  function pinSelesai(pin: string) {
    if (pinPertama === null) {
      setPinPertama(pin)
      setGalat(null)
      setReset((n) => n + 1)
      return
    }
    if (pin !== pinPertama) {
      setPinPertama(null)
      setGalat('PIN yang diulang tidak sama. Coba buat lagi dari awal.')
      setReset((n) => n + 1)
      return
    }
    mulaiKirim(async () => {
      const hasil = await pulihkanPin({ kode, pinBaru: pin })
      if (!hasil.ok) {
        setPinPertama(null)
        setReset((n) => n + 1)
        if (hasil.field === 'kode') setTahap('kode')
        setGalat(hasil.pesan)
        return
      }
      setPinFinal(pin)
      setKodeBaru(hasil.data.kodePemulihan)
    })
  }

  function lanjutKeBeranda() {
    mulaiKirim(async () => {
      const hasil = await bukaKunci(pinFinal ?? '')
      if (!hasil.ok) {
        setGalat(hasil.pesan)
        return
      }
      window.location.assign('/beranda')
    })
  }

  if (kodeBaru) {
    return (
      <div className="rounded-kartu border border-border bg-surface p-6 shadow-kartu">
        <KodePemulihan
          kode={kodeBaru}
          namaStm={namaStm}
          judul="PIN baru tersimpan. Ini kode pemulihan yang baru."
          onLanjut={lanjutKeBeranda}
          sedangKirim={sedangKirim}
          galat={galat}
        />
      </div>
    )
  }

  return (
    <div className="rounded-kartu border border-border bg-surface p-6 shadow-kartu">
      <Button variant="halus" className="-ml-2 mb-4 px-2 text-muted" onClick={tahap === 'pin' ? () => setTahap('kode') : onBatal} disabled={sedangKirim}>
        <ArrowLeft /> Kembali
      </Button>

      {tahap === 'kode' ? (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            lanjutKePin()
          }}
        >
          <div>
            <h2 className="text-judul font-bold">Lupa PIN?</h2>
            <p className="mt-1 text-isi text-muted">
              Masukkan kode pemulihan yang Anda simpan saat pertama kali memasang aplikasi.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="kode-pemulihan">Kode pemulihan</Label>
            <Input
              id="kode-pemulihan"
              value={kode}
              onChange={(e) => setKode(formatKode(e.target.value))}
              placeholder="ABCDE-23456"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="angka text-center text-judul-kartu font-semibold tracking-[0.15em]"
              aria-invalid={!!galat}
            />
            <PesanGalat>{galat}</PesanGalat>
          </div>
          <Button type="submit" ukuran="aksi" className="w-full">
            Lanjut
          </Button>
          <p className="text-ket text-muted">
            Kode juga hilang? Data Anda tetap aman di komputer ini, tapi tanpa PIN atau kode pemulihan,
            aplikasi tidak bisa dibuka. Inilah kenapa kode pemulihan perlu dicatat.
          </p>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-judul font-bold">Buat PIN baru</h2>
            <p className="mt-1 text-isi text-muted">
              {pinPertama === null ? 'Enam angka. Anda akan diminta mengulanginya.' : 'Ulangi PIN yang sama sekali lagi.'}
            </p>
          </div>
          <InputPin
            label={pinPertama === null ? 'PIN baru' : 'Ulangi PIN'}
            onSelesai={pinSelesai}
            galat={galat}
            kunciReset={reset}
            nonaktif={sedangKirim}
          />
          {sedangKirim && <p className="text-center text-ket text-muted">Menyimpan…</p>}
        </div>
      )}
    </div>
  )
}
