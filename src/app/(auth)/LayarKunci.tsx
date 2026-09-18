'use client'
import { useEffect, useState, useTransition } from 'react'
import { bukaKunci } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { InputPin } from '@/components/auth/InputPin'
import { FormLupaPin } from './FormLupaPin'
import { Logo } from '@/components/kerangka/Logo'

export function LayarKunci({ namaStm, namaBendahara }: { namaStm: string; namaBendahara: string }) {
  const [galat, setGalat] = useState<string | null>(null)
  const [reset, setReset] = useState(0)
  const [sisaDetik, setSisaDetik] = useState(0)
  const [lupa, setLupa] = useState(false)
  const [membuka, setMembuka] = useState(false)
  const [sedangKirim, mulaiKirim] = useTransition()

  // Hitung mundur saat terkunci sementara (jeda disimpan di server; ini hanya tampilan)
  useEffect(() => {
    if (sisaDetik <= 0) return
    const t = setInterval(() => setSisaDetik((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [sisaDetik > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sisaDetik === 0 && galat?.startsWith('Terlalu banyak')) setGalat(null)
  }, [sisaDetik, galat])

  function kirim(pin: string) {
    mulaiKirim(async () => {
      const hasil = await bukaKunci(pin)
      if (hasil.ok) {
        // Navigasi penuh, bukan router.replace(): dokumen baru dijamin membaca cookie sesi
        // yang baru, dan tidak ada refresh yang bisa membatalkan navigasi.
        setMembuka(true)
        window.location.assign('/beranda')
        return
      }
      setGalat(hasil.pesan)
      setReset((n) => n + 1)
      if (hasil.sisaDetik) setSisaDetik(hasil.sisaDetik)
    })
  }

  const terkunci = sisaDetik > 0
  const pesan = terkunci
    ? sisaDetik >= 60
      ? `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(sisaDetik / 60)} menit.`
      : `Terlalu banyak percobaan. Coba lagi dalam ${sisaDetik} detik.`
    : galat

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo ukuran={96} prioritas className="mb-5" />
          <p className="text-judul-kartu font-semibold text-muted">{namaStm}</p>
          <h1 className="mt-1 text-judul font-bold">Halo, {namaBendahara}</h1>
        </div>

        {lupa ? (
          <FormLupaPin namaStm={namaStm} onBatal={() => setLupa(false)} />
        ) : (
          <>
            <p className="mb-6 text-center text-isi text-muted">{membuka ? 'Membuka aplikasi…' : sedangKirim ? 'Memeriksa PIN…' : 'Masukkan PIN untuk membuka aplikasi'}</p>
            <InputPin label="PIN" onSelesai={kirim} galat={pesan} kunciReset={reset} nonaktif={sedangKirim || terkunci || membuka} />
            <div className="mt-8 text-center">
              <Button variant="tautan" onClick={() => setLupa(true)}>
                Lupa PIN?
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
