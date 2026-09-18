'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Phone, Plus, Search, Trash2, UserRoundCheck, UserRoundX } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifAnggota, hapusAnggota, tambahAnggota, ubahAnggota } from '@/server/actions/anggota'
import type { BarisAnggota } from '@/server/queries/anggota'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { cn } from '@/lib/utils'

type Form = { nama: string; noHp: string; alamat: string }
const kosong: Form = { nama: '', noHp: '', alamat: '' }

export function DaftarAnggota({ baris }: { baris: BarisAnggota[] }) {
  const router = useRouter()
  const [cari, setCari] = React.useState('')
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number } | null>(null)
  const [form, setForm] = React.useState<Form>(kosong)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [hapus, setHapus] = React.useState<BarisAnggota | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  const tampil = baris.filter((a) => !cari.trim() || a.nama.toLowerCase().includes(cari.trim().toLowerCase()))

  function bukaTambah() {
    setForm(kosong)
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(a: BarisAnggota) {
    setForm({ nama: a.nama, noHp: a.noHp ?? '', alamat: a.alamat ?? '' })
    setGalat(null)
    setPanel({ mode: 'ubah', id: a.id })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = { nama: form.nama, noHp: form.noHp || null, alamat: form.alamat || null }
      const hasil = panel.mode === 'tambah' ? await tambahAnggota(input) : await ubahAnggota(panel.id, input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(panel.mode === 'tambah' ? `${hasil.data.nama} ditambahkan.` : 'Perubahan tersimpan.')
      setPanel(null)
      router.refresh()
    })
  }

  function aturAktif(a: BarisAnggota) {
    mulai(async () => {
      const hasil = await aturAktifAnggota(a.id, !a.aktif)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(a.aktif ? `${a.nama} dinonaktifkan.` : `${a.nama} diaktifkan lagi.`)
      router.refresh()
    })
  }

  function hapusSekarang() {
    if (!hapus) return
    mulai(async () => {
      const hasil = await hapusAnggota(hapus.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        setHapus(null)
        return
      }
      toast.success(`${hapus.nama} dihapus.`)
      setHapus(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input aria-label="Cari anggota" placeholder="Cari nama anggota…" className="pl-12" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <Button ukuran="biasa" onClick={bukaTambah}>
          <Plus /> Tambah Anggota
        </Button>
      </div>

      {tampil.length === 0 ? (
        baris.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <KeadaanKosong judul="Belum ada anggota" kalimat="Daftar anggota memudahkan mencatat iuran. Anda juga bisa mengetik nama bebas saat mencatat." />
            <Button ukuran="aksi" onClick={bukaTambah}>
              <Plus /> Tambah Anggota Pertama
            </Button>
          </div>
        ) : (
          <p className="text-isi text-muted">Tidak ada anggota bernama “{cari}”.</p>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tampil.map((a) => (
            <li key={a.id} className={cn('flex flex-col gap-2 rounded-kartu border border-border bg-surface p-4 shadow-kartu', !a.aktif && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-judul-kartu font-semibold">{a.nama}</p>
                  {a.noHp && (
                    <p className="angka flex items-center gap-1.5 text-isi text-muted">
                      <Phone className="size-4" /> {a.noHp}
                    </p>
                  )}
                  {a.alamat && <p className="truncate text-ket text-muted">{a.alamat}</p>}
                </div>
                {!a.aktif && <span className="shrink-0 rounded-badge bg-border px-3 py-0.5 text-ket font-semibold text-muted">Nonaktif</span>}
              </div>
              <p className="text-isi">
                Total iuran: <span className="angka font-bold text-masuk">{formatRupiah(a.totalIuran)}</span>
                <span className="text-ket text-muted"> · {a.jumlahCatatan} catatan</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="sekunder" onClick={() => bukaUbah(a)}>
                  <Pencil /> Ubah
                </Button>
                <Button variant="halus" onClick={() => aturAktif(a)} disabled={sedangKirim}>
                  {a.aktif ? <UserRoundX /> : <UserRoundCheck />} {a.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                {a.jumlahCatatan === 0 && (
                  <Button variant="halus" className="text-keluar" onClick={() => setHapus(a)}>
                    <Trash2 /> Hapus
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah Anggota' : 'Tambah Anggota'}>
          <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama-anggota">Nama</Label>
              <Input id="nama-anggota" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus maxLength={120} aria-invalid={galat?.field === 'nama'} />
              {galat?.field === 'nama' && <PesanGalat>{galat.pesan}</PesanGalat>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hp-anggota">Nomor HP <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="hp-anggota" inputMode="tel" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} maxLength={30} className="angka" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alamat-anggota">Alamat <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="alamat-anggota" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} maxLength={255} />
            </div>
            {galat && galat.field !== 'nama' && <PesanGalat>{galat.pesan}</PesanGalat>}
            <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus anggota ini?">
          <p className="text-judul-kartu font-semibold">{hapus?.nama}</p>
          <DialogDescription className="text-isi text-muted">Anggota ini belum pernah dipakai di catatan, jadi bisa dihapus permanen.</DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="keluar" ukuran="aksi" className="sm:flex-1" onClick={hapusSekarang} disabled={sedangKirim}>
              Ya, Hapus
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setHapus(null)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
