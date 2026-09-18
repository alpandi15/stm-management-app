'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DatabaseBackup, FolderOpen, RotateCcw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cadangkanKeFolder, cadangkanKeLokasi, periksaBerkasPulihkan, pulihkanDari, unggahBerkasPulihkan } from '@/server/actions/cadangan'
import type { InfoCadangan, RingkasanBerkas } from '@/server/services/cadangan'
import { diElectron } from '@/lib/electron'
import { formatTanggal, formatWaktu } from '@/lib/tanggal'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'

function ukuranTeks(b: number) {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
}

export function KartuCadangan({ daftar, namaBawaan }: { daftar: InfoCadangan[]; namaBawaan: string }) {
  const router = useRouter()
  const [electron, setElectron] = React.useState(false)
  const [ringkasan, setRingkasan] = React.useState<RingkasanBerkas | null>(null)
  const [sedangKirim, mulai] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => setElectron(diElectron()), [])

  function buatCadangan() {
    mulai(async () => {
      if (window.stm) {
        const lokasi = await window.stm.pilihLokasiCadangan(namaBawaan)
        if (!lokasi.ok) return
        const hasil = await cadangkanKeLokasi(lokasi.data.path)
        if (!hasil.ok) {
          toast.error(hasil.pesan)
          return
        }
        toast.success(`Cadangan tersimpan: ${hasil.data}`)
      } else {
        // Browser: simpan ke folder cadangan dan tawarkan unduhan
        const hasil = await cadangkanKeFolder()
        if (!hasil.ok) {
          toast.error(hasil.pesan)
          return
        }
        toast.success('Cadangan dibuat di folder data. Unduhan dimulai.')
        window.location.href = '/api/cadangan'
      }
      router.refresh()
    })
  }

  function pilihBerkas() {
    if (window.stm) {
      mulai(async () => {
        const b = await window.stm!.pilihBerkasPulihkan()
        if (!b.ok) return
        const hasil = await periksaBerkasPulihkan(b.data.path)
        if (!hasil.ok) {
          toast.error(hasil.pesan)
          return
        }
        setRingkasan(hasil.data)
      })
    } else {
      inputRef.current?.click()
    }
  }

  function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    mulai(async () => {
      const fd = new FormData()
      fd.set('berkas', f)
      const hasil = await unggahBerkasPulihkan(fd)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      setRingkasan(hasil.data)
    })
    e.target.value = ''
  }

  function periksaDariDaftar(b: InfoCadangan) {
    mulai(async () => {
      const hasil = await periksaBerkasPulihkan(b.path)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      setRingkasan(hasil.data)
    })
  }

  function pulihkan() {
    if (!ringkasan) return
    mulai(async () => {
      const hasil = await pulihkanDari(ringkasan.path)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      setRingkasan(null)
      toast.success('Data dipulihkan. Database sebelumnya disimpan sebagai cadangan "sebelum-pulihkan".')
      router.refresh()
    })
  }

  return (
    <Kartu judul="Cadangan Data" keterangan="Seluruh pembukuan ada dalam satu berkas. Cadangan otomatis dibuat setiap aplikasi dibuka; simpan juga salinan ke flash disk secara berkala.">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button ukuran="aksi" onClick={buatCadangan} disabled={sedangKirim}>
          <DatabaseBackup /> Buat Cadangan Sekarang
        </Button>
        <Button variant="sekunder" ukuran="aksi" onClick={pilihBerkas} disabled={sedangKirim}>
          {electron ? <FolderOpen /> : <Upload />} Pulihkan dari Berkas…
        </Button>
        <input ref={inputRef} type="file" accept=".db" className="sr-only" aria-label="Pilih berkas cadangan" onChange={unggah} />
      </div>

      <h3 className="mb-2 mt-6 font-semibold">Cadangan di folder data</h3>
      {daftar.length === 0 ? (
        <p className="text-isi text-muted">Belum ada berkas cadangan.</p>
      ) : (
        <ul className="divide-y divide-border rounded-input border border-border">
          {daftar.map((b) => (
            <li key={b.path} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="angka truncate font-medium">{b.nama}</p>
                <p className="angka text-ket text-muted">
                  {formatWaktu(b.dibuatPada)} · {ukuranTeks(b.ukuran)}
                  {b.jenis === 'sebelum-pulihkan' && ' · sebelum pulihkan'}
                  {b.jenis === 'unggahan' && ' · unggahan'}
                </p>
              </div>
              <Button variant="halus" onClick={() => periksaDariDaftar(b)} disabled={sedangKirim}>
                <RotateCcw /> Pulihkan
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={ringkasan !== null} onOpenChange={(o) => !o && setRingkasan(null)}>
        <DialogContent judul="Pulihkan data dari berkas ini?">
          {ringkasan && (
            <div className="rounded-input border border-border bg-bg px-4 py-3 text-isi">
              <p className="font-semibold">{ringkasan.namaStm}</p>
              <p>
                <span className="angka font-bold">{ringkasan.jumlahCatatan}</span> catatan
                {ringkasan.tanggalAwal && ringkasan.tanggalAkhir && (
                  <>
                    {' '}· {formatTanggal(ringkasan.tanggalAwal)} sampai {formatTanggal(ringkasan.tanggalAkhir)}
                  </>
                )}
              </p>
              <p>
                Sisa uang kas: <span className="angka font-bold">{ringkasan.sisaKasTeks}</span>
              </p>
            </div>
          )}
          <DialogDescription className="text-isi text-muted">
            Data yang sekarang akan diganti seluruhnya dengan isi berkas ini. Salinan data sekarang disimpan dulu sebagai cadangan “sebelum-pulihkan”, jadi masih bisa dikembalikan.
          </DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="keluar" ukuran="aksi" className="sm:flex-1" onClick={pulihkan} disabled={sedangKirim}>
              {sedangKirim ? 'Memulihkan…' : 'Ya, Pulihkan'}
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setRingkasan(null)} disabled={sedangKirim}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Kartu>
  )
}
