'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Image as ImageIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { kalimatMeninggal } from '@/lib/catatan'
import { formatRupiah } from '@/lib/rupiah'
import { formatJam, formatTanggalPendek, formatWaktu, keISO } from '@/lib/tanggal'
import { URUT_BAWAAN, type UrutCatatan } from '@/lib/urut-catatan'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DialogHapus } from './DialogHapus'
import { KartuCatatan } from './KartuCatatan'
import { cn } from '@/lib/utils'

/**
 * Daftar catatan berbentuk tabel (≥ md) dengan urutan yang bisa diganti lewat kepala kolom
 * (Tanggal / Dicatat), halaman, dan subtotal halaman. Di layar sempit tetap kartu.
 * Bawaan: yang terakhir dicatat di atas — sesuai urutan buku manual bendahara.
 */
export function TabelCatatan({ baris, urut = URUT_BAWAAN, total, halaman, perHalaman }: { baris: BarisCatatan[]; urut?: UrutCatatan; total: number; halaman: number; perHalaman: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [hapus, setHapus] = React.useState<BarisCatatan | null>(null)
  const [bukti, setBukti] = React.useState<BarisCatatan | null>(null)

  const [kolomUrut, arahUrut] = urut.split('-') as ['dibuat' | 'tanggal', 'asc' | 'desc']
  const totalHalaman = Math.max(1, Math.ceil(total / perHalaman))

  function tautan(perubahan: Record<string, string | undefined>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(perubahan)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    return `${pathname}?${p.toString()}`
  }
  function gantiUrut(kolom: 'dibuat' | 'tanggal') {
    // Klik kolom yang sama membalik arah; kolom lain mulai dari terbaru dulu
    const arah = kolomUrut === kolom && arahUrut === 'desc' ? 'asc' : 'desc'
    router.replace(tautan({ urut: `${kolom}-${arah}`, hal: undefined }), { scroll: false })
  }

  const masukHalaman = baris.reduce((s, b) => s + (b.arah === 'masuk' ? b.jumlah : 0), 0)
  const keluarHalaman = baris.reduce((s, b) => s + (b.arah === 'keluar' ? b.jumlah : 0), 0)
  const dari = (halaman - 1) * perHalaman + 1
  const sampai = Math.min(total, halaman * perHalaman)

  // Fungsi penolong render, bukan komponen (docs/04: komponen di dalam render dibuat ulang tiap render)
  const kepalaUrut = (kolom: 'dibuat' | 'tanggal', label: string) => {
    const aktif = kolomUrut === kolom
    return (
      <button
        type="button"
        onClick={() => gantiUrut(kolom)}
        className={cn('inline-flex items-center gap-1 rounded-input px-1 py-0.5 uppercase tracking-wide transition-colors hover:text-text', aktif ? 'text-primary' : 'text-muted')}
        aria-pressed={aktif}
        title={aktif ? (arahUrut === 'desc' ? 'Terbaru dulu — klik untuk terlama dulu' : 'Terlama dulu — klik untuk terbaru dulu') : `Urutkan menurut ${label.toLowerCase()}`}
      >
        {label}
        {aktif ? arahUrut === 'desc' ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" /> : <ArrowUpDown className="size-4 opacity-50" />}
      </button>
    )
  }

  return (
    <>
      {/* Tabel di layar lebar */}
      <div className="hidden overflow-hidden rounded-kartu border border-border bg-surface shadow-kartu md:block">
        <table className="w-full text-isi">
          <thead className="bg-bg text-left text-ket font-semibold text-muted">
            <tr>
              <th className="px-3 py-3" aria-sort={kolomUrut === 'tanggal' ? (arahUrut === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {kepalaUrut('tanggal', 'Tanggal')}
              </th>
              <th className="px-3 py-3 uppercase tracking-wide">No. Bukti</th>
              <th className="px-3 py-3 uppercase tracking-wide">Keterangan</th>
              <th className="px-3 py-3 uppercase tracking-wide">Dari / Untuk</th>
              <th className="px-3 py-3 text-right uppercase tracking-wide">Masuk</th>
              <th className="px-3 py-3 text-right uppercase tracking-wide">Keluar</th>
              <th className="px-3 py-3" aria-sort={kolomUrut === 'dibuat' ? (arahUrut === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {kepalaUrut('dibuat', 'Dicatat')}
              </th>
              <th className="px-2 py-3">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {baris.map((c) => {
              const masuk = c.arah === 'masuk'
              const meninggal = kalimatMeninggal(c)
              return (
                <tr key={c.id} className="align-top hover:bg-bg">
                  <td className="angka whitespace-nowrap px-3 py-3">
                    <span className="font-semibold">{formatTanggalPendek(c.tanggal)}</span>
                    <span className="block text-ket text-muted">{c.metode === 'tunai' ? 'Tunai' : 'Transfer'}</span>
                  </td>
                  <td className="angka whitespace-nowrap px-3 py-3 text-muted">
                    <Link href={`/catatan/${c.id}/ubah`} className="hover:text-primary hover:underline">
                      {c.noBukti}
                    </Link>
                    {c.buktiFile && (
                      <button type="button" onClick={() => setBukti(c)} className="ml-1 inline-flex align-middle text-primary" aria-label={`Lihat foto bukti ${c.noBukti}`} title="Ada foto bukti">
                        <ImageIcon className="size-4" />
                      </button>
                    )}
                  </td>
                  <td className="max-w-md px-3 py-3">
                    <span className={cn('mr-2 inline-block rounded-badge px-2 py-0.5 text-ket font-semibold', masuk ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')}>{c.namaJenis}</span>
                    <span className="block text-isi">{c.keterangan}</span>
                    {meninggal && <span className="block text-ket font-medium text-keluar">Meninggal: {meninggal}</span>}
                  </td>
                  <td className="max-w-[14rem] px-3 py-3">
                    {c.namaPihak ? (
                      c.anggotaId ? (
                        <Link href={`/anggota/${c.anggotaId}`} className="block truncate font-semibold hover:text-primary hover:underline">
                          {c.namaPihak}
                        </Link>
                      ) : (
                        <span className="block truncate font-semibold">{c.namaPihak}</span>
                      )
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                    {(c.namaPenyetor || c.nomorSetoran) && (
                      <span className="block truncate text-ket text-muted">
                        {c.namaPenyetor && `${masuk ? 'via' : 'oleh'} ${c.namaPenyetor}`}
                        {c.nomorSetoran && c.setoranId && (
                          <>
                            {c.namaPenyetor && ' · '}
                            <Link href={`/catatan/setoran/${c.setoranId}`} className="angka font-medium text-primary hover:underline">
                              {c.nomorSetoran}
                            </Link>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="angka whitespace-nowrap px-3 py-3 text-right font-semibold text-masuk">{masuk ? formatRupiah(c.jumlah) : ''}</td>
                  <td className="angka whitespace-nowrap px-3 py-3 text-right font-semibold text-keluar">{!masuk ? formatRupiah(c.jumlah) : ''}</td>
                  <td className="angka whitespace-nowrap px-3 py-3 text-ket text-muted" title={formatWaktu(c.dibuatPada)}>
                    {formatTanggalPendek(keISO(new Date(c.dibuatPada)))}
                    <span className="block">{formatJam(c.dibuatPada)}</span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="flex size-sentuh items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label={`Menu catatan ${c.noBukti}`}>
                          <MoreVertical className="size-6" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/catatan/${c.id}/ubah`}>
                            <Pencil /> Ubah
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!c.buktiFile} onSelect={() => setBukti(c)}>
                          <ImageIcon /> Lihat Bukti
                        </DropdownMenuItem>
                        <DropdownMenuItem bahaya onSelect={() => setHapus(c)}>
                          <Trash2 /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-bg text-isi font-semibold">
            <tr>
              <td colSpan={4} className="px-3 py-3 text-muted">
                Jumlah di halaman ini ({baris.length} catatan)
              </td>
              <td className="angka whitespace-nowrap px-3 py-3 text-right text-masuk">{formatRupiah(masukHalaman)}</td>
              <td className="angka whitespace-nowrap px-3 py-3 text-right text-keluar">{formatRupiah(keluarHalaman)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Kartu di layar sempit */}
      <ul className="flex flex-col gap-3 md:hidden">
        {baris.map((c) => (
          <li key={c.id}>
            <KartuCatatan catatan={c} onHapus={setHapus} onLihatBukti={setBukti} />
          </li>
        ))}
      </ul>

      {(totalHalaman > 1 || total > 0) && (
        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Halaman">
          <span className="text-ket text-muted">
            Menampilkan {dari}–{sampai} dari {total} catatan
          </span>
          {totalHalaman > 1 && (
            <span className="flex items-center gap-2">
              <Button asChild variant="sekunder" className={cn(halaman <= 1 && 'pointer-events-none opacity-50')}>
                <Link href={tautan({ hal: String(halaman - 1) })} scroll={false}>
                  Sebelumnya
                </Link>
              </Button>
              <span className="text-isi text-muted">
                Hal. {halaman} / {totalHalaman}
              </span>
              <Button asChild variant="sekunder" className={cn(halaman >= totalHalaman && 'pointer-events-none opacity-50')}>
                <Link href={tautan({ hal: String(halaman + 1) })} scroll={false}>
                  Berikutnya
                </Link>
              </Button>
            </span>
          )}
        </nav>
      )}

      <DialogHapus catatan={hapus} terbuka={hapus !== null} onTutup={() => setHapus(null)} />
      <Dialog open={bukti !== null} onOpenChange={(o) => !o && setBukti(null)}>
        <DialogContent judul={bukti ? `Bukti ${bukti.noBukti}` : 'Bukti'} className="max-w-2xl">
          {bukti?.buktiFile && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/bukti/${bukti.buktiFile}`} alt={`Foto bukti ${bukti.noBukti}`} className="max-h-[70vh] w-full rounded-input object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
