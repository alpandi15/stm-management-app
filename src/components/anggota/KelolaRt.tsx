'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { hapusRt, tambahRt, ubahRt } from '@/server/actions/rt'
import type { BarisRt } from '@/server/queries/rt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

type Form = { nama: string; keterangan: string; urutan: string }
const kosong: Form = { nama: '', keterangan: '', urutan: '' }

/** Kelola data RT: daftar dengan jumlah anggota, tambah/ubah lewat panel, hapus bila tidak dipakai. */
export function KelolaRt({ daftar, tanpaRt }: { daftar: BarisRt[]; tanpaRt: number }) {
  const router = useRouter()
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number } | null>(null)
  const [form, setForm] = React.useState<Form>(kosong)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [hapus, setHapus] = React.useState<BarisRt | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function bukaTambah() {
    // Saran nama berikutnya: RT 01, RT 02, … mengikuti pola yang sudah ada
    const angka = daftar.map((r) => Number(r.nama.match(/(\d+)/)?.[1] ?? 0))
    const berikut = (angka.length ? Math.max(...angka) : 0) + 1
    setForm({ ...kosong, nama: `RT ${String(berikut).padStart(2, '0')}`, urutan: String(daftar.length + 1) })
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(r: BarisRt) {
    setForm({ nama: r.nama, keterangan: r.keterangan ?? '', urutan: r.urutan ? String(r.urutan) : '' })
    setGalat(null)
    setPanel({ mode: 'ubah', id: r.id })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = { nama: form.nama, keterangan: form.keterangan || null, urutan: form.urutan ? Number(form.urutan) : 0 }
      const hasil = panel.mode === 'tambah' ? await tambahRt(input) : await ubahRt(panel.id, input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(panel.mode === 'tambah' ? `${hasil.data.nama} ditambahkan.` : 'Perubahan tersimpan.')
      setPanel(null)
      router.refresh()
    })
  }

  function hapusSekarang() {
    if (!hapus) return
    mulai(async () => {
      const hasil = await hapusRt(hapus.id)
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

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-isi text-muted">
          {daftar.length === 0 ? 'Belum ada RT.' : `${daftar.length} RT`}
          {tanpaRt > 0 && (
            <>
              {' · '}
              <Link href="/anggota?rt=tanpa" className="font-semibold text-primary underline-offset-4 hover:underline">
                {tanpaRt} anggota belum punya RT
              </Link>
            </>
          )}
        </p>
        <Button ukuran="aksi" onClick={bukaTambah}>
          <Plus /> Tambah RT
        </Button>
      </div>

      {daftar.length === 0 ? (
        <KeadaanKosong judul="Belum ada RT" kalimat="Buat daftar RT lebih dulu, lalu pilih RT-nya saat menambah atau mengubah anggota. Daftar anggota bisa disaring per RT — berguna untuk pengutip." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-kartu border border-border bg-surface shadow-kartu">
          {daftar.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block text-judul-kartu font-semibold">{r.nama}</span>
                {r.keterangan && <span className="block truncate text-ket text-muted">{r.keterangan}</span>}
              </span>
              <Button asChild variant="halus">
                <Link href={`/anggota?rt=${r.id}`}>
                  <Users /> {r.jumlahAnggota} anggota{r.jumlahAnggota !== r.jumlahAktif && ` (${r.jumlahAktif} aktif)`}
                </Link>
              </Button>
              <span className="flex gap-1">
                <Button variant="sekunder" onClick={() => bukaUbah(r)}>
                  <Pencil /> Ubah
                </Button>
                <Button variant="halus" ukuran="ikon" className="text-keluar" aria-label={`Hapus ${r.nama}`} onClick={() => setHapus(r)} disabled={r.jumlahAnggota > 0} title={r.jumlahAnggota > 0 ? 'Masih dipakai anggota' : undefined}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah RT' : 'Tambah RT'}>
          <form onSubmit={simpan} className="flex flex-1 flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama-rt">Nama RT</Label>
              <Input id="nama-rt" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} maxLength={60} placeholder="Contoh: RT 03" aria-invalid={galat?.field === 'nama'} autoFocus />
              {galatField('nama')}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ket-rt">
                Keterangan <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <Input id="ket-rt" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} maxLength={255} placeholder="Contoh: Ketua RT Bpk. Surya, Jl. Melati" />
              {galatField('keterangan')}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="urutan-rt">
                Urutan tampil <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <Input id="urutan-rt" inputMode="numeric" className="angka w-32" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value.replace(/\D/g, '') })} aria-invalid={galat?.field === 'urutan'} />
              {galatField('urutan')}
            </div>
            {galat && !['nama', 'keterangan', 'urutan'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex gap-3 border-t-2 border-border bg-surface px-6 py-3">
              <Button type="button" variant="sekunder" ukuran="aksi" className="flex-1" onClick={() => setPanel(null)} disabled={sedangKirim}>
                Batal
              </Button>
              <Button type="submit" ukuran="aksi" className="flex-[2]" disabled={sedangKirim}>
                {sedangKirim ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus RT ini?">
          <p className="text-judul-kartu font-semibold">{hapus?.nama}</p>
          <DialogDescription className="text-isi text-muted">RT yang tidak dipakai anggota mana pun boleh dihapus.</DialogDescription>
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
