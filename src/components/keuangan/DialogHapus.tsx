'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { hapusCatatan } from '@/server/actions/transaksi'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Dialog hapus yang menyebutkan isi catatannya (docs/01 P6). */
export function DialogHapus({
  catatan,
  terbuka,
  onTutup,
}: {
  catatan: BarisCatatan | null
  terbuka: boolean
  onTutup: () => void
}) {
  const router = useRouter()
  const [sedangKirim, mulai] = React.useTransition()

  function hapus() {
    if (!catatan) return
    mulai(async () => {
      const hasil = await hapusCatatan(catatan.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`Catatan ${catatan.noBukti} dihapus. Bisa dikembalikan lewat Riwayat.`)
      onTutup()
      router.refresh()
    })
  }

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent judul="Hapus catatan ini?">
        {catatan && (
          <div className="rounded-input border border-border bg-bg px-4 py-3">
            <p className={cn('font-semibold', catatan.arah === 'masuk' ? 'text-masuk' : 'text-keluar')}>
              {catatan.arah === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'} · {catatan.namaJenis}
            </p>
            <p className="mt-1">
              {formatTanggal(catatan.tanggal)} · <span className="angka font-bold">{formatRupiah(catatan.jumlah)}</span>
            </p>
            {catatan.namaPihak && <p className="text-muted">{catatan.namaPihak}</p>}
            <p className="mt-1 text-ket text-muted">{catatan.keterangan} · {catatan.noBukti}</p>
          </div>
        )}
        <DialogDescription className="text-isi text-muted">
          Catatan yang dihapus tetap tersimpan di Riwayat dan bisa dikembalikan.
        </DialogDescription>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="keluar" ukuran="aksi" className="sm:flex-1" onClick={hapus} disabled={sedangKirim}>
            {sedangKirim ? 'Menghapus…' : 'Ya, Hapus'}
          </Button>
          <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={onTutup} disabled={sedangKirim}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
