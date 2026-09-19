'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifJenis, hapusJenis, tambahJenis, ubahJenis } from '@/server/actions/jenis'
import type { BarisJenis } from '@/server/queries/jenis'
import type { PeriodeJenis } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihanModal } from '@/components/ui/pilihan-modal'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { InputRupiah } from '@/components/keuangan/InputRupiah'
import { cn } from '@/lib/utils'

export const LABEL_PERIODE: Record<PeriodeJenis, string> = { bebas: 'Bebas', sekali: 'Sekali', bulanan: 'Bulanan', tahunan: 'Tahunan' }

type Form = { nama: string; arah: 'masuk' | 'keluar'; keterangan: string; nominalBawaan: number | null; nominalDikunci: boolean; periode: PeriodeJenis; menandaiMeninggal: boolean }
const kosong: Form = { nama: '', arah: 'masuk', keterangan: '', nominalBawaan: null, nominalDikunci: false, periode: 'bebas', menandaiMeninggal: false }

export function KartuJenis({ daftar }: { daftar: BarisJenis[] }) {
  const router = useRouter()
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number; bawaan: boolean } | null>(null)
  const [form, setForm] = React.useState<Form>(kosong)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function bukaTambah(arah: 'masuk' | 'keluar') {
    setForm({ ...kosong, arah })
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(j: BarisJenis) {
    setForm({ nama: j.nama, arah: j.arah, keterangan: j.keterangan ?? '', nominalBawaan: j.nominalBawaan, nominalDikunci: j.nominalDikunci, periode: j.periode, menandaiMeninggal: j.menandaiMeninggal })
    setGalat(null)
    setPanel({ mode: 'ubah', id: j.id, bawaan: j.bawaan })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = { ...form, keterangan: form.keterangan || null, nominalDikunci: form.nominalBawaan != null && form.nominalDikunci }
      const hasil = panel.mode === 'tambah' ? await tambahJenis(input) : await ubahJenis(panel.id, input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(panel.mode === 'tambah' ? `Jenis “${hasil.data.nama}” ditambahkan.` : 'Jenis tersimpan.')
      setPanel(null)
      router.refresh()
    })
  }
  function aktif(j: BarisJenis) {
    mulai(async () => {
      const hasil = await aturAktifJenis(j.id, !j.aktif)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(j.aktif ? `“${j.nama}” dinonaktifkan.` : `“${j.nama}” diaktifkan.`)
      router.refresh()
    })
  }
  function hapus(j: BarisJenis) {
    mulai(async () => {
      const hasil = await hapusJenis(j.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`“${j.nama}” dihapus.`)
      router.refresh()
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  const kelompok = (arah: 'masuk' | 'keluar', judul: string) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={cn('text-label font-semibold', arah === 'masuk' ? 'text-masuk' : 'text-keluar')}>{judul}</h3>
        <Button variant="halus" onClick={() => bukaTambah(arah)}>
          <Plus /> Tambah
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-input border border-border">
        {daftar
          .filter((j) => j.arah === arah)
          .map((j) => (
            <li key={j.id} className={cn('flex flex-wrap items-center gap-2 px-3 py-2', !j.aktif && 'opacity-60')}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {j.nama}
                  {!j.aktif && <span className="ml-2 rounded-badge bg-border px-2 py-0.5 text-ket text-muted">Nonaktif</span>}
                  {j.menandaiMeninggal && <span className="ml-2 rounded-badge bg-warning-soft px-2 py-0.5 text-ket font-semibold text-warning">Menandai meninggal</span>}
                </p>
                <p className="angka text-ket text-muted">
                  {j.kode} · {j.bawaan ? 'bawaan' : 'buatan sendiri'} · dipakai {j.dipakai} catatan
                </p>
                <p className="angka text-ket">
                  <span className="text-muted">Nominal: </span>
                  {j.nominalBawaan != null ? (
                    <>
                      <span className="font-semibold">{formatRupiah(j.nominalBawaan)}</span>
                      {j.nominalDikunci && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-badge bg-primary-soft px-2 py-0.5 text-ket font-semibold text-primary">
                          <Lock className="size-3" /> terkunci
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                  <span className="text-muted"> · Periode: </span>
                  <span className="font-semibold">{LABEL_PERIODE[j.periode]}</span>
                </p>
              </div>
              <Button variant="sekunder" onClick={() => bukaUbah(j)}>
                <Pencil /> Ubah
              </Button>
              <Button variant="halus" onClick={() => aktif(j)} disabled={sedangKirim}>
                {j.aktif ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
              {!j.bawaan && (
                <Button variant="halus" ukuran="ikon" className="text-keluar" aria-label={`Hapus ${j.nama}`} onClick={() => hapus(j)} disabled={sedangKirim}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
      </ul>
    </div>
  )

  return (
    <Kartu judul="Jenis Uang Masuk & Keluar" keterangan="Pilihan “Untuk apa” di form catatan. Nominal yang ditetapkan di sini terisi otomatis saat mencatat. Jenis bawaan tidak bisa dihapus; jenis yang sudah dipakai cukup dinonaktifkan.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {kelompok('masuk', 'Uang Masuk')}
        {kelompok('keluar', 'Uang Keluar')}
      </div>

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah Jenis Uang' : 'Tambah Jenis Uang'}>
          <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label>Arah</Label>
              <PilihanGanda
                label="Arah"
                warnaArah
                nilai={form.arah}
                onPilih={(v) => setForm({ ...form, arah: v, menandaiMeninggal: v === 'keluar' && form.menandaiMeninggal })}
                nonaktif={panel?.mode === 'ubah'}
                pilihan={[
                  { nilai: 'masuk', label: 'Uang Masuk' },
                  { nilai: 'keluar', label: 'Uang Keluar' },
                ]}
              />
              {panel?.mode === 'ubah' && <p className="text-ket text-muted">Arah tidak bisa diubah: catatan lama menyalin arah dari jenis ini.</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama-jenis">Nama</Label>
              <Input id="nama-jenis" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus maxLength={120} aria-invalid={galat?.field === 'nama'} />
              {galatField('nama')}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nominal-jenis">Nominal <span className="font-normal text-muted">(boleh dikosongkan)</span></Label>
              <InputRupiah id="nominal-jenis" nilai={form.nominalBawaan} onUbah={(n) => setForm({ ...form, nominalBawaan: n, nominalDikunci: n != null && form.nominalDikunci })} galat={galat?.field === 'nominalBawaan'} />
              {galatField('nominalBawaan')}
              <p className="text-ket text-muted">Kosong = bendahara mengetik jumlahnya sendiri saat mencatat.</p>
            </div>
            {form.nominalBawaan != null && (
              <div className="flex flex-col gap-2">
                <Label>Kunci nominal?</Label>
                <PilihanGanda
                  label="Kunci nominal"
                  nilai={form.nominalDikunci ? 'ya' : 'tidak'}
                  onPilih={(v) => setForm({ ...form, nominalDikunci: v === 'ya' })}
                  pilihan={[
                    { nilai: 'tidak', label: 'Tidak' },
                    { nilai: 'ya', label: 'Ya' },
                  ]}
                />
                <p className="text-ket text-muted">Ya berarti bendahara tidak bisa mengubah jumlahnya saat mencatat.</p>
                {galatField('nominalDikunci')}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="periode-jenis">Periode</Label>
              <PilihanModal<PeriodeJenis>
                id="periode-jenis"
                nilai={form.periode}
                onUbah={(v) => v && setForm({ ...form, periode: v })}
                pilihan={(['bebas', 'sekali', 'bulanan', 'tahunan'] as const).map((p) => ({ nilai: p, label: LABEL_PERIODE[p] }))}
              />
              <p className="text-ket text-muted">Dipakai untuk mengingatkan bila anggota yang sama dicatat dua kali dalam periode yang sama.</p>
              {galatField('periode')}
            </div>
            {form.arah === 'keluar' && (
              <div className="flex flex-col gap-2 rounded-input border border-warning bg-warning-soft p-4">
                <Label>Menandai orang meninggal dunia?</Label>
                <PilihanGanda
                  label="Menandai meninggal"
                  nilai={form.menandaiMeninggal ? 'ya' : 'tidak'}
                  onPilih={(v) => setForm({ ...form, menandaiMeninggal: v === 'ya' })}
                  pilihan={[
                    { nilai: 'tidak', label: 'Tidak' },
                    { nilai: 'ya', label: 'Ya' },
                  ]}
                />
                <p className="text-ket text-warning">Bila Ya, mencatat jenis ini atas nama anggota (atau tanggungannya) otomatis menandai orang itu meninggal dunia; menghapus catatannya mengembalikan statusnya.</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="ket-jenis">Keterangan <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="ket-jenis" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} maxLength={255} />
            </div>
            <p className="text-ket text-muted">Mengubah nominal tidak mengubah catatan yang sudah ada.</p>
            {galat && !['nama', 'nominalBawaan', 'nominalDikunci', 'periode'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </Kartu>
  )
}
