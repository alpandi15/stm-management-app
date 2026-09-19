'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Banknote, HandCoins, Landmark, Plus, Trash2, UserPlus, Users, X } from 'lucide-react'
import { cekSudahBayar, simpanSetoran } from '@/server/actions/setoran'
import type { Jenis } from '@/server/db/schema'
import type { AnggotaUntukForm } from '@/server/queries/transaksi'
import { formatRupiah, formatAngka, parseRupiah, terbilangRupiah } from '@/lib/rupiah'
import { formatPeriode, hariIni, periodeUntuk, tambahBulan } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { PilihanModal } from '@/components/ui/pilihan-modal'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { PilihPeriode } from '@/components/ui/pilih-periode'
import { InputBukti } from '@/components/keuangan/InputBukti'
import { labelJenis } from '@/components/keuangan/FormCatatan'
import { ModalPilihAnggota } from './ModalPilihAnggota'
import { cn } from '@/lib/utils'

type Baris = { kunci: number; jenisId: number; periode: string | null; jumlahPeriode: number; kelipatan: number; nominal: number | null; almarhum: string[]; keterangan: string }
type Kartu = { kunci: number; anggotaId: number | null; baris: Baris[] }

let penghitung = 1
const kunciBaru = () => penghitung++

/**
 * Catat iuran kolektif: kepala setoran, jenis utama (diisi sekali), anggota ditambah lewat
 * modal — setiap anggota langsung mendapat baris jenis utama; baris jenis lain ditambah
 * per anggota bila perlu; kartu "tanpa nama" untuk uang yang tidak dirinci per anggota.
 */
