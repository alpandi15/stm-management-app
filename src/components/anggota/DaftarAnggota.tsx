'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, Pencil, Phone, Plus, Search, Trash2, UserRoundCheck, UserRoundX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifAnggota, hapusAnggota, tambahAnggota, ubahAnggota } from '@/server/actions/anggota'
import type { BarisAnggota } from '@/server/queries/anggota'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { PetaPinDinamis } from './PetaPinDinamis'
import { cn } from '@/lib/utils'

type Form = { nomor: string; nama: string; noHp: string; alamat: string; lat: number | null; lng: number | null; status: 'aktif' | 'meninggal'; tanggalMeninggal: string }

export function DaftarAnggota({ baris, saranNomor }: { baris: BarisAnggota[]; saranNomor: string }) {
  const router = useRouter()
  const [cari, setCari] = React.useState('')
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number } | null>(null)
  const [form, setForm] = React.useState<Form>({ nomor: '', nama: '', noHp: '', alamat: '', lat: null, lng: null, status: 'aktif', tanggalMeninggal: '' })
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [hapus, setHapus] = React.useState<BarisAnggota | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  const tampil = baris.filter((a) => !cari.trim() || `${a.nama} ${a.nomor ?? ''}`.toLowerCase().includes(cari.trim().toLowerCase()))

  function bukaTambah() {
    setForm({ nomor: saranNomor, nama: '', noHp: '', alamat: '', lat: null, lng: null, status: 'aktif', tanggalMeninggal: '' })
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(a: BarisAnggota) {
    setForm({ nomor: a.nomor ?? '', nama: a.nama, noHp: a.noHp ?? '', alamat: a.alamat ?? '', lat: a.lat, lng: a.lng, status: a.status, tanggalMeninggal: a.tanggalMeninggal ?? '' })
    setGalat(null)
    setPanel({ mode: 'ubah', id: a.id })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = {
        nomor: form.nomor || null,
        nama: form.nama,
        noHp: form.noHp || null,
        alamat: form.alamat || null,
        lat: form.lat,
        lng: form.lng,
        status: form.status,
        tanggalMeninggal: form.status === 'meninggal' ? form.tanggalMeninggal || null : null,
      }
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

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input aria-label="Cari anggota" placeholder="Cari nama atau nomor anggota…" className="pl-12" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <Button onClick={bukaTambah}>
          <Plus /> Tambah Anggota
        </Button>
      </div>

      {tampil.length === 0 ? (
        baris.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <KeadaanKosong judul="Belum ada anggota" kalimat="Daftar anggota memudahkan mencatat iuran dan santunan. Anda juga bisa mengetik nama bebas saat mencatat." />
            <Button ukuran="aksi" onClick={bukaTambah}>
              <Plus /> Tambah Anggota Pertama
            </Button>
          </div>
        ) : (
          <p className="text-isi text-muted">Tidak ada anggota yang cocok dengan “{cari}”.</p>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tampil.map((a) => (
            <li key={a.id} className={cn('flex flex-col gap-2 rounded-kartu border border-border bg-surface p-4 shadow-kartu', !a.aktif && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.nomor && <p className="angka text-ket font-semibold text-muted">{a.nomor}</p>}
                  <p className="truncate text-judul-kartu font-semibold">{a.nama}</p>
                  {a.noHp && (
                    <p className="angka flex items-center gap-1.5 text-isi text-muted">
                      <Phone className="size-4" /> {a.noHp}
                    </p>
                  )}
                  {a.alamat && <p className="line-clamp-2 text-ket text-muted">{a.alamat}</p>}
                  {a.namaAsal && <p className="text-ket text-muted">Pecah dari keluarga {a.namaAsal}{a.tanggalBergabung && `, bergabung ${formatTanggal(a.tanggalBergabung)}`}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!a.aktif && <span className="rounded-badge bg-border px-3 py-0.5 text-ket font-semibold text-muted">Nonaktif</span>}
                  {a.status === 'meninggal' && <span className="rounded-badge bg-keluar-soft px-3 py-0.5 text-ket font-semibold text-keluar">Meninggal</span>}
                  {a.anggotaAsalId && <span className="rounded-badge bg-primary-soft px-3 py-0.5 text-ket font-semibold text-primary">Pecah KK</span>}
                </div>
              </div>
              {a.status === 'meninggal' && a.tanggalMeninggal && (
                <p className="text-ket text-muted">
                  Meninggal {formatTanggal(a.tanggalMeninggal)}
                  {a.ditandaiOlehTransaksiId && ' · dari catatan santunan'}
                </p>
              )}
              <p className="text-isi">
                Total iuran: <span className="angka font-bold text-masuk">{formatRupiah(a.totalIuran)}</span>
                <span className="text-ket text-muted"> · {a.jumlahCatatan} catatan</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="sekunder">
                  <Link href={`/anggota/${a.id}/keluarga`}>
                    <Users /> Keluarga ({a.jumlahKeluarga})
                  </Link>
                </Button>
                <Button variant="sekunder" onClick={() => bukaUbah(a)}>
                  <Pencil /> Ubah
                </Button>
                {a.lat != null && a.lng != null && (
                  <Button asChild variant="halus">
                    <a href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}`} target="_blank" rel="noreferrer">
                      <ExternalLink /> Peta
                    </a>
                  </Button>
                )}
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
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah Anggota' : 'Tambah Anggota'} className="max-w-lg">
          <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomor-anggota">Nomor anggota</Label>
                <Input id="nomor-anggota" className="angka" value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} maxLength={30} aria-invalid={galat?.field === 'nomor'} />
                {galatField('nomor')}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nama-anggota">Nama</Label>
                <Input id="nama-anggota" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus maxLength={120} aria-invalid={galat?.field === 'nama'} />
                {galatField('nama')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hp-anggota">Nomor HP <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="hp-anggota" inputMode="tel" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} maxLength={30} className="angka" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alamat-anggota">Alamat <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="alamat-anggota" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} maxLength={255} placeholder="Contoh: Jl. Melati No. 12, Blok C" />
              <p className="text-ket text-muted">Titik di peta (boleh kosong) — klik peta atau seret pin. Peta butuh internet.</p>
              {panel && <PetaPinDinamis lat={form.lat} lng={form.lng} onUbah={(t) => setForm((f) => ({ ...f, lat: t?.lat ?? null, lng: t?.lng ?? null }))} />}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <PilihanGanda
                label="Status"
                nilai={form.status}
                onPilih={(v) => setForm({ ...form, status: v })}
                pilihan={[
                  { nilai: 'aktif', label: 'Masih hidup' },
                  { nilai: 'meninggal', label: 'Meninggal dunia' },
                ]}
              />
              {form.status === 'meninggal' && (
                <div className="mt-2 flex flex-col gap-2">
                  <Label htmlFor="tanggal-meninggal">Tanggal meninggal</Label>
                  <PilihTanggal id="tanggal-meninggal" nilai={form.tanggalMeninggal} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalMeninggal: v })} galat={galat?.field === 'tanggalMeninggal'} />
                  {galatField('tanggalMeninggal')}
                  <p className="text-ket text-muted">Status yang diisi di sini bersifat manual dan tidak ikut berubah bila catatan santunan dihapus.</p>
                </div>
              )}
            </div>
            {galat && !['nomor', 'nama', 'tanggalMeninggal'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus anggota ini?">
          <p className="text-judul-kartu font-semibold">{hapus?.nama}</p>
          <DialogDescription className="text-isi text-muted">Anggota ini belum pernah dipakai di catatan, jadi bisa dihapus permanen beserta daftar keluarganya.</DialogDescription>
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
