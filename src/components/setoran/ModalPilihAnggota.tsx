'use client'
import * as React from 'react'
import { CheckSquare, Search, Square } from 'lucide-react'
import type { AnggotaUntukForm } from '@/server/queries/transaksi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Modal pilih anggota: cari, centang banyak, "centang semua yang tampil", lalu tambahkan
 * sekaligus. Anggota yang sudah ada di setoran atau sudah bayar periode jenis utama diberi tanda.
 */
export function ModalPilihAnggota({
  terbuka,
  onTutup,
  daftar,
  sudahDitambahkan,
  sudahBayar,
  labelSudahBayar,
  onTambah,
}: {
  terbuka: boolean
  onTutup: () => void
  daftar: AnggotaUntukForm[]
  sudahDitambahkan: Set<number>
  sudahBayar: Record<number, string>
  labelSudahBayar: string
  onTambah: (id: number[]) => void
}) {
  const [cari, setCari] = React.useState('')
  const [dipilih, setDipilih] = React.useState<Set<number>>(new Set())
  React.useEffect(() => {
    if (terbuka) {
      setCari('')
      setDipilih(new Set())
    }
  }, [terbuka])

  const c = cari.trim().toLowerCase()
  const tampil = daftar.filter((a) => !c || a.nama.toLowerCase().includes(c) || (a.nomor ?? '').toLowerCase().includes(c))
  const bisaDipilih = tampil.filter((a) => !sudahDitambahkan.has(a.id))

  function toggle(id: number) {
    setDipilih((s) => {
      const b = new Set(s)
      if (b.has(id)) b.delete(id)
      else b.add(id)
      return b
    })
  }

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent judul="Pilih anggota yang bayar" className="max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input autoFocus aria-label="Cari anggota" placeholder="Ketik nama atau nomor anggota…" className="pl-12" value={cari} onChange={(e) => setCari(e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-ket text-muted">
          <span>
            {dipilih.size} dipilih · {tampil.length} tampil
          </span>
          <div className="flex gap-1">
            <Button variant="halus" onClick={() => setDipilih(new Set([...dipilih, ...bisaDipilih.filter((a) => !sudahBayar[a.id]).map((a) => a.id)]))} disabled={bisaDipilih.length === 0}>
              <CheckSquare /> Centang semua yang tampil
            </Button>
            <Button variant="halus" onClick={() => setDipilih(new Set())} disabled={dipilih.size === 0}>
              <Square /> Kosongkan
            </Button>
          </div>
        </div>
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-input border border-border">
          {tampil.length === 0 && <li className="px-3 py-4 text-isi text-muted">Tidak ada anggota yang cocok.</li>}
          {tampil.map((a) => {
            const ada = sudahDitambahkan.has(a.id)
            const bayar = sudahBayar[a.id]
            const aktif = dipilih.has(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={aktif}
                  aria-label={`Pilih ${a.nama}`}
                  disabled={ada}
                  onClick={() => toggle(a.id)}
                  className={cn('flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg disabled:opacity-50', (ada || bayar) && 'bg-bg')}
                >
                  {aktif ? <CheckSquare className="size-7 shrink-0 text-primary" /> : <Square className="size-7 shrink-0 text-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {a.nama}
                      {a.nomor && <span className="angka ml-2 text-ket text-muted">{a.nomor}</span>}
                    </span>
                    {ada && <span className="text-ket text-muted">Sudah ada di setoran ini</span>}
                    {!ada && bayar && (
                      <span className="text-ket text-warning">
                        Sudah bayar {labelSudahBayar} · {bayar}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button ukuran="aksi" className="sm:flex-1" disabled={dipilih.size === 0} onClick={() => onTambah([...dipilih])}>
            Tambahkan {dipilih.size > 0 ? `${dipilih.size} anggota` : 'anggota'}
          </Button>
          <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={onTutup}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
