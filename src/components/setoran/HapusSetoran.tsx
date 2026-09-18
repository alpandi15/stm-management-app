'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { hapusSetoran } from '@/server/actions/setoran'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'

export function HapusSetoran({ id, nomor, jumlahCatatan, total }: { id: number; nomor: string; jumlahCatatan: number; total: number }) {
  const router = useRouter()
  const [terbuka, setTerbuka] = React.useState(false)
  const [sedangKirim, mulai] = React.useTransition()
  function hapus() {
    mulai(async () => {
      const hasil = await hapusSetoran(id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`Setoran ${nomor} dihapus (${hasil.data.jumlahCatatan} catatan). Bisa dikembalikan satu per satu lewat Riwayat.`)
      router.push('/catatan/setoran')
      router.refresh()
    })
  }
  return (
    <>
      <Button variant="bahaya" onClick={() => setTerbuka(true)}>
        <Trash2 /> Hapus Setoran
      </Button>
      <Dialog open={terbuka} onOpenChange={setTerbuka}>
        <DialogContent judul="Hapus seluruh setoran ini?">
          <div className="rounded-input border border-border bg-bg px-4 py-3">
            <p className="angka font-semibold">{nomor}</p>
            <p>
              {jumlahCatatan} catatan · <span className="angka font-bold">{formatRupiah(total)}</span>
            </p>
          </div>
          <DialogDescription className="text-isi text-muted">Semua catatan anggota dalam setoran ini dihapus. Masing-masing tetap tersimpan di Riwayat dan bisa dikembalikan.</DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="keluar" ukuran="aksi" className="sm:flex-1" onClick={hapus} disabled={sedangKirim}>
              {sedangKirim ? 'Menghapus…' : 'Ya, Hapus Semua'}
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setTerbuka(false)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
