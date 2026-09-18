'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Banknote, CheckSquare, HandCoins, Landmark, Search, Square } from 'lucide-react'
import { cekSudahBayar, simpanSetoran } from '@/server/actions/setoran'
import type { Jenis } from '@/server/db/schema'
import type { AnggotaUntukForm } from '@/server/queries/transaksi'
import { formatRupiah, formatAngka, parseRupiah, terbilangRupiah } from '@/lib/rupiah'
import { formatPeriode, hariIni, periodeUntuk, tambahBulan } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { PilihPeriode } from '@/components/ui/pilih-periode'
import { InputBukti } from '@/components/keuangan/InputBukti'
import { labelJenis } from '@/components/keuangan/FormCatatan'
import { cn } from '@/lib/utils'

type BarisState = { jumlahPeriode: number; nominal: number | null }

/**
 * Catat iuran kolektif: satu kepala setoran + daftar centang anggota. Anggota yang sudah
 * membayar periode itu tampil abu-abu dengan nomor buktinya. Baris boleh membayar beberapa
 * periode sekaligus ("berapa bulan") — sistem membuat satu catatan per periode.
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
  /** Anggota/tanggungan yang meninggal — untuk keterangan Iuran Duka */
  almarhum: Array<{ label: string; nama: string }>
}) {
  const router = useRouter()
  const [jenisId, setJenisId] = React.useState<number | null>(null)
  const [tanggal, setTanggal] = React.useState(hariIni())
  const [periode, setPeriode] = React.useState<string | null>(null)
  const [penyetorId, setPenyetorId] = React.useState<number | null>(null)
  const [metode, setMetode] = React.useState<'tunai' | 'transfer'>('tunai')
  const [keterangan, setKeterangan] = React.useState('')
  const [ketOtomatis, setKetOtomatis] = React.useState(true)
  const [almarhumDipilih, setAlmarhumDipilih] = React.useState<string | null>(null)
  const [bukti, setBukti] = React.useState<File | null | undefined>(undefined)
  const [cari, setCari] = React.useState('')
  const [dipilih, setDipilih] = React.useState<Map<number, BarisState>>(new Map())
  const [sudahBayar, setSudahBayar] = React.useState<Record<number, string>>({})
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  const jenis = daftarJenis.find((j) => j.id === jenisId)
  const jenisPeriode = jenis?.periode === 'bulanan' || jenis?.periode === 'tahunan' ? jenis.periode : null
  const periodeTampil = jenisPeriode ? periodeUntuk(jenisPeriode, tanggal, periode) : null
  const nominalBawaan = jenis?.nominalBawaan ?? null
  const terkunci = !!jenis?.nominalDikunci && nominalBawaan != null
  const iuranDuka = jenis?.kode === 'PM12'

  // Ganti jenis: keterangan otomatis, reset pilihan & nominal
  React.useEffect(() => {
    if (!jenis) return
    if (ketOtomatis) setKeterangan(jenis.nama)
    setPeriode(null)
    setAlmarhumDipilih(null)
    setDipilih(new Map())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenisId])

  // Siapa yang sudah bayar periode ini
  React.useEffect(() => {
    if (!jenisId) return
    let batal = false
    cekSudahBayar(jenisId, periodeTampil).then((h) => {
      if (!batal) setSudahBayar(h.ok ? (h.data as Record<number, string>) : {})
    })
    return () => {
      batal = true
    }
  }, [jenisId, periodeTampil])

  const tampil = daftarAnggota.filter((a) => {
    const c = cari.trim().toLowerCase()
    return !c || a.nama.toLowerCase().includes(c) || (a.nomor ?? '').toLowerCase().includes(c)
  })

  function toggle(a: AnggotaUntukForm) {
    setDipilih((m) => {
      const baru = new Map(m)
      if (baru.has(a.id)) baru.delete(a.id)
      else baru.set(a.id, { jumlahPeriode: 1, nominal: nominalBawaan })
      return baru
    })
  }
  function centangSemuaTampil(pilih: boolean) {
    setDipilih((m) => {
      const baru = new Map(m)
      for (const a of tampil) {
        if (pilih && !sudahBayar[a.id]) baru.set(a.id, baru.get(a.id) ?? { jumlahPeriode: 1, nominal: nominalBawaan })
        if (!pilih) baru.delete(a.id)
      }
      return baru
    })
  }
  function ubahBaris(id: number, perubahan: Partial<BarisState>) {
    setDipilih((m) => {
      const baru = new Map(m)
      const lama = baru.get(id)
      if (lama) baru.set(id, { ...lama, ...perubahan })
      return baru
    })
  }

  const baris = [...dipilih.entries()].map(([id, b]) => ({ id, ...b, anggota: daftarAnggota.find((a) => a.id === id)! }))
  const total = baris.reduce((t, b) => t + (b.nominal ?? 0) * b.jumlahPeriode, 0)
  const totalCatatan = baris.reduce((t, b) => t + b.jumlahPeriode, 0)

  function rentangPeriodeTeks(n: number) {
    if (!periodeTampil || !jenisPeriode) return ''
    if (n === 1) return formatPeriode(periodeTampil)
    const akhir = jenisPeriode === 'bulanan' ? tambahBulan(periodeTampil, n - 1) : String(Number(periodeTampil) + n - 1)
    return `${formatPeriode(periodeTampil)} – ${formatPeriode(akhir)}`
  }

  function simpan() {
    setGalat(null)
    if (!jenisId) return setGalat({ pesan: 'Pilih dulu jenis iurannya.', field: 'jenisId' })
    if (baris.length === 0) return setGalat({ pesan: 'Belum ada anggota yang dicentang.', field: 'baris' })
    const kosong = baris.find((b) => !b.nominal)
    if (kosong) return setGalat({ pesan: `Nominal untuk ${kosong.anggota.nama} belum diisi.`, field: 'baris' })
    mulai(async () => {
      const fd = new FormData()
      fd.set('jenisId', String(jenisId))
      fd.set('tanggal', tanggal)
      if (periodeTampil) fd.set('periode', periodeTampil)
      if (penyetorId) fd.set('penyetorAnggotaId', String(penyetorId))
      fd.set('keterangan', keterangan)
      fd.set('metode', metode)
      if (bukti) fd.set('bukti', bukti)
      fd.set('baris', JSON.stringify(baris.map((b) => ({ anggotaId: b.id, jumlahPeriode: b.jumlahPeriode, nominal: b.nominal }))))
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

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <h2 className="text-judul-kartu font-semibold">Setoran</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jenisId">Jenis iuran</Label>
          <PilihanCari<number>
            id="jenisId"
            nilai={jenisId}
            onUbah={setJenisId}
            pilihan={daftarJenis.filter((j) => j.arah === 'masuk').map((j) => ({ nilai: j.id, label: labelJenis(j), keterangan: j.keterangan ?? undefined }))}
            placeholder="Pilih jenis uang masuk…"
            placeholderCari="Ketik nama jenis…"
            galat={galat?.field === 'jenisId'}
          />
          {galatField('jenisId')}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tanggal">Tanggal setor</Label>
            <PilihTanggal id="tanggal" nilai={tanggal} maks={hariIni()} onUbah={setTanggal} />
          </div>
          {jenisPeriode && periodeTampil && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="periode">{jenisPeriode === 'bulanan' ? 'Untuk bulan' : 'Untuk tahun'} (awal)</Label>
              <PilihPeriode id="periode" jenisPeriode={jenisPeriode} nilai={periodeTampil} onUbah={setPeriode} />
            </div>
          )}
        </div>
        {iuranDuka && almarhum.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="almarhum">Untuk almarhum <span className="font-normal text-muted">(boleh dikosongkan)</span></Label>
            <PilihanCari<string>
              id="almarhum"
              nilai={almarhumDipilih}
              onUbah={(v) => {
                setAlmarhumDipilih(v)
                if (v) {
                  setKeterangan(`Iuran duka alm. ${v}`)
                  setKetOtomatis(false)
                } else {
                  setKeterangan(jenis?.nama ?? '')
                  setKetOtomatis(true)
                }
              }}
              pilihan={almarhum.map((a) => ({ nilai: a.nama, label: a.label }))}
              labelKosong="Tidak dikaitkan (tulis di keterangan)"
              placeholder="Pilih almarhum untuk mengisi keterangan…"
              placeholderCari="Ketik nama almarhum…"
            />
            <p className="text-ket text-muted">Setoran gabungan beberapa almarhum: tulis saja di keterangan, mis. “Iuran duka alm. Ani & alm. Sumi”.</p>
          </div>
        )}
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
            aria-invalid={galat?.field === 'keterangan'}
          />
          {galatField('keterangan')}
          <p className="text-ket text-muted">Dipakai di setiap catatan anggota{jenisPeriode ? ', ditambah nama periodenya' : ''}.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="penyetorAnggotaId" className="flex items-center gap-2">
              <HandCoins className="size-5 text-muted" /> Disetor oleh
            </Label>
            <PilihanCari<number>
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
            <Label>Cara Bayar</Label>
            <PilihanGanda
              label="Cara Bayar"
              nilai={metode}
              onPilih={setMetode}
              pilihan={[
                { nilai: 'tunai', label: 'Tunai', Ikon: Banknote },
                { nilai: 'transfer', label: 'Transfer', Ikon: Landmark },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Foto bukti setoran <span className="font-normal text-muted">(boleh dikosongkan)</span></Label>
          <InputBukti onUbah={setBukti} />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-judul-kartu font-semibold">
            Anggota yang bayar <span className="text-muted">({dipilih.size} dicentang)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="sekunder" className="whitespace-normal text-left" onClick={() => centangSemuaTampil(true)} disabled={!jenis}>
              <CheckSquare /> Centang semua yang tampil
            </Button>
            <Button variant="halus" onClick={() => centangSemuaTampil(false)} disabled={dipilih.size === 0}>
              <Square /> Kosongkan
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input aria-label="Cari anggota" placeholder="Cari nama atau nomor anggota…" className="pl-12" value={cari} onChange={(e) => setCari(e.target.value)} autoComplete="off" />
        </div>
        {!jenis && <p className="text-isi text-muted">Pilih jenis iuran dulu, lalu centang anggota yang membayar.</p>}
        {jenis && (
          <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-input border border-border">
            {tampil.map((a) => {
              const b = dipilih.get(a.id)
              const bayar = sudahBayar[a.id]
              return (
                <li key={a.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2', bayar && !b && 'bg-bg opacity-70')}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!b}
                    aria-label={`Centang ${a.nama}`}
                    onClick={() => toggle(a)}
                    className={cn('flex size-sentuh shrink-0 items-center justify-center rounded-input', b ? 'text-primary' : 'text-muted')}
                  >
                    {b ? <CheckSquare className="size-7" /> : <Square className="size-7" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {a.nama}
                      {a.nomor && <span className="angka ml-2 text-ket text-muted">{a.nomor}</span>}
                    </p>
                    {bayar && (
                      <p className="text-ket text-warning">
                        Sudah bayar {periodeTampil ? formatPeriode(periodeTampil) : ''} · {bayar}
                      </p>
                    )}
                  </div>
                  {b && (
                    <div className="flex flex-wrap items-center gap-2">
                      {jenisPeriode && (
                        <label className="flex items-center gap-2 text-ket text-muted">
                          {jenisPeriode === 'bulanan' ? 'bulan' : 'tahun'}
                          <input
                            type="number"
                            min={1}
                            max={36}
                            value={b.jumlahPeriode}
                            onChange={(e) => ubahBaris(a.id, { jumlahPeriode: Math.max(1, Math.min(36, Number(e.target.value) || 1)) })}
                            className="angka h-10 w-16 rounded-input border border-border bg-surface px-2 text-center text-isi text-text"
                            aria-label={`Jumlah ${jenisPeriode === 'bulanan' ? 'bulan' : 'tahun'} ${a.nama}`}
                          />
                        </label>
                      )}
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ket text-muted">Rp</span>
                        <input
                          inputMode="numeric"
                          value={b.nominal ? formatAngka(b.nominal) : ''}
                          onChange={(e) => ubahBaris(a.id, { nominal: parseRupiah(e.target.value) || null })}
                          readOnly={terkunci}
                          placeholder="0"
                          aria-label={`Nominal ${a.nama}`}
                          className={cn('angka h-10 w-36 rounded-input border border-border bg-surface pl-9 pr-2 text-right text-isi text-text', terkunci && 'bg-bg text-muted')}
                        />
                      </div>
                      {b.jumlahPeriode > 1 && b.nominal && <span className="angka text-ket text-muted">= {formatRupiah(b.nominal * b.jumlahPeriode)}</span>}
                    </div>
                  )}
                </li>
              )
            })}
            {tampil.length === 0 && <li className="px-3 py-4 text-isi text-muted">Tidak ada anggota yang cocok.</li>}
          </ul>
        )}
        {galatField('baris')}
      </section>

      <section className="sticky bottom-20 z-10 rounded-kartu border border-primary bg-surface p-4 shadow-kartu sm:p-6 md:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-isi text-muted">
              {dipilih.size} anggota · {totalCatatan} catatan{periodeTampil && baris.length > 0 && baris.every((b) => b.jumlahPeriode === baris[0].jumlahPeriode) ? ` · ${rentangPeriodeTeks(baris[0].jumlahPeriode)}` : ''}
            </p>
            <p className="angka text-judul font-bold">{formatRupiah(total)}</p>
            <p className="text-ket text-muted">{total > 0 ? terbilangRupiah(total) : ''}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="halus" ukuran="aksi" onClick={() => router.back()} disabled={sedangKirim}>
              Batal
            </Button>
            <Button ukuran="aksi" onClick={simpan} disabled={sedangKirim || dipilih.size === 0}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan Setoran'}
            </Button>
          </div>
        </div>
        {galat && !['jenisId', 'baris', 'keterangan'].includes(galat.field ?? '') && <PesanGalat className="mt-2">{galat.pesan}</PesanGalat>}
      </section>
    </div>
  )
}
