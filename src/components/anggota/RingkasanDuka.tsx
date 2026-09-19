'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckSquare, HeartHandshake, Pencil, Square } from 'lucide-react'
import { toast } from 'sonner'
import { aturPembayaranDuka, aturTunggakanLama, tandaiSemuaDukaAnggota } from '@/server/actions/duka'
import type { RingkasanDukaAnggota } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { InputRupiah } from '@/components/keuangan/InputRupiah'
import { cn } from '@/lib/utils'

/**
 * Bagian "Iuran Duka" di detail anggota. Admin bisa mencentang langsung di sini (tersimpan
 * seketika, sama seperti di Buku Duka), menandai semua, dan mengisi tunggakan lama — kejadian
 * sebelum Buku Duka dipakai yang almarhumnya tidak tercatat: cukup berapa kejadian + rupiah.
 */
export function RingkasanDuka({ anggotaId, ringkasan: r }: { anggotaId: number; ringkasan: RingkasanDukaAnggota }) {
  const router = useRouter()
  const [bayar, setBayar] = React.useState<Map<number, string | null>>(() => new Map(r.daftar.filter((k) => k.sudahBayar).map((k) => [k.id, k.tanggalBayar])))
  const [sibuk, setSibuk] = React.useState<Set<number>>(new Set())
  const [ubahLama, setUbahLama] = React.useState(false)
  const [lama, setLama] = React.useState({ jumlah: String(r.lamaJumlah || ''), rupiah: r.lamaRupiah || null, keterangan: r.lamaKeterangan ?? '' })
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  React.useEffect(() => {
    setBayar(new Map(r.daftar.filter((k) => k.sudahBayar).map((k) => [k.id, k.tanggalBayar])))
    setLama({ jumlah: String(r.lamaJumlah || ''), rupiah: r.lamaRupiah || null, keterangan: r.lamaKeterangan ?? '' })
  }, [r])

  const nunggakKejadian = r.daftar.filter((k) => !bayar.has(k.id))
  const totalKejadian = nunggakKejadian.reduce((s, k) => s + k.tarif, 0)
  const jumlahNunggak = nunggakKejadian.length + r.lamaJumlah
  const totalNunggak = totalKejadian + r.lamaRupiah
  const adaApaApa = r.jumlahWajib > 0 || r.lamaJumlah > 0

  async function toggle(id: number, tanggalLama: string | null) {
    if (sibuk.has(id)) return
    const sudah = bayar.has(id)
    setSibuk((s) => new Set(s).add(id))
    setBayar((m) => {
      const n = new Map(m)
      if (sudah) n.delete(id)
      else n.set(id, null)
      return n
    })
    const hasil = await aturPembayaranDuka(id, anggotaId, !sudah)
    setSibuk((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
    if (!hasil.ok) {
      toast.error(hasil.pesan)
      setBayar((m) => {
        const n = new Map(m)
        if (sudah) n.set(id, tanggalLama)
        else n.delete(id)
        return n
      })
      return
    }
    router.refresh()
  }

  function tandaiSemua() {
    mulai(async () => {
      const hasil = await tandaiSemuaDukaAnggota(anggotaId)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`${hasil.data.jumlah} kejadian ditandai sudah bayar.`)
      router.refresh()
    })
  }

  function simpanLama(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const hasil = await aturTunggakanLama(anggotaId, { jumlah: Number(lama.jumlah || 0), rupiah: lama.rupiah ?? 0, keterangan: lama.keterangan })
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      setGalat(null)
      setUbahLama(false)
      toast.success(hasil.data.jumlah === 0 ? 'Tunggakan lama dinyatakan lunas.' : 'Tunggakan lama tersimpan.')
      router.refresh()
    })
  }

  function lunasiLama() {
    mulai(async () => {
      const hasil = await aturTunggakanLama(anggotaId, { jumlah: 0, rupiah: 0 })
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success('Tunggakan lama dinyatakan lunas.')
      router.refresh()
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Iuran duka">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-judul-kartu font-semibold">Iuran Duka / Kemalangan</h2>
          <p className="mt-1 text-ket text-muted">
            {!adaApaApa ? 'Belum ada kejadian yang menjadi kewajibannya.' : `Wajib ${r.jumlahWajib} kejadian tercatat · sudah bayar ${r.daftar.length - nunggakKejadian.length}${r.lamaJumlah > 0 ? ` · ${r.lamaJumlah} tunggakan lama` : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nunggakKejadian.length > 1 && (
            <Button variant="sekunder" onClick={tandaiSemua} disabled={sedangKirim}>
              <CheckSquare /> Tandai semua sudah bayar
            </Button>
          )}
          <Button asChild variant="halus">
            <Link href="/duka">
              <HeartHandshake /> Buku Duka
            </Link>
          </Button>
        </div>
      </div>

      {adaApaApa && (
        <div className={cn('mt-4 flex items-center justify-between gap-3 rounded-input px-4 py-3', jumlahNunggak > 0 ? 'bg-keluar-soft text-keluar' : 'bg-masuk-soft text-masuk')}>
          <span className="text-isi font-semibold">{jumlahNunggak > 0 ? `Menunggak ${jumlahNunggak} kejadian` : 'Lunas semua'}</span>
          <span className="angka text-judul-kartu font-bold">{formatRupiah(totalNunggak)}</span>
        </div>
      )}

      {/* Tunggakan lama: sebelum Buku Duka dipakai, almarhumnya tidak tercatat */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-input border-2 border-dashed border-border-kuat px-4 py-3">
        <div className="min-w-0">
          <p className="text-label font-semibold">Tunggakan lama <span className="font-normal text-muted">(sebelum Buku Duka dipakai)</span></p>
          {r.lamaJumlah > 0 ? (
            <p className="text-isi">
              <span className="font-semibold text-keluar">
                {r.lamaJumlah} kejadian · {formatRupiah(r.lamaRupiah)}
              </span>
              {r.lamaKeterangan && <span className="text-muted"> · {r.lamaKeterangan}</span>}
            </p>
          ) : (
            <p className="text-ket text-muted">Tidak ada. Isi bila anggota ini masih punya iuran duka yang belum dibayar dari tahun-tahun lalu.</p>
          )}
        </div>
        <div className="flex gap-2">
          {r.lamaJumlah > 0 && (
            <Button variant="sekunder" onClick={lunasiLama} disabled={sedangKirim}>
              <CheckSquare /> Sudah dibayar semua
            </Button>
          )}
          <Button variant={r.lamaJumlah > 0 ? 'halus' : 'sekunder'} onClick={() => { setGalat(null); setUbahLama(true) }}>
            <Pencil /> {r.lamaJumlah > 0 ? 'Ubah tunggakan lama' : 'Isi tunggakan lama'}
          </Button>
        </div>
      </div>

      {r.daftar.length > 0 && (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-input border border-border">
          {r.daftar.map((k) => {
            const sudah = bayar.has(k.id)
            const tanggal = bayar.get(k.id) ?? k.tanggalBayar
            return (
              <li key={k.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={sudah}
                  aria-label={`Alm. ${k.namaAlmarhum} ${sudah ? 'sudah' : 'belum'} bayar`}
                  disabled={sibuk.has(k.id)}
                  onClick={() => toggle(k.id, k.tanggalBayar)}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-bg disabled:opacity-60', !sudah && 'bg-keluar-soft')}
                >
                  {sudah ? <CheckSquare className="size-8 shrink-0 text-masuk" /> : <Square className="size-8 shrink-0 text-keluar" />}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate font-semibold', sudah && 'text-muted')}>
                      <span className="angka mr-2 text-ket text-muted">#{k.nomor}</span>Alm. {k.namaAlmarhum}
                    </span>
                    <span className="block truncate text-ket text-muted">
                      {formatTanggal(k.tanggalMeninggal)}
                      {sudah ? ` · dibayar${tanggal ? ` ${formatTanggal(tanggal)}` : ''}` : ' · belum bayar — klik untuk mencentang'}
                    </span>
                  </span>
                  <span className={cn('angka shrink-0 rounded-badge px-3 py-1 text-ket font-semibold', sudah ? 'bg-masuk-soft text-masuk' : 'bg-surface text-keluar')}>
                    {sudah ? 'Lunas' : formatRupiah(k.tarif)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={ubahLama} onOpenChange={(o) => !o && setUbahLama(false)}>
        <DialogContent judul="Tunggakan lama iuran duka">
          <DialogDescription className="text-isi text-muted">
            Untuk iuran duka yang belum dibayar dari masa sebelum Buku Duka dipakai — almarhumnya tidak perlu tahu, cukup jumlahnya. Turunkan angkanya setiap kali sebagian dibayar, atau tekan “Sudah dibayar semua”.
          </DialogDescription>
          <form onSubmit={simpanLama} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lama-jumlah">Berapa kejadian</Label>
                <Input id="lama-jumlah" inputMode="numeric" className="angka" value={lama.jumlah} onChange={(e) => setLama({ ...lama, jumlah: e.target.value.replace(/\D/g, '') })} aria-invalid={galat?.field === 'jumlah'} autoFocus />
                {galatField('jumlah')}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lama-rupiah">Total rupiah</Label>
                <InputRupiah id="lama-rupiah" nilai={lama.rupiah} onUbah={(n) => setLama({ ...lama, rupiah: n })} galat={galat?.field === 'rupiah'} />
                {galatField('rupiah')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lama-ket">
                Catatan <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <Input id="lama-ket" value={lama.keterangan} onChange={(e) => setLama({ ...lama, keterangan: e.target.value })} maxLength={255} placeholder="Contoh: belum bayar 3 kejadian sepanjang 2025" />
            </div>
            {galat && !['jumlah', 'rupiah'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" ukuran="aksi" className="sm:flex-1" disabled={sedangKirim}>
                {sedangKirim ? 'Menyimpan…' : 'Simpan'}
              </Button>
              <Button type="button" variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setUbahLama(false)}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
