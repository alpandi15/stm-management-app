'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, CalendarRange, HeartCrack, Lock, MoreVertical, Pencil, Percent, Plus, Power, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifJenis, hapusJenis, tambahJenis, ubahJenis } from '@/server/actions/jenis'
import type { BarisJenis } from '@/server/queries/jenis'
import type { PeriodeJenis } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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

type Form = { nama: string; arah: 'masuk' | 'keluar'; keterangan: string; nominalBawaan: number | null; nominalDikunci: boolean; periode: PeriodeJenis; menandaiMeninggal: boolean; biayaKutipPersen: string; biayaKutipJenisId: number | null }
const kosong: Form = { nama: '', arah: 'masuk', keterangan: '', nominalBawaan: null, nominalDikunci: false, periode: 'bebas', menandaiMeninggal: false, biayaKutipPersen: '', biayaKutipJenisId: null }

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
    setForm({ nama: j.nama, arah: j.arah, keterangan: j.keterangan ?? '', nominalBawaan: j.nominalBawaan, nominalDikunci: j.nominalDikunci, periode: j.periode, menandaiMeninggal: j.menandaiMeninggal, biayaKutipPersen: j.biayaKutipPersen ? String(j.biayaKutipPersen) : '', biayaKutipJenisId: j.biayaKutipJenisId })
    setGalat(null)
    setPanel({ mode: 'ubah', id: j.id, bawaan: j.bawaan })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = { ...form, keterangan: form.keterangan || null, nominalDikunci: form.nominalBawaan != null && form.nominalDikunci, biayaKutipPersen: form.biayaKutipPersen ? Number(form.biayaKutipPersen) : null, biayaKutipJenisId: form.biayaKutipJenisId }
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
  const [tab, setTab] = React.useState<'masuk' | 'keluar'>('masuk')

  /** Kartu per jenis: ikon arah, nama + badge, tiga fakta (nominal, periode, dipakai), menu aksi. */
  const kartuJenis = (j: BarisJenis) => {
    const masuk = j.arah === 'masuk'
    return (
      <li key={j.id} className={cn('flex gap-4 rounded-kartu border border-border bg-surface p-4 shadow-kartu transition-colors hover:border-primary', !j.aktif && 'opacity-60')}>
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-input', masuk ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')} aria-hidden>
          {masuk ? <ArrowDownLeft className="size-6" /> : <ArrowUpRight className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-judul-kartu font-semibold leading-tight">{j.nama}</p>
            <span className="angka rounded-badge bg-bg px-2 py-0.5 text-ket font-semibold text-muted">{j.kode}</span>
            {!j.aktif && <span className="rounded-badge bg-border px-2 py-0.5 text-ket font-semibold text-muted">Nonaktif</span>}
            {!j.bawaan && <span className="rounded-badge border border-primary px-2 py-0.5 text-ket font-medium text-primary">Buatan sendiri</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ket text-muted">
            <span className="angka inline-flex items-center gap-1">
              <span className="text-muted">Nominal</span>
              {j.nominalBawaan != null ? (
                <>
                  <span className="font-semibold text-text">{formatRupiah(j.nominalBawaan)}</span>
                  {j.nominalDikunci && (
                    <span className="inline-flex items-center gap-1 rounded-badge bg-primary-soft px-2 py-0.5 font-semibold text-primary">
                      <Lock className="size-3" /> terkunci
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text">bebas</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="size-3.5" /> <span className="font-semibold text-text">{LABEL_PERIODE[j.periode]}</span>
            </span>
            <span className="angka">
              dipakai <span className="font-semibold text-text">{j.dipakai}</span> catatan
            </span>
          </div>
          {(j.menandaiMeninggal || !!j.biayaKutipPersen) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {j.menandaiMeninggal && (
                <span className="inline-flex items-center gap-1 rounded-badge bg-warning-soft px-2 py-0.5 text-ket font-semibold text-warning">
                  <HeartCrack className="size-3.5" /> Menandai meninggal
                </span>
              )}
              {!!j.biayaKutipPersen && (
                <span className="inline-flex items-center gap-1 rounded-badge bg-warning-soft px-2 py-0.5 text-ket font-semibold text-warning">
                  <Percent className="size-3.5" /> Biaya kutip {j.biayaKutipPersen}%
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <Button variant="sekunder" onClick={() => bukaUbah(j)}>
            <Pencil /> Ubah
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex size-sentuh items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label={`Menu ${j.nama}`}>
                <MoreVertical className="size-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => aktif(j)} disabled={sedangKirim}>
                <Power /> {j.aktif ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownMenuItem>
              {!j.bawaan && (
                <DropdownMenuItem bahaya onSelect={() => hapus(j)} disabled={sedangKirim}>
                  <Trash2 /> Hapus
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    )
  }

  const jumlah = { masuk: daftar.filter((j) => j.arah === 'masuk').length, keluar: daftar.filter((j) => j.arah === 'keluar').length }
  const tampil = daftar.filter((j) => j.arah === tab)

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-3 text-isi text-muted">Pilihan “Untuk apa” di form catatan. Nominal yang ditetapkan di sini terisi otomatis saat mencatat. Jenis bawaan tidak bisa dihapus; jenis yang sudah dipakai cukup dinonaktifkan.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Arah" className="grid grid-cols-2 gap-2 sm:w-[30rem]">
          {(
            [
              ['masuk', 'Uang Masuk', jumlah.masuk, ArrowDownLeft],
              ['keluar', 'Uang Keluar', jumlah.keluar, ArrowUpRight],
            ] as const
          ).map(([nilai, label, n, Ikon]) => (
            <button
              key={nilai}
              type="button"
              role="tab"
              aria-selected={tab === nilai}
              onClick={() => setTab(nilai)}
              className={cn(
                'flex min-h-aksi items-center justify-center gap-2 rounded-input border-2 px-3 text-form font-semibold transition-colors',
                tab === nilai ? (nilai === 'masuk' ? 'border-masuk bg-masuk text-arah-fg' : 'border-keluar bg-keluar text-arah-fg') : 'border-border-kuat bg-input text-text hover:bg-bg',
              )}
            >
              <Ikon className="size-5" /> {label} <span className={cn('angka rounded-badge px-2 py-0.5 text-ket', tab === nilai ? 'border border-arah-fg' : 'bg-bg text-muted')}>{n}</span>
            </button>
          ))}
        </div>
        <Button ukuran="aksi" onClick={() => bukaTambah(tab)}>
          <Plus /> Tambah Jenis {tab === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'}
        </Button>
      </div>
      <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2" role="tabpanel">
        {tampil.map(kartuJenis)}
      </ul>

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
            {form.arah === 'masuk' && (
              <div className="flex flex-col gap-3 rounded-input border border-warning bg-warning-soft p-4">
                <Label htmlFor="biaya-kutip">Biaya kutip untuk pengutip <span className="font-normal text-muted">(kosong = tidak ada)</span></Label>
                <div className="flex items-center gap-2">
                  <Input id="biaya-kutip" inputMode="numeric" className="angka w-28" value={form.biayaKutipPersen} onChange={(e) => setForm({ ...form, biayaKutipPersen: e.target.value.replace(/\D/g, '').slice(0, 3) })} aria-invalid={galat?.field === 'biayaKutipPersen'} placeholder="10" />
                  <span className="text-form font-semibold">%</span>
                </div>
                {galatField('biayaKutipPersen')}
                {form.biayaKutipPersen && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="biaya-kutip-jenis">Dicatat sebagai uang keluar jenis</Label>
                    <PilihanModal<number>
                      id="biaya-kutip-jenis"
                      nilai={form.biayaKutipJenisId}
                      onUbah={(v) => setForm({ ...form, biayaKutipJenisId: v })}
                      pilihan={daftar.filter((j) => j.arah === 'keluar' && j.aktif).map((j) => ({ nilai: j.id, label: j.nama, keterangan: j.kode }))}
                      labelKosong="Bawaan: Biaya Kutip Iuran (PK11)"
                      placeholder="Bawaan: Biaya Kutip Iuran"
                      judul="Jenis uang keluar biaya kutip"
                    />
                  </div>
                )}
                <p className="text-ket text-warning">
                  Setiap kali jenis ini dicatat sebagai uang masuk, {form.biayaKutipPersen || '…'}% dari jumlahnya otomatis dicatat sebagai uang keluar (bagian pengutip). Uang masuk tetap dicatat penuh — mis. masuk Rp 100.000, keluar Rp {form.biayaKutipPersen ? formatRupiah(Math.floor((100000 * Number(form.biayaKutipPersen)) / 100)).replace('Rp ', '') : '…'}.
                </p>
              </div>
            )}
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
    </div>
  )
}