export function FormSetoran({
  daftarJenis,
  daftarAnggota,
  daftarPenyetor,
  almarhum,
}: {
  daftarJenis: Jenis[]
  daftarAnggota: AnggotaUntukForm[]
  daftarPenyetor: Array<{ id: number; nama: string; nomor: string | null; pengutip: boolean }>
  almarhum: Array<{ label: string; nama: string }>
}) {
  const router = useRouter()
  const jenisMasuk = daftarJenis.filter((j) => j.arah === 'masuk')
  const jenisMap = new Map(daftarJenis.map((j) => [j.id, j]))
  const anggotaMap = new Map(daftarAnggota.map((a) => [a.id, a]))

  const [tanggal, setTanggal] = React.useState(hariIni())
  const [penyetorId, setPenyetorId] = React.useState<number | null>(null)
  const [metode, setMetode] = React.useState<'tunai' | 'transfer'>('tunai')
  const [keterangan, setKeterangan] = React.useState('')
  const [ketOtomatis, setKetOtomatis] = React.useState(true)
  const [bukti, setBukti] = React.useState<File | null | undefined>(undefined)
  const [jenisUtamaId, setJenisUtamaId] = React.useState<number | null>(null)
  const [periodeUtama, setPeriodeUtama] = React.useState<string | null>(null)
  const [nominalUtama, setNominalUtama] = React.useState<number | null>(null)
  const [kartu, setKartu] = React.useState<Kartu[]>([])
  const [modal, setModal] = React.useState(false)
  const [sudahBayar, setSudahBayar] = React.useState<Record<number, string>>({})
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  const jenisUtama = jenisUtamaId ? jenisMap.get(jenisUtamaId) : undefined
  const periodeJenisUtama = jenisUtama?.periode === 'bulanan' || jenisUtama?.periode === 'tahunan' ? jenisUtama.periode : null
  const periodeUtamaTampil = periodeJenisUtama ? periodeUntuk(periodeJenisUtama, tanggal, periodeUtama) : null

  // Jenis utama berganti: keterangan otomatis, nominal bawaan, periode ulang
  React.useEffect(() => {
    if (!jenisUtama) return
    if (ketOtomatis) setKeterangan(jenisUtama.nama)
    setNominalUtama(jenisUtama.nominalBawaan ?? null)
    setPeriodeUtama(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenisUtamaId])

  // Siapa yang sudah bayar jenis utama pada periode itu — untuk tanda di modal
  React.useEffect(() => {
    if (!jenisUtamaId) return
    let batal = false
    cekSudahBayar(jenisUtamaId, periodeUtamaTampil).then((h) => {
      if (!batal) setSudahBayar(h.ok ? (h.data as Record<number, string>) : {})
    })
    return () => {
      batal = true
    }
  }, [jenisUtamaId, periodeUtamaTampil])

  const barisBaru = (jenisId: number, nominal: number | null, periode: string | null): Baris => ({
    kunci: kunciBaru(),
    jenisId,
    periode,
    jumlahPeriode: 1,
    kelipatan: 1,
    nominal,
    almarhum: [],
    keterangan: '',
  })

  function tambahAnggota(ids: number[]) {
    setKartu((k) => [
      ...k,
      ...ids
        .filter((id) => !k.some((x) => x.anggotaId === id))
        .map((id) => ({ kunci: kunciBaru(), anggotaId: id, baris: jenisUtama ? [barisBaru(jenisUtama.id, nominalUtama, periodeUtamaTampil)] : [] })),
    ])
    setModal(false)
  }
  function tambahKartuTanpaNama() {
    setKartu((k) => [...k, { kunci: kunciBaru(), anggotaId: null, baris: jenisUtama ? [barisBaru(jenisUtama.id, nominalUtama, periodeUtamaTampil)] : [] }])
  }
  function hapusKartu(kunci: number) {
    setKartu((k) => k.filter((x) => x.kunci !== kunci))
  }
  function tambahBaris(kunciKartu: number) {
    setKartu((k) => k.map((x) => (x.kunci === kunciKartu ? { ...x, baris: [...x.baris, barisBaru(0, null, null)] } : x)))
  }
  function ubahBaris(kunciKartu: number, kunciBaris: number, perubahan: Partial<Baris>) {
    setKartu((k) => k.map((x) => (x.kunci === kunciKartu ? { ...x, baris: x.baris.map((b) => (b.kunci === kunciBaris ? { ...b, ...perubahan } : b)) } : x)))
  }
  function hapusBaris(kunciKartu: number, kunciBaris: number) {
    setKartu((k) => k.map((x) => (x.kunci === kunciKartu ? { ...x, baris: x.baris.filter((b) => b.kunci !== kunciBaris) } : x)))
  }
  function terapkanNominalKeSemua() {
    if (!jenisUtama || nominalUtama == null) return
    setKartu((k) => k.map((x) => ({ ...x, baris: x.baris.map((b) => (b.jenisId === jenisUtama.id ? { ...b, nominal: nominalUtama, periode: periodeUtamaTampil } : b)) })))
    toast.success(`Nominal ${formatRupiah(nominalUtama)} diterapkan ke semua baris ${jenisUtama.nama}.`)
  }

  const subtotalBaris = (b: Baris) => {
    const j = jenisMap.get(b.jenisId)
    const berperiode = j?.periode === 'bulanan' || j?.periode === 'tahunan'
    return (b.nominal ?? 0) * (berperiode ? b.jumlahPeriode : b.kelipatan)
  }
  const total = kartu.reduce((t, k) => t + k.baris.reduce((u, b) => u + subtotalBaris(b), 0), 0)
  const rekapJenis = (() => {
    const m = new Map<number, { nama: string; total: number; catatan: number }>()
    for (const k of kartu)
      for (const b of k.baris) {
        const j = jenisMap.get(b.jenisId)
        if (!j) continue
        const berperiode = j.periode === 'bulanan' || j.periode === 'tahunan'
        const r = m.get(j.id) ?? { nama: j.nama, total: 0, catatan: 0 }
        r.total += subtotalBaris(b)
        r.catatan += berperiode && k.anggotaId ? b.jumlahPeriode : 1
        m.set(j.id, r)
      }
    return [...m.values()]
  })()
  const totalCatatan = rekapJenis.reduce((t, r) => t + r.catatan, 0)

  function simpan() {
    setGalat(null)
    if (kartu.length === 0) return setGalat({ pesan: 'Belum ada anggota yang ditambahkan. Tekan “Tambah anggota”.', field: 'kartu' })
    for (const k of kartu) {
      const nama = k.anggotaId ? anggotaMap.get(k.anggotaId)?.nama : 'kartu tanpa nama'
      if (k.baris.length === 0) return setGalat({ pesan: `${nama} belum punya baris jenis.`, field: 'kartu' })
      for (const b of k.baris) {
        if (!b.jenisId) return setGalat({ pesan: `Ada baris di ${nama} yang belum dipilih jenisnya.`, field: 'kartu' })
        if (!b.nominal) return setGalat({ pesan: `Nominal ${jenisMap.get(b.jenisId)?.nama} untuk ${nama} belum diisi.`, field: 'kartu' })
      }
    }
    mulai(async () => {
      const fd = new FormData()
      fd.set('tanggal', tanggal)
      if (penyetorId) fd.set('penyetorAnggotaId', String(penyetorId))
      fd.set('keterangan', keterangan)
      fd.set('metode', metode)
      if (bukti) fd.set('bukti', bukti)
      if (jenisUtamaId) fd.set('jenisUtamaId', String(jenisUtamaId))
      if (periodeUtamaTampil) fd.set('periodeUtama', periodeUtamaTampil)
      fd.set(
        'kartu',
        JSON.stringify(
          kartu.map((k) => ({
            anggotaId: k.anggotaId,
            baris: k.baris.map((b) => {
              const j = jenisMap.get(b.jenisId)!
              const ket = b.almarhum.length ? `Iuran duka alm. ${b.almarhum.join(', alm. ').replace(/, alm\. ([^,]*)$/, ' & alm. $1')}` : b.keterangan || null
              return { jenisId: b.jenisId, periode: b.periode, jumlahPeriode: b.jumlahPeriode, kelipatan: j.periode === 'bulanan' || j.periode === 'tahunan' ? 1 : b.kelipatan, nominal: b.nominal, keterangan: ket }
            }),
          })),
        ),
      )
      const hasil = await simpanSetoran(fd)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(`Setoran ${hasil.data.setoran.nomor} tersimpan: ${hasil.data.jumlahCatatan} catatan · ${formatRupiah(hasil.data.total)}`)
      router.push(`/catatan/setoran/${hasil.data.setoran.id}`)
      router.refresh()
    })
  }

  const rentangTeks = (b: Baris, j: Jenis) => {
    const awal = periodeUntuk(j.periode, tanggal, b.periode)
    if (!awal) return ''
    if (b.jumlahPeriode === 1) return formatPeriode(awal)
    const akhir = j.periode === 'bulanan' ? tambahBulan(awal, b.jumlahPeriode - 1) : String(Number(awal) + b.jumlahPeriode - 1)
    return `${formatPeriode(awal)} – ${formatPeriode(akhir)}`
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)
  const sudahDitambahkan = new Set(kartu.map((k) => k.anggotaId).filter((x): x is number => x != null))

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Kepala setoran */}
      <section className="flex flex-col gap-5 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <h2 className="text-judul-kartu font-semibold">1. Setoran</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tanggal">Tanggal setor</Label>
            <PilihTanggal id="tanggal" nilai={tanggal} maks={hariIni()} onUbah={setTanggal} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="penyetorAnggotaId" className="flex items-center gap-2">
              <HandCoins className="size-5 text-muted" /> Disetor oleh
            </Label>
            <PilihanModal<number>
              id="penyetorAnggotaId"
              nilai={penyetorId}
              onUbah={setPenyetorId}
              labelKosong="Bendahara (sendiri)"
              placeholder="Bendahara (sendiri)"
              placeholderCari="Ketik nama pengutip…"
              pilihan={daftarPenyetor.map((a) => ({ nilai: a.id, label: a.nama, keterangan: [a.pengutip ? 'pengutip' : null, a.nomor].filter(Boolean).join(' · ') || undefined, kelompok: a.pengutip ? 'Tim pengutip' : 'Anggota lain' }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cara bayar</Label>
            <PilihanGanda label="Cara Bayar" nilai={metode} onPilih={setMetode} pilihan={[{ nilai: 'tunai', label: 'Tunai', Ikon: Banknote }, { nilai: 'transfer', label: 'Transfer', Ikon: Landmark }]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Input
              id="keterangan"
              value={keterangan}
              onChange={(e) => {
                setKeterangan(e.target.value)
                setKetOtomatis(false)
              }}
              maxLength={200}
              placeholder="Contoh: Kutipan RT 03 minggu ke-2"
              aria-invalid={galat?.field === 'keterangan'}
            />
            {galatField('keterangan')}
          </div>
        </div>
        <details className="group">
          <summary className="flex min-h-sentuh cursor-pointer list-none items-center gap-2 text-label font-semibold text-primary [&::-webkit-details-marker]:hidden">
            <Plus className="size-5 transition-transform group-open:rotate-45" /> Foto bukti setoran (boleh dikosongkan)
          </summary>
          <div className="mt-2">
            <InputBukti onUbah={setBukti} />
          </div>
        </details>
      </section>

      {/* 2. Jenis utama — diisi sekali, dipakai untuk semua anggota yang ditambahkan */}
      <section className="flex flex-col gap-4 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <div>
          <h2 className="text-judul-kartu font-semibold">2. Jenis utama</h2>
          <p className="text-ket text-muted">Setiap anggota yang ditambahkan langsung mendapat baris ini. Jenis lain bisa ditambahkan per anggota di bawah.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1.3fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="jenisUtama">Jenis</Label>
            <PilihanModal<number>
              id="jenisUtama"
              nilai={jenisUtamaId}
              onUbah={setJenisUtamaId}
              pilihan={jenisMasuk.map((j) => ({ nilai: j.id, label: labelJenis(j), keterangan: j.keterangan ?? undefined }))}
              placeholder="Pilih jenis uang masuk…"
              placeholderCari="Ketik nama jenis…"
            />
          </div>
          {periodeJenisUtama && periodeUtamaTampil && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="periodeUtama">{periodeJenisUtama === 'bulanan' ? 'Untuk bulan' : 'Untuk tahun'}</Label>
              <PilihPeriode id="periodeUtama" jenisPeriode={periodeJenisUtama} nilai={periodeUtamaTampil} onUbah={setPeriodeUtama} />
            </div>
          )}
          {jenisUtama && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="nominalUtama">Nominal per anggota</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-form font-semibold text-muted">Rp</span>
                <input
                  id="nominalUtama"
                  inputMode="numeric"
                  value={nominalUtama ? formatAngka(nominalUtama) : ''}
                  onChange={(e) => setNominalUtama(parseRupiah(e.target.value) || null)}
                  readOnly={!!jenisUtama.nominalDikunci && jenisUtama.nominalBawaan != null}
                  placeholder="0"
                  className={cn('angka flex min-h-sentuh w-full rounded-input border border-border bg-surface pl-12 pr-4 text-form font-bold text-text', jenisUtama.nominalDikunci && 'bg-bg text-muted')}
                />
              </div>
              {kartu.length > 0 && (
                <Button variant="halus" className="w-fit" onClick={terapkanNominalKeSemua} disabled={nominalUtama == null}>
                  Terapkan ke semua baris {jenisUtama.nama}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3. Anggota yang bayar */}
      <section className="flex flex-col gap-4 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-judul-kartu font-semibold">
            3. Anggota yang bayar <span className="text-muted">({kartu.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setModal(true)} disabled={!jenisUtama} title={!jenisUtama ? 'Pilih jenis utama dulu' : undefined}>
              <UserPlus /> Tambah anggota
            </Button>
            <Button variant="sekunder" onClick={tambahKartuTanpaNama} disabled={!jenisUtama}>
              <Users /> Tanpa nama (gabungan)
            </Button>
          </div>
        </div>
        {!jenisUtama && <p className="text-isi text-muted">Pilih jenis utama dulu, lalu tekan “Tambah anggota”.</p>}
        {jenisUtama && kartu.length === 0 && <p className="text-isi text-muted">Belum ada anggota. Tekan “Tambah anggota” untuk mencentang siapa saja yang bayar — atau “Tanpa nama” bila hanya tahu totalnya.</p>}
        <ul className="flex flex-col gap-3">
          {kartu.map((k) => {
            const a = k.anggotaId ? anggotaMap.get(k.anggotaId) : undefined
            const subtotal = k.baris.reduce((t, b) => t + subtotalBaris(b), 0)
            return (
              <li key={k.kunci} className="rounded-input border border-border bg-bg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {a ? a.nama : 'Tanpa nama (gabungan)'}
                      {a?.nomor && <span className="angka ml-2 text-ket font-normal text-muted">{a.nomor}</span>}
                    </p>
                    <p className="angka text-ket text-muted">Subtotal {formatRupiah(subtotal)}</p>
                  </div>
                  <button type="button" onClick={() => hapusKartu(k.kunci)} className="flex size-10 shrink-0 items-center justify-center rounded-input text-muted hover:bg-keluar-soft hover:text-keluar" aria-label={`Hapus ${a ? a.nama : 'kartu tanpa nama'}`}>
                    <X className="size-5" />
                  </button>
                </div>
                <ul className="mt-2 flex flex-col gap-2">
                  {k.baris.map((b) => {
                    const j = jenisMap.get(b.jenisId)
                    const berperiode = j?.periode === 'bulanan' || j?.periode === 'tahunan'
                    const iuranDuka = j?.kode === 'PM12'
                    const terkunci = !!j?.nominalDikunci && j.nominalBawaan != null
                    return (
                      <li key={b.kunci} className="flex flex-col gap-2 rounded-input border border-border bg-surface p-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="min-w-0 flex-1 sm:min-w-56">
                          <PilihanModal<number>
                            label="Jenis"
                            nilai={b.jenisId || null}
                            onUbah={(v) => {
                              const jb = v ? jenisMap.get(v) : undefined
                              ubahBaris(k.kunci, b.kunci, { jenisId: v ?? 0, nominal: jb?.nominalBawaan ?? null, periode: null, jumlahPeriode: 1, kelipatan: 1, almarhum: [] })
                            }}
                            pilihan={jenisMasuk.map((x) => ({ nilai: x.id, label: labelJenis(x) }))}
                            placeholder="Pilih jenis…"
                            placeholderCari="Ketik nama jenis…"
                            className="min-h-10"
                          />
                          {j && berperiode && <p className="angka mt-1 text-ket text-muted">{a ? rentangTeks(b, j) : `${formatPeriode(periodeUntuk(j.periode, tanggal, b.periode) ?? '')}${b.jumlahPeriode > 1 ? ` · ${b.jumlahPeriode} orang` : ''}`}</p>}
                          {iuranDuka && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {b.almarhum.map((n) => (
                                <span key={n} className="inline-flex items-center gap-1 rounded-badge bg-keluar-soft px-2 py-0.5 text-ket text-keluar">
                                  alm. {n}
                                  <button type="button" aria-label={`Hapus ${n}`} onClick={() => ubahBaris(k.kunci, b.kunci, { almarhum: b.almarhum.filter((x) => x !== n), kelipatan: Math.max(1, b.almarhum.length - 1) })}>
                                    <X className="size-3" />
                                  </button>
                                </span>
                              ))}
                              <PilihanModal<string>
                                label="Tambah almarhum"
                                nilai={null}
                                onUbah={(v) => v && !b.almarhum.includes(v) && ubahBaris(k.kunci, b.kunci, { almarhum: [...b.almarhum, v], kelipatan: b.almarhum.length + 1 })}
                                pilihan={almarhum.filter((x) => !b.almarhum.includes(x.nama)).map((x) => ({ nilai: x.nama, label: x.label }))}
                                placeholder="+ almarhum (boleh dikosongkan)"
                                placeholderCari="Ketik nama almarhum…"
                                className="min-h-9 w-auto text-ket"
                              />
                            </div>
                          )}
                        </div>
                        {j && berperiode && (
                          <label className="flex items-center gap-2 text-ket text-muted">
                            {a ? (j.periode === 'bulanan' ? 'bulan' : 'tahun') : 'orang'}
                            <input type="number" min={1} max={60} value={b.jumlahPeriode} onChange={(e) => ubahBaris(k.kunci, b.kunci, { jumlahPeriode: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} className="angka h-10 w-16 rounded-input border border-border bg-surface px-2 text-center text-isi text-text" aria-label={`Jumlah ${j.periode === 'bulanan' ? 'bulan' : 'tahun'}`} />
                          </label>
                        )}
                        {j && !berperiode && (
                          <label className="flex items-center gap-2 text-ket text-muted">
                            ×
                            <input type="number" min={1} max={60} value={b.kelipatan} onChange={(e) => ubahBaris(k.kunci, b.kunci, { kelipatan: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} className="angka h-10 w-14 rounded-input border border-border bg-surface px-2 text-center text-isi text-text" aria-label={iuranDuka ? 'Jumlah almarhum' : 'Kelipatan'} />
                          </label>
                        )}
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ket text-muted">Rp</span>
                          <input inputMode="numeric" value={b.nominal ? formatAngka(b.nominal) : ''} onChange={(e) => ubahBaris(k.kunci, b.kunci, { nominal: parseRupiah(e.target.value) || null })} readOnly={terkunci} placeholder="0" aria-label="Nominal" className={cn('angka h-10 w-36 rounded-input border border-border bg-surface pl-9 pr-2 text-right text-isi text-text', terkunci && 'bg-bg text-muted')} />
                        </div>
                        <span className="angka w-28 text-right text-ket text-muted">= {formatRupiah(subtotalBaris(b))}</span>
                        <button type="button" onClick={() => hapusBaris(k.kunci, b.kunci)} className="flex size-10 items-center justify-center rounded-input text-muted hover:bg-keluar-soft hover:text-keluar" aria-label="Hapus baris">
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <Button variant="halus" className="mt-2" onClick={() => tambahBaris(k.kunci)}>
                  <Plus /> Tambah jenis lain
                </Button>
              </li>
            )
          })}
        </ul>
        {galatField('kartu')}
      </section>

      {/* Ringkasan */}
      <section className="sticky bottom-20 z-10 rounded-kartu border border-primary bg-surface p-4 shadow-kartu sm:p-6 md:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-isi text-muted">
              {kartu.length} anggota · {totalCatatan} catatan
            </p>
            {rekapJenis.length > 1 && (
              <p className="angka text-ket text-muted">{rekapJenis.map((r) => `${r.nama} ${formatRupiah(r.total)}`).join(' · ')}</p>
            )}
            <p className="angka text-judul font-bold">{formatRupiah(total)}</p>
            <p className="text-ket text-muted">{total > 0 ? terbilangRupiah(total) : ''}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="halus" ukuran="aksi" onClick={() => router.back()} disabled={sedangKirim}>
              Batal
            </Button>
            <Button ukuran="aksi" onClick={simpan} disabled={sedangKirim || kartu.length === 0}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan Setoran'}
            </Button>
          </div>
        </div>
        {galat && !['kartu', 'keterangan'].includes(galat.field ?? '') && <PesanGalat className="mt-2">{galat.pesan}</PesanGalat>}
      </section>

      <ModalPilihAnggota
        terbuka={modal}
        onTutup={() => setModal(false)}
        daftar={daftarAnggota}
        sudahDitambahkan={sudahDitambahkan}
        sudahBayar={sudahBayar}
        labelSudahBayar={periodeUtamaTampil ? formatPeriode(periodeUtamaTampil) : jenisUtama?.nama ?? ''}
        onTambah={tambahAnggota}
      />
    </div>
  )
}
