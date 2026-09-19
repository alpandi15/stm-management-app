'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Search, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { aturPembayaranDuka, tandaiBanyakDuka } from '@/server/actions/duka'
import type { BarisAnggotaKejadian } from '@/server/queries/duka'
import { formatTanggal } from '@/lib/tanggal'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Saring = 'belum' | 'sudah' | 'semua'

/**
 * Daftar centang pembayaran satu kejadian. Klik baris = centang/hapus centang, langsung
 * tersimpan (optimistis; dibatalkan bila server menolak). Yang tidak wajib tidak ditampilkan.
 */
export function DaftarCentangDuka({ kejadianId, tarif, anggota }: { kejadianId: number; tarif: number; anggota: BarisAnggotaKejadian[] }) {
  const router = useRouter()
  const [cari, setCari] = React.useState('')
  const [saring, setSaring] = React.useState<Saring>('belum')
  const [bayar, setBayar] = React.useState<Map<number, string | null>>(() => new Map(anggota.filter((a) => a.sudahBayar).map((a) => [a.id, a.tanggalBayar])))
  const [sibuk, setSibuk] = React.useState<Set<number>>(new Set())
  const [konfirmasiSemua, setKonfirmasiSemua] = React.useState(false)
  const [sedangKirim, mulai] = React.useTransition()

  React.useEffect(() => {
    setBayar(new Map(anggota.filter((a) => a.sudahBayar).map((a) => [a.id, a.tanggalBayar])))
  }, [anggota])

  const wajib = React.useMemo(() => anggota.filter((a) => a.wajib), [anggota])
  const tidakWajib = anggota.length - wajib.length
  const jumlahBayar = wajib.filter((a) => bayar.has(a.id)).length
  const q = cari.trim().toLowerCase()
  const tampil = wajib.filter((a) => {
    if (saring === 'belum' && bayar.has(a.id)) return false
    if (saring === 'sudah' && !bayar.has(a.id)) return false
    if (!q) return true
    return a.nama.toLowerCase().includes(q) || (a.nomor ?? '').toLowerCase().includes(q) || (a.alamat ?? '').toLowerCase().includes(q)
  })

  async function toggle(a: BarisAnggotaKejadian) {
    if (sibuk.has(a.id)) return
    const sudah = bayar.has(a.id)
    setSibuk((s) => new Set(s).add(a.id))
    setBayar((m) => {
      const n = new Map(m)
      if (sudah) n.delete(a.id)
      else n.set(a.id, null)
      return n
    })
    const hasil = await aturPembayaranDuka(kejadianId, a.id, !sudah)
    setSibuk((s) => {
      const n = new Set(s)
      n.delete(a.id)
      return n
    })
    if (!hasil.ok) {
      toast.error(hasil.pesan)
      setBayar((m) => {
        const n = new Map(m)
        if (sudah) n.set(a.id, a.tanggalBayar)
        else n.delete(a.id)
        return n
      })
      return
    }
    router.refresh()
  }

  function tandaiTampil(sudahBayar: boolean) {
    const ids = tampil.map((a) => a.id)
    if (ids.length === 0) return
    mulai(async () => {
      const hasil = await tandaiBanyakDuka(kejadianId, ids, sudahBayar)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(sudahBayar ? `${hasil.data.jumlah} anggota ditandai sudah bayar.` : `Centang ${hasil.data.jumlah} anggota dihapus.`)
      router.refresh()
    })
  }

  function tandaiSemuaWajib() {
    mulai(async () => {
      const hasil = await tandaiBanyakDuka(
        kejadianId,
        wajib.map((a) => a.id),
        true,
      )
      setKonfirmasiSemua(false)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`${hasil.data.jumlah} anggota ditandai sudah bayar. Hapus centang pada yang memang belum bayar.`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, nomor, atau alamat…" className="pl-12 pr-11" aria-label="Cari anggota" />
          {cari && (
            <button type="button" onClick={() => setCari('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text">
              <X className="size-5" />
            </button>
          )}
        </div>
        <div role="radiogroup" aria-label="Tampilkan" className="grid grid-cols-3 gap-2 sm:w-auto">
          {(
            [
              ['belum', `Belum bayar (${wajib.length - jumlahBayar})`],
              ['sudah', `Sudah bayar (${jumlahBayar})`],
              ['semua', `Semua (${wajib.length})`],
            ] as const
          ).map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              role="radio"
              aria-checked={saring === nilai}
              onClick={() => setSaring(nilai)}
              className={cn(
                'min-h-sentuh whitespace-nowrap rounded-input border-2 px-3 text-isi font-semibold transition-colors duration-150',
                saring === nilai ? 'border-primary bg-primary-soft text-primary' : 'border-border-kuat bg-input text-text hover:bg-bg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-ket text-muted">
        <span>
          {tampil.length} tampil{tidakWajib > 0 && ` · ${tidakWajib} anggota tidak wajib (bergabung belakangan, nonaktif, atau sudah meninggal)`}
        </span>
        <div className="flex flex-wrap gap-1">
          <Button variant="halus" onClick={() => tandaiTampil(true)} disabled={sedangKirim || tampil.every((a) => bayar.has(a.id))}>
            <CheckSquare /> Tandai semua yang tampil sudah bayar
          </Button>
          <Button variant="halus" onClick={() => setKonfirmasiSemua(true)} disabled={sedangKirim || jumlahBayar === wajib.length}>
            Tandai semua wajib sudah bayar
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border rounded-input border-2 border-border bg-surface">
        {tampil.length === 0 && (
          <li className="px-4 py-6 text-center text-isi text-muted">{saring === 'belum' && !q ? 'Semua anggota yang wajib sudah membayar.' : 'Tidak ada anggota yang cocok.'}</li>
        )}
        {tampil.map((a) => {
          const sudah = bayar.has(a.id)
          const tanggal = bayar.get(a.id)
          return (
            <li key={a.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={sudah}
                aria-label={`${a.nama} ${sudah ? 'sudah' : 'belum'} bayar`}
                disabled={sibuk.has(a.id)}
                onClick={() => toggle(a)}
                className={cn('flex min-h-aksi w-full items-center gap-4 px-4 py-2 text-left transition-colors duration-150 hover:bg-bg disabled:opacity-60')}
              >
                {sudah ? <CheckSquare className="size-8 shrink-0 text-masuk" /> : <Square className="size-8 shrink-0 text-border-kuat" />}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-form font-semibold', sudah && 'text-muted')}>
                    {a.nama}
                    {a.nomor && <span className="angka ml-2 text-ket font-normal text-muted">{a.nomor}</span>}
                  </span>
                  <span className="block truncate text-ket text-muted">
                    {sudah ? `Sudah bayar${tanggal ? ` · ${formatTanggal(tanggal)}` : ''}` : a.alamat || 'Belum bayar'}
                  </span>
                </span>
                <span className={cn('angka shrink-0 rounded-badge px-3 py-1 text-ket font-semibold', sudah ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')}>
                  {sudah ? 'Lunas' : formatRupiah(tarif)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog open={konfirmasiSemua} onOpenChange={(o) => !o && setKonfirmasiSemua(false)}>
        <DialogContent judul="Tandai semua sudah bayar?">
          <DialogDescription className="text-isi text-muted">
            {wajib.length - jumlahBayar} anggota yang belum dicentang akan ditandai sudah bayar. Cocok untuk kejadian lama yang hampir semua sudah lunas — setelah itu hapus centang pada yang memang masih menunggak.
          </DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button ukuran="aksi" className="sm:flex-1" onClick={tandaiSemuaWajib} disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Ya, Tandai Semua'}
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setKonfirmasiSemua(false)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
