'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { bayarTunggakanLama, hapusTunggakanLama, tambahTunggakanLama, ubahTunggakanLama, type BarisTunggakanLamaInput } from '@/server/actions/duka'
import type { TunggakanDukaLama } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { InputRupiah } from '@/components/keuangan/InputRupiah'

type BarisForm = { kunci: number; jumlah: string; tarif: number | null; keterangan: string }
let kunciBaris = 0
const barisBaru = (tarif: number | null = null): BarisForm => ({ kunci: ++kunciBaris, jumlah: '', tarif, keterangan: '' })

/**
 * Tunggakan iuran duka dari masa sebelum Buku Duka dipakai — almarhumnya tidak tercatat lagi,
 * yang tersisa di buku manual hanya "6 kejadian × Rp 5.000 (Jan–Mei, pengurus lama)" dan
 * "10 kejadian × Rp 7.000". Tiap baris tampil jelas, berkurang saat dibayar, hilang saat lunas.
 */
export function TunggakanLama({ anggotaId, baris, tarifSaran }: { anggotaId: number; baris: TunggakanDukaLama[]; tarifSaran: number[] }) {
  const router = useRouter()
  const [tambah, setTambah] = React.useState(false)
  const [ubah, setUbah] = React.useState<TunggakanDukaLama | null>(null)
  const [bayar, setBayar] = React.useState<TunggakanDukaLama | null>(null)
  const [hapus, setHapus] = React.useState<TunggakanDukaLama | null>(null)
  const [formTambah, setFormTambah] = React.useState<BarisForm[]>([])
  const [formUbah, setFormUbah] = React.useState<BarisForm>(barisBaru())
  const [jumlahBayar, setJumlahBayar] = React.useState('')
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  const total = baris.reduce((s, b) => s + b.jumlah * b.tarif, 0)
  const jumlah = baris.reduce((s, b) => s + b.jumlah, 0)

  function bukaTambah() {
    setGalat(null)
    // Bawaan: satu baris per tarif yang pernah dipakai (mis. 5.000 dan 7.000), atau satu baris kosong
    setFormTambah(tarifSaran.length ? tarifSaran.map((t) => barisBaru(t)) : [barisBaru()])
    setTambah(true)
  }
  function bukaUbah(b: TunggakanDukaLama) {
    setGalat(null)
    setFormUbah({ kunci: ++kunciBaris, jumlah: String(b.jumlah), tarif: b.tarif, keterangan: b.keterangan ?? '' })
    setUbah(b)
  }
  function bukaBayar(b: TunggakanDukaLama) {
    setGalat(null)
    setJumlahBayar(String(b.jumlah))
    setBayar(b)
  }

  const keInput = (b: BarisForm): BarisTunggakanLamaInput => ({ jumlah: Number(b.jumlah || 0), tarif: b.tarif ?? 0, keterangan: b.keterangan })

  function simpanTambah(e: React.FormEvent) {
    e.preventDefault()
    // Baris yang dibiarkan kosong sepenuhnya diabaikan
    const terisi = formTambah.filter((b) => b.jumlah || b.tarif || b.keterangan)
    if (terisi.length === 0) {
      setGalat({ pesan: 'Isi minimal satu baris: berapa kejadian dan iuran per kejadiannya.' })
      return
    }
    mulai(async () => {
      const hasil = await tambahTunggakanLama(anggotaId, terisi.map(keInput))
      if (!hasil.ok) {
        // field "jumlah-2" → baris ke-3 di daftar yang terisi
        const m = hasil.field?.match(/^(\w+)-(\d+)$/)
        setGalat({ pesan: hasil.pesan, field: m ? `${m[1]}-${terisi[Number(m[2])]?.kunci}` : hasil.field })
        return
      }
      toast.success(`${hasil.data.jumlah} baris tunggakan lama dicatat.`)
      setTambah(false)
      router.refresh()
    })
  }

  function simpanUbah(e: React.FormEvent) {
    e.preventDefault()
    if (!ubah) return
    mulai(async () => {
      const hasil = await ubahTunggakanLama(ubah.id, keInput(formUbah))
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success('Baris tunggakan diperbarui.')
      setUbah(null)
      router.refresh()
    })
  }

  function simpanBayar(e: React.FormEvent) {
    e.preventDefault()
    if (!bayar) return
    mulai(async () => {
      const hasil = await bayarTunggakanLama(bayar.id, Number(jumlahBayar || 0))
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(hasil.data.sisa === 0 ? `Lunas: ${hasil.data.dibayar} kejadian × ${formatRupiah(bayar.tarif)} = ${formatRupiah(hasil.data.rupiah)}.` : `${hasil.data.dibayar} kejadian dibayar (${formatRupiah(hasil.data.rupiah)}). Sisa ${hasil.data.sisa} kejadian.`)
      setBayar(null)
      router.refresh()
    })
  }

  function hapusSekarang() {
    if (!hapus) return
    mulai(async () => {
      const hasil = await hapusTunggakanLama(hapus.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success('Baris tunggakan dihapus.')
      setHapus(null)
      router.refresh()
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  // Fungsi penolong render (bukan komponen): komponen yang didefinisikan di dalam render kehilangan fokus tiap ketikan
  function fieldBaris(b: BarisForm, onUbah: (u: Partial<BarisForm>) => void, awalan: string) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${awalan}-jumlah-${b.kunci}`}>Berapa kejadian</Label>
          <Input id={`${awalan}-jumlah-${b.kunci}`} inputMode="numeric" className="angka" value={b.jumlah} onChange={(e) => onUbah({ jumlah: e.target.value.replace(/\D/g, '') })} aria-invalid={galat?.field === `jumlah-${b.kunci}` || galat?.field === 'jumlah'} placeholder="6" />
          {galatField(`jumlah-${b.kunci}`)}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${awalan}-tarif-${b.kunci}`}>Iuran per kejadian</Label>
          <InputRupiah id={`${awalan}-tarif-${b.kunci}`} nilai={b.tarif} onUbah={(n) => onUbah({ tarif: n })} galat={galat?.field === `tarif-${b.kunci}` || galat?.field === 'tarif'} />
          {galatField(`tarif-${b.kunci}`)}
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${awalan}-ket-${b.kunci}`}>
            Keterangan <span className="font-normal text-muted">(boleh kosong)</span>
          </Label>
          <Input id={`${awalan}-ket-${b.kunci}`} value={b.keterangan} onChange={(e) => onUbah({ keterangan: e.target.value })} maxLength={255} placeholder="Contoh: Januari–Mei 2026, pengurus lama" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-input border-2 border-dashed border-border-kuat px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label font-semibold">
            Tunggakan lama <span className="font-normal text-muted">(sebelum Buku Duka dipakai)</span>
          </p>
          <p className="text-ket text-muted">
            {baris.length === 0 ? 'Tidak ada. Isi bila di buku manual anggota ini masih tercatat iuran duka yang belum dibayar.' : `${jumlah} kejadian belum dibayar · ${formatRupiah(total)}`}
          </p>
        </div>
        <Button variant="sekunder" onClick={bukaTambah}>
          <Plus /> Tambah tunggakan lama
        </Button>
      </div>
      {baris.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-input border border-border bg-surface">
          {baris.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="angka block text-form font-semibold text-keluar">
                  {b.jumlah} kejadian × {formatRupiah(b.tarif)} = {formatRupiah(b.jumlah * b.tarif)}
                </span>
                {b.keterangan && <span className="block truncate text-ket text-muted">{b.keterangan}</span>}
              </span>
              <span className="flex shrink-0 gap-1">
                <Button variant="sekunder" onClick={() => bukaBayar(b)}>
                  <HandCoins /> Bayar
                </Button>
                <Button variant="halus" ukuran="ikon" aria-label="Ubah baris" onClick={() => bukaUbah(b)}>
                  <Pencil />
                </Button>
                <Button variant="halus" ukuran="ikon" className="text-keluar" aria-label="Hapus baris" onClick={() => setHapus(b)}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Tambah: bisa beberapa baris sekaligus (satu per tarif) */}
      <Dialog open={tambah} onOpenChange={(o) => !o && setTambah(false)}>
        <DialogContent judul="Tambah tunggakan lama" className="max-w-2xl">
          <DialogDescription className="text-isi text-muted">
            Dari buku manual: berapa kejadian yang belum dibayar, dan berapa iuran per kejadiannya saat itu. Buat baris terpisah bila tarifnya berbeda — misalnya 6 × Rp 5.000 (pengurus lama) dan 10 × Rp 7.000 (mulai Mei).
          </DialogDescription>
          <form onSubmit={simpanTambah} className="flex flex-col gap-4" noValidate>
            {formTambah.map((b, i) => (
              <div key={b.kunci} className="rounded-input border-2 border-border bg-bg p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-label font-semibold text-muted">Baris {i + 1}</span>
                  {formTambah.length > 1 && (
                    <Button type="button" variant="halus" ukuran="ikon" aria-label={`Hapus baris ${i + 1}`} onClick={() => setFormTambah(formTambah.filter((x) => x.kunci !== b.kunci))}>
                      <X />
                    </Button>
                  )}
                </div>
                {fieldBaris(b, (u) => setFormTambah((f) => f.map((x) => (x.kunci === b.kunci ? { ...x, ...u } : x))), 'tambah')}
              </div>
            ))}
            <Button type="button" variant="halus" className="w-fit" onClick={() => setFormTambah([...formTambah, barisBaru()])}>
              <Plus /> Tambah baris dengan tarif lain
            </Button>
            {galat && !/^(jumlah|tarif)-/.test(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" ukuran="aksi" className="sm:flex-1" disabled={sedangKirim}>
                {sedangKirim ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button type="button" variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setTambah(false)}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ubah !== null} onOpenChange={(o) => !o && setUbah(null)}>
        <DialogContent judul="Ubah baris tunggakan">
          <form onSubmit={simpanUbah} className="flex flex-col gap-4" noValidate>
            {fieldBaris(formUbah, (u) => setFormUbah((f) => ({ ...f, ...u })), 'ubah')}
            {galat && !/^(jumlah|tarif)/.test(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            {galat && (galat.field === 'jumlah' || galat.field === 'tarif') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" ukuran="aksi" className="sm:flex-1" disabled={sedangKirim}>
                {sedangKirim ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button type="button" variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setUbah(null)}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bayar !== null} onOpenChange={(o) => !o && setBayar(null)}>
        <DialogContent judul="Bayar tunggakan lama">
          {bayar && (
            <form onSubmit={simpanBayar} className="flex flex-col gap-4" noValidate>
              <DialogDescription className="text-isi text-muted">
                Baris ini: <strong className="text-text">{bayar.jumlah} kejadian × {formatRupiah(bayar.tarif)}</strong>
                {bayar.keterangan && ` (${bayar.keterangan})`}. Berapa kejadian yang dibayar sekarang?
              </DialogDescription>
              <div className="flex flex-col gap-2">
                <Label htmlFor="jumlah-bayar">Dibayar (kejadian)</Label>
                <Input id="jumlah-bayar" inputMode="numeric" className="angka" value={jumlahBayar} onChange={(e) => setJumlahBayar(e.target.value.replace(/\D/g, ''))} aria-invalid={galat?.field === 'jumlahBayar'} autoFocus />
                {galatField('jumlahBayar')}
                <p className="angka text-ket text-muted">
                  = {formatRupiah(Number(jumlahBayar || 0) * bayar.tarif)}
                  {Number(jumlahBayar || 0) < bayar.jumlah && Number(jumlahBayar || 0) > 0 && ` · sisa ${bayar.jumlah - Number(jumlahBayar)} kejadian`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button type="submit" ukuran="aksi" className="sm:flex-1" disabled={sedangKirim}>
                  {sedangKirim ? 'Menyimpan…' : Number(jumlahBayar || 0) >= bayar.jumlah ? 'Lunas Semua' : 'Catat Pembayaran'}
                </Button>
                <Button type="button" variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setBayar(null)}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus baris tunggakan?">
          <DialogDescription className="text-isi text-muted">
            {hapus && `${hapus.jumlah} kejadian × ${formatRupiah(hapus.tarif)}`} akan dihapus dari catatan tunggakan. Pakai ini hanya bila salah input — kalau memang dibayar, pakai tombol Bayar.
          </DialogDescription>
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
