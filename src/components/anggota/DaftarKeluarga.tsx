'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, UserRoundPlus } from 'lucide-react'
import { toast } from 'sonner'
import { hapusKeluarga, pecahKeluarga, tambahKeluarga, ubahKeluarga } from '@/server/actions/anggota'
import type { BarisKeluarga } from '@/server/queries/anggota'
import { HUBUNGAN, jenisKelaminDariHubungan, LABEL_JENIS_KELAMIN, type JenisKelamin } from '@/lib/validasi'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { cn } from '@/lib/utils'
import { PilihJenisKelamin } from './PilihJenisKelamin'

type Form = { nama: string; hubungan: (typeof HUBUNGAN)[number] | null; jenisKelamin: JenisKelamin | null; tanggalLahir: string; status: 'aktif' | 'meninggal'; tanggalMeninggal: string; keterangan: string }
const kosong: Form = { nama: '', hubungan: null, jenisKelamin: null, tanggalLahir: '', status: 'aktif', tanggalMeninggal: '', keterangan: '' }

export function DaftarKeluarga({ anggota, aktif, pecah }: { anggota: { id: number; nama: string }; aktif: BarisKeluarga[]; pecah: BarisKeluarga[] }) {
  const router = useRouter()
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number } | null>(null)
  const [form, setForm] = React.useState<Form>(kosong)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [hapus, setHapus] = React.useState<BarisKeluarga | null>(null)
  const [pecahKe, setPecahKe] = React.useState<BarisKeluarga | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function bukaTambah() {
    setForm(kosong)
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(k: BarisKeluarga) {
    setForm({ nama: k.nama, hubungan: k.hubungan, jenisKelamin: k.jenisKelamin, tanggalLahir: k.tanggalLahir ?? '', status: k.status, tanggalMeninggal: k.tanggalMeninggal ?? '', keterangan: k.keterangan ?? '' })
    setGalat(null)
    setPanel({ mode: 'ubah', id: k.id })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = {
        nama: form.nama,
        hubungan: form.hubungan as (typeof HUBUNGAN)[number],
        jenisKelamin: jenisKelaminDariHubungan(form.hubungan) ?? form.jenisKelamin,
        tanggalLahir: form.tanggalLahir || null,
        status: form.status,
        tanggalMeninggal: form.status === 'meninggal' ? form.tanggalMeninggal || null : null,
        keterangan: form.keterangan || null,
      }
      const hasil = panel.mode === 'tambah' ? await tambahKeluarga(anggota.id, input) : await ubahKeluarga(panel.id, input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(panel.mode === 'tambah' ? `${hasil.data.nama} ditambahkan sebagai tanggungan.` : 'Perubahan tersimpan.')
      setPanel(null)
      router.refresh()
    })
  }

  function hapusSekarang() {
    if (!hapus) return
    mulai(async () => {
      const hasil = await hapusKeluarga(hapus.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`${hapus.nama} dihapus dari daftar tanggungan.`)
      setHapus(null)
      router.refresh()
    })
  }

  function pecahSekarang() {
    if (!pecahKe) return
    mulai(async () => {
      const hasil = await pecahKeluarga(pecahKe.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`${hasil.data.nama} kini anggota sendiri. Catat uang pangkalnya bila sudah dibayar.`)
      setPecahKe(null)
      // Pengarahan, bukan pencatatan otomatis (Spec 2 §C2)
      router.push(`/catatan/baru?jenis=masuk&tipe=PM11&anggota=${hasil.data.id}`)
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={bukaTambah}>
          <Plus /> Tambah Tanggungan
        </Button>
      </div>

      {aktif.length === 0 ? (
        <KeadaanKosong judul="Belum ada tanggungan" kalimat="Istri, suami, anak, atau orang tua yang ditanggung anggota ini. Dipakai saat mencatat santunan duka." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {aktif.map((k) => (
            <li key={k.id} className="flex flex-col gap-2 rounded-kartu border border-border bg-surface p-4 shadow-kartu">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-judul-kartu font-semibold">{k.nama}</p>
                  <p className="text-isi text-muted">
                    {k.hubungan}
                    {k.jenisKelamin && ` · ${LABEL_JENIS_KELAMIN[k.jenisKelamin]}`}
                    {k.tanggalLahir && ` · lahir ${formatTanggal(k.tanggalLahir)}`}
                  </p>
                  {k.keterangan && <p className="text-ket text-muted">{k.keterangan}</p>}
                </div>
                <span className={cn('shrink-0 rounded-badge px-3 py-0.5 text-ket font-semibold', k.status === 'meninggal' ? 'bg-keluar-soft text-keluar' : 'bg-masuk-soft text-masuk')}>
                  {k.status === 'meninggal' ? 'Meninggal' : 'Hidup'}
                </span>
              </div>
              {k.status === 'meninggal' && (
                <p className="text-ket text-muted">
                  {k.tanggalMeninggal && `Meninggal ${formatTanggal(k.tanggalMeninggal)}`}
                  {k.ditandaiOlehTransaksiId && ' · dari catatan santunan'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="sekunder" onClick={() => bukaUbah(k)}>
                  <Pencil /> Ubah
                </Button>
                {k.status === 'aktif' && (
                  <Button variant="sekunder" onClick={() => setPecahKe(k)}>
                    <UserRoundPlus /> Jadikan Anggota Sendiri
                  </Button>
                )}
                <Button variant="halus" className="text-keluar" onClick={() => setHapus(k)}>
                  <Trash2 /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pecah.length > 0 && (
        <section className="mt-2">
          <h2 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted">Sudah jadi anggota sendiri</h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pecah.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 rounded-kartu border border-border bg-surface p-4 opacity-70">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{k.nama}</p>
                  <p className="text-ket text-muted">{k.hubungan}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-badge bg-primary-soft px-3 py-0.5 text-ket font-semibold text-primary">Sudah jadi anggota sendiri</span>
                  {k.pindahKeAnggotaId && (
                    <Link href={`/anggota/${k.pindahKeAnggotaId}/keluarga`} className="text-ket font-semibold text-primary underline-offset-4 hover:underline">
                      Lihat {k.namaPindah ?? 'anggota'}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah Tanggungan' : 'Tambah Tanggungan'}>
          <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama-keluarga">Nama</Label>
              <Input id="nama-keluarga" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus maxLength={100} aria-invalid={galat?.field === 'nama'} />
              {galatField('nama')}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hubungan">Hubungan dengan {anggota.nama}</Label>
              <PilihanCari
                id="hubungan"
                nilai={form.hubungan}
                onUbah={(v) => setForm({ ...form, hubungan: v, jenisKelamin: jenisKelaminDariHubungan(v) ?? form.jenisKelamin })}
                pilihan={HUBUNGAN.map((h) => ({ nilai: h, label: h }))}
                placeholder="Pilih hubungan…"
                galat={galat?.field === 'hubungan'}
              />
              {galatField('hubungan')}
            </div>
            <PilihJenisKelamin nilai={form.jenisKelamin} hubungan={form.hubungan} onUbah={(v) => setForm({ ...form, jenisKelamin: v })} />
            {galatField('jenisKelamin')}
            <div className="flex flex-col gap-2">
              <Label htmlFor="tanggal-lahir">Tanggal lahir <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <PilihTanggal id="tanggal-lahir" nilai={form.tanggalLahir} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalLahir: v })} galat={galat?.field === 'tanggalLahir'} />
              {galatField('tanggalLahir')}
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
              {galatField('status')}
              {form.status === 'meninggal' && (
                <div className="mt-2 flex flex-col gap-2">
                  <Label htmlFor="tanggal-meninggal-k">Tanggal meninggal</Label>
                  <PilihTanggal id="tanggal-meninggal-k" nilai={form.tanggalMeninggal} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalMeninggal: v })} galat={galat?.field === 'tanggalMeninggal'} />
                  {galatField('tanggalMeninggal')}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ket-keluarga">Keterangan <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="ket-keluarga" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} maxLength={255} />
              {galatField('keterangan')}
            </div>
            {galat && !['nama', 'hubungan', 'jenisKelamin', 'tanggalLahir', 'status', 'tanggalMeninggal', 'keterangan'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus tanggungan ini?">
          <p className="text-judul-kartu font-semibold">{hapus?.nama}</p>
          <DialogDescription className="text-isi text-muted">{hapus?.hubungan} dari {anggota.nama}. Catatan santunan yang pernah menyebut namanya tetap tersimpan.</DialogDescription>
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

      <Dialog open={pecahKe !== null} onOpenChange={(o) => !o && setPecahKe(null)}>
        <DialogContent judul={`Jadikan ${pecahKe?.nama ?? ''} anggota sendiri?`}>
          <p className="text-isi">
            {pecahKe?.hubungan} dari {anggota.nama}
          </p>
          <DialogDescription className="text-isi text-muted">
            Ia akan punya iuran dan tanggungan sendiri, dan tidak lagi ditanggung keluarga {anggota.nama}. Setelah ini Anda diarahkan ke form catat uang pangkal pecah (bila memang sudah dibayar).
          </DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button ukuran="aksi" className="sm:flex-1" onClick={pecahSekarang} disabled={sedangKirim}>
              {sedangKirim ? 'Memproses…' : 'Ya, Jadikan Anggota'}
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setPecahKe(null)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
