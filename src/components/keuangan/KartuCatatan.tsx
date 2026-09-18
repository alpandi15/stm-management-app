'use client'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Image as ImageIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalPendek } from '@/lib/tanggal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/** Kartu per baris (docs/01 §5.4): terbaca di 360px tanpa geser samping. */
export function KartuCatatan({
  catatan,
  onHapus,
  onLihatBukti,
}: {
  catatan: BarisCatatan
  onHapus: (c: BarisCatatan) => void
  onLihatBukti: (c: BarisCatatan) => void
}) {
  const masuk = catatan.arah === 'masuk'
  return (
    <article className="flex items-start gap-2 rounded-kartu border border-border bg-surface p-3 shadow-kartu sm:gap-3 sm:p-4">
      <span
        className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-badge', masuk ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')}
        aria-hidden
      >
        {masuk ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <p className="line-clamp-2 font-semibold leading-tight">{catatan.namaJenis}</p>
          <p className={cn('angka shrink-0 text-judul-kartu font-bold sm:text-isi', masuk ? 'text-masuk' : 'text-keluar')}>
            {masuk ? '+ ' : '− '}
            {formatRupiah(catatan.jumlah)}
          </p>
        </div>
        <p className="line-clamp-2 text-isi text-muted">
          {catatan.keterangan}
          {catatan.namaPihak && ` · ${catatan.namaPihak}`}
        </p>
        <p className="angka mt-1 text-ket text-muted">
          {formatTanggalPendek(catatan.tanggal)} · {catatan.metode === 'tunai' ? 'Tunai' : 'Transfer'} · {catatan.noBukti}
          {catatan.buktiFile && ' · ada foto'}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="-mr-2 flex size-sentuh shrink-0 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label={`Menu catatan ${catatan.noBukti}`}>
            <MoreVertical className="size-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/catatan/${catatan.id}/ubah`}>
              <Pencil /> Ubah
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!catatan.buktiFile} onSelect={() => onLihatBukti(catatan)}>
            <ImageIcon /> Lihat Bukti
          </DropdownMenuItem>
          <DropdownMenuItem bahaya onSelect={() => onHapus(catatan)}>
            <Trash2 /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )
}
