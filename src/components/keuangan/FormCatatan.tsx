'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, Landmark, HeartCrack, HandCoins, Info } from 'lucide-react'
import Link from 'next/link'
import { simpanCatatan, ubahCatatan, type HasilSimpanCatatan } from '@/server/actions/transaksi'
import type { Jenis, Transaksi } from '@/server/db/schema'
import type { AnggotaUntukForm } from '@/server/queries/transaksi'
import { skemaJumlah, skemaTanggal } from '@/lib/validasi'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalLengkap, hariIni } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PilihanModal } from '@/components/ui/pilihan-modal'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { PilihPeriode } from '@/components/ui/pilih-periode'
import { bulanDari, periodeUntuk } from '@/lib/tanggal'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { InputRupiah } from './InputRupiah'
import { InputBukti } from './InputBukti'

// Skema sisi klien (kenyamanan). Yang menentukan tetap validasi di server.
const skemaForm = z.object({
  arah: z.enum(['masuk', 'keluar'], { error: 'Pilih dulu Uang Masuk atau Uang Keluar.' }),
  tanggal: skemaTanggal,
  jenisId: z.number({ error: 'Pilih dulu untuk apa uang ini.' }).int().positive('Pilih dulu untuk apa uang ini.'),
  keterangan: z.string().trim().min(3, 'Keterangan belum diisi. Tulis singkat untuk apa uang ini.').max(255, 'Keterangan terlalu panjang. Maksimal 255 huruf.'),
  pihak: z.string().trim().max(120, 'Nama terlalu panjang. Maksimal 120 huruf.'),
  jumlah: skemaJumlah,
  metode: z.enum(['tunai', 'transfer'], { error: 'Pilih cara pembayarannya.' }),
})
type NilaiForm = z.infer<typeof skemaForm>


/** Label opsi jenis (Spec 2 §B6): nama · Rp X / bulan */
export function labelJenis(j: Pick<Jenis, 'nama' | 'nominalBawaan' | 'periode'>): string {
  let l = j.nama
  if (j.nominalBawaan != null) l += ` · ${formatRupiah(j.nominalBawaan)}`
  if (j.periode === 'bulanan') l += ' / bulan'
  if (j.periode === 'tahunan') l += ' / tahun'
  return l
}

export function FormCatatan({
  daftarJenis,
  daftarAnggota,
  daftarPenyetor,
  awal,
  arahAwal,
  kodeJenisAwal,
  anggotaIdAwal,
}: {
  daftarJenis: Jenis[]
  daftarAnggota: AnggotaUntukForm[]
  /** Pilihan "Disetor oleh": anggota aktif, pengutip paling atas */
  daftarPenyetor: Array<{ id: number; nama: string; nomor: string | null; pengutip: boolean }>
  /** Catatan yang diubah; kosong berarti catatan baru */
  awal?: Transaksi & { namaPihak: string | null }
  arahAwal?: 'masuk' | 'keluar'
  /** Dari ?tipe=PM11 (Spec 2 §C2) */
  kodeJenisAwal?: string
  /** Dari ?anggota=<id> */
  anggotaIdAwal?: number
}) {
  const router = useRouter()
  const modeUbah = !!awal
  const [sedangKirim, setSedangKirim] = React.useState(false)
  const [bukti, setBukti] = React.useState<File | null | undefined>(undefined)
  const [konfirmasi, setKonfirmasi] = React.useState<{ mirip: Array<{ noBukti: string; keterangan: string; tanggal: string }>; kalimat: string } | null>(null)
  const [galatUmum, setGalatUmum] = React.useState<string | null>(null)

  const tanggalAwal = awal?.tanggal ?? hariIni()

  const jenisAwalDariKode = kodeJenisAwal ? daftarJenis.find((j) => j.kode === kodeJenisAwal && j.aktif) : undefined
  const anggotaAwal = anggotaIdAwal ? daftarAnggota.find((a) => a.id === anggotaIdAwal) : undefined
  const [anggotaKeluargaId, setAnggotaKeluargaId] = React.useState<number | null>(awal?.anggotaKeluargaId ?? null)
  const [penyetorId, setPenyetorId] = React.useState<number | null>(awal?.penyetorAnggotaId ?? null)
  const [periode, setPeriode] = React.useState<string | null>(awal?.periode ?? null)

  const form = useForm<NilaiForm>({
    resolver: zodResolver(skemaForm),
    defaultValues: {
      arah: awal?.arah ?? jenisAwalDariKode?.arah ?? arahAwal,
      tanggal: tanggalAwal,
      jenisId: awal?.jenisId ?? jenisAwalDariKode?.id,
      keterangan: awal?.keterangan ?? (jenisAwalDariKode ? jenisAwalDariKode.nama : ''),
      pihak: awal?.namaPihak ?? anggotaAwal?.nama ?? '',
      jumlah: awal?.jumlah ?? jenisAwalDariKode?.nominalBawaan ?? undefined,
      metode: awal?.metode ?? 'tunai',
    },
  })
  const { register, control, handleSubmit, watch, setValue, getValues, setError, formState } = form
  const arah = watch('arah')
  const jenisId = watch('jenisId')
  const pihak = watch('pihak')
  const jenisTersedia = daftarJenis.filter((j) => j.arah === arah)
  const jenisTerpilih = daftarJenis.find((j) => j.id === jenisId)
  const anggotaTerpilih = daftarAnggota.find((a) => a.nama.toLowerCase() === pihak.trim().toLowerCase())
  const nominalTerkunci = !!jenisTerpilih?.nominalDikunci && jenisTerpilih.nominalBawaan != null
  // Tanpa nama = uang gabungan banyak orang: jumlahnya boleh diisi total (kelipatan nominal bila terkunci)
  const tanpaNama = !pihak.trim()
  const jumlahSekarang = watch('jumlah')
  const petunjukJumlah = (() => {
    const nominal = jenisTerpilih?.nominalBawaan
    if (nominalTerkunci && nominal != null) {
      if (!tanpaNama) return 'Nominal ditetapkan pengurus. Ubah di Pengaturan › Jenis Uang bila memang berubah.'
      const orang = jumlahSekarang && jumlahSekarang > nominal && jumlahSekarang % nominal === 0 ? jumlahSekarang / nominal : null
      return `Nominal per orang ${formatRupiah(nominal)}. Tanpa nama anggota, isi jumlah keseluruhan yang diterima — kelipatan ${formatRupiah(nominal)}${orang ? ` (sekarang = ${orang} orang)` : `, mis. 12 orang = ${formatRupiah(nominal * 12)}`}.`
    }
    if (nominal != null) return `Terisi otomatis dari nominal jenis ini${tanpaNama && arah === 'masuk' ? ' (per orang)' : ''}; boleh diubah. ${tanpaNama && arah === 'masuk' ? 'Dari banyak anggota? Isi jumlah keseluruhannya.' : ''}`.trim()
    return arah === 'masuk' ? 'Jumlah keseluruhan yang benar-benar diterima, dalam rupiah penuh.' : 'Jumlah keseluruhan yang benar-benar dikeluarkan, dalam rupiah penuh.'
  })()
  const tanggal = watch('tanggal')
  const jenisPeriode = jenisTerpilih?.periode === 'bulanan' || jenisTerpilih?.periode === 'tahunan' ? jenisTerpilih.periode : null
  // Periode yang dibayar: bawaan mengikuti tanggal; direset saat jenis berganti
  const periodeTampil = jenisPeriode ? periodeUntuk(jenisPeriode, tanggal || bulanDari(hariIni()) + '-01', periode) : null

  // Jenis harus sesuai arah: ganti arah → kosongkan pilihan yang tidak lagi cocok
  React.useEffect(() => {
    if (jenisId && !jenisTersedia.some((j) => j.id === jenisId)) setValue('jenisId', undefined as unknown as number)
  }, [arah, jenisId, jenisTersedia, setValue])

  // Prefill nominal (Spec 2 §B4): jenis berganti → jumlah diisi ulang dari jenis baru
  const jenisSebelumnya = React.useRef<number | undefined>(jenisId)
  React.useEffect(() => {
    if (jenisSebelumnya.current === jenisId) return
    jenisSebelumnya.current = jenisId
    const j = daftarJenis.find((x) => x.id === jenisId)
    if (j?.nominalBawaan != null) setValue('jumlah', j.nominalBawaan, { shouldValidate: true })
    else if (j) setValue('jumlah', undefined as unknown as number)
    // Keterangan bawaan = nama jenis; hanya diganti bila masih kosong atau masih berupa nama jenis lama
    if (j) {
      const sekarang = getValues('keterangan').trim()
      const namaJenisLama = daftarJenis.map((x) => x.nama)
      if (!sekarang || namaJenisLama.includes(sekarang)) setValue('keterangan', j.nama, { shouldValidate: !!sekarang })
    }
    setAnggotaKeluargaId(null) // tanggungan milik jenis/anggota lama tidak boleh terbawa (Spec 2 §A5)
    setPeriode(null)
  }, [jenisId, daftarJenis, setValue, getValues])
  const anggotaSebelumnya = React.useRef<number | undefined>(anggotaTerpilih?.id)
  React.useEffect(() => {
    if (anggotaSebelumnya.current === anggotaTerpilih?.id) return
    anggotaSebelumnya.current = anggotaTerpilih?.id
    setAnggotaKeluargaId(null)
  }, [anggotaTerpilih?.id])

  // Siapa yang meninggal (Spec 2 §A5): hanya bila jenis penanda + anggota terdaftar
  const tampilkanMeninggal = !!jenisTerpilih?.menandaiMeninggal && !!anggotaTerpilih
  const sasaran = tampilkanMeninggal
    ? anggotaKeluargaId
      ? anggotaTerpilih!.keluarga.find((k) => k.id === anggotaKeluargaId)
      : { nama: anggotaTerpilih!.nama, status: anggotaTerpilih!.status }
    : undefined


  async function kirim(nilai: NilaiForm, abaikanDuplikat = false) {
    setSedangKirim(true)
    setGalatUmum(null)
    try {
      const fd = new FormData()
      fd.set('arah', nilai.arah)
      fd.set('tanggal', nilai.tanggal)
      fd.set('jenisId', String(nilai.jenisId))
      fd.set('keterangan', nilai.keterangan)
      fd.set('jumlah', String(nilai.jumlah))
      fd.set('metode', nilai.metode)
      // Nama bebas atau anggota terdaftar: bila persis sama dengan nama anggota, pakai id-nya
      const pihak = nilai.pihak.trim()
      const cocok = daftarAnggota.find((a) => a.nama.toLowerCase() === pihak.toLowerCase())
      if (pihak) fd.set('namaPihak', cocok ? cocok.nama : pihak)
      if (cocok) fd.set('anggotaId', String(cocok.id))
      if (cocok && anggotaKeluargaId && jenisTerpilih?.menandaiMeninggal) fd.set('anggotaKeluargaId', String(anggotaKeluargaId))
      if (penyetorId) fd.set('penyetorAnggotaId', String(penyetorId))
      if (jenisPeriode && periodeTampil) fd.set('periode', periodeTampil)
      if (bukti) fd.set('bukti', bukti)
      if (bukti === null) fd.set('hapusBukti', '1')
      if (abaikanDuplikat) fd.set('abaikanDuplikat', '1')

      const hasil = modeUbah ? await ubahCatatan(awal!.id, fd) : await simpanCatatan(fd)
      if (!hasil.ok) {
        const field = hasil.field as keyof NilaiForm | undefined
        if (field && field in nilai) setError(field, { message: hasil.pesan })
        else setGalatUmum(hasil.pesan)
        return
      }
      const data: HasilSimpanCatatan = hasil.data
      if (data.perluKonfirmasi) {
        setKonfirmasi({ mirip: data.mirip, kalimat: data.kalimat })
        return
      }
      toast.success(`${modeUbah ? 'Perubahan tersimpan' : 'Tersimpan'}. ${data.catatan.noBukti} · ${formatRupiah(data.catatan.jumlah)}`)
      router.push('/catatan')
      router.refresh()
    } finally {
      setSedangKirim(false)
    }
  }

  const g = formState.errors

  // Bilah atas lengket: tombol Uang Masuk/Keluar selalu terlihat; tanggal terpilih ikut tampil
  // (teks saja) begitu kalender tergulung ke atas, supaya tidak perlu gulir balik untuk memastikan
  const wadahKalender = React.useRef<HTMLDivElement>(null)
  const [kalenderTerlihat, setKalenderTerlihat] = React.useState(true)
  React.useEffect(() => {
    const el = wadahKalender.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const ob = new IntersectionObserver(([e]) => setKalenderTerlihat(e.isIntersecting), { rootMargin: '-120px 0px 0px 0px', threshold: 0 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return (
    <form onSubmit={handleSubmit((v) => kirim(v))} noValidate className="flex flex-col gap-5">
      {/* 1. Jenis (arah) — lengket di bawah header */}
      <div className="sticky top-16 z-10 -mx-4 -mt-4 flex flex-col gap-2 border-b-2 border-border bg-surface px-4 pb-3 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Label>Jenis</Label>
          {!kalenderTerlihat && tanggal && (
            <span className="angka inline-flex items-center gap-2 rounded-badge bg-primary-soft px-3 py-1 text-ket font-semibold text-primary">
              <CalendarDays className="size-4" /> {formatTanggalLengkap(tanggal)}
            </span>
          )}
        </div>
        <Controller
          control={control}
          name="arah"
          render={({ field }) => (
            <PilihanGanda
              label="Jenis"
              warnaArah
              nilai={field.value ?? null}
              onPilih={field.onChange}
              nonaktif={modeUbah}
              pilihan={[
                { nilai: 'masuk', label: 'Uang Masuk', Ikon: ArrowDownLeft },
                { nilai: 'keluar', label: 'Uang Keluar', Ikon: ArrowUpRight },
              ]}
            />
          )}
        />
        {modeUbah && <p className="text-ket text-muted">Jenis tidak bisa diubah karena nomor bukti sudah terbit. Bila salah, hapus lalu buat catatan baru.</p>}
        <PesanGalat>{g.arah?.message}</PesanGalat>
      </div>

      {/* 2. Tanggal — kalender langsung terlihat, sudah menunjuk hari ini; tanpa popover */}
      <div className="flex flex-col gap-2" ref={wadahKalender}>
        <Label htmlFor="tanggal">Tanggal</Label>
        <Controller
          control={control}
          name="tanggal"
          render={({ field }) => <PilihTanggal inline id="tanggal" nilai={field.value} onUbah={field.onChange} maks={hariIni()} galat={!!g.tanggal} />}
        />
        <PesanGalat>{g.tanggal?.message}</PesanGalat>
      </div>

      {/* 3. Untuk apa */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="jenisId">Untuk apa uangnya?</Label>
        <Controller
          control={control}
          name="jenisId"
          render={({ field }) => (
            <PilihanModal
              id="jenisId"
              judul="Untuk apa uangnya?"
              nilai={field.value ?? null}
              onUbah={(v) => field.onChange(v ?? undefined)}
              pilihan={jenisTersedia.map((j) => ({ nilai: j.id, label: labelJenis(j), keterangan: j.keterangan ?? undefined }))}
              placeholder={arah ? 'Pilih dari daftar…' : 'Pilih dulu Uang Masuk atau Uang Keluar'}
              placeholderCari="Ketik nama jenis…"
              galat={!!g.jenisId}
              nonaktif={!arah}
            />
          )}
        />
        <PesanGalat>{g.jenisId?.message}</PesanGalat>
      </div>

      {/* 3b. Periode yang dibayar (jenis bulanan/tahunan) */}
      {jenisPeriode && periodeTampil && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="periode">{jenisPeriode === 'bulanan' ? 'Untuk bulan' : 'Untuk tahun'}</Label>
          <PilihPeriode id="periode" jenisPeriode={jenisPeriode} nilai={periodeTampil} onUbah={setPeriode} />
          <p className="text-ket text-muted">Bawaan mengikuti tanggal catatan. Ubah bila membayar untuk {jenisPeriode === 'bulanan' ? 'bulan' : 'tahun'} lain.</p>
        </div>
      )}

      {/* 4. Keterangan */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" placeholder="Contoh: Iuran wajib Januari 2026" maxLength={255} {...register('keterangan')} aria-invalid={!!g.keterangan} />
        <PesanGalat>{g.keterangan?.message}</PesanGalat>
      </div>

      {/* 5. Dari / Untuk siapa */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pihak">
          {arah === 'keluar' ? 'Untuk siapa' : 'Dari anggota'} <span className="font-normal text-muted">(boleh kosong)</span>
        </Label>
        <Controller
          control={control}
          name="pihak"
          render={({ field }) => (
            <PilihanModal<string>
              id="pihak"
              judul={arah === 'keluar' ? 'Untuk siapa' : 'Dari anggota'}
              nilai={field.value || null}
              onUbah={(v) => field.onChange(v ?? '')}
              pilihan={daftarAnggota.map((a) => ({ nilai: a.nama, label: a.nama, keterangan: [a.nomor, a.status === 'meninggal' ? 'meninggal dunia' : null].filter(Boolean).join(' · ') || undefined }))}
              placeholder="Pilih anggota atau ketik nama"
              placeholderCari="Ketik nama anggota atau nama bebas…"
              labelKosong="Tanpa nama"
              bolehBebas
            />
          )}
        />
        <PesanGalat>{g.pihak?.message}</PesanGalat>
        {arah === 'masuk' && !modeUbah && (
          <div className="flex gap-3 rounded-input border border-primary-soft bg-primary-soft px-4 py-3 text-ket text-text">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Isi bila uang ini dari <b>satu</b> anggota — nama dan status iurannya ikut tercatat. Kalau ini kutipan dari <b>banyak anggota sekaligus</b>,
              kosongkan saja dan tulis ringkasannya di keterangan, misalnya “Iuran wajib Januari, 12 anggota Blok C”. Ingin setiap anggota tercatat lunas?
              Pakai{' '}
              <Link href="/catatan/setoran/baru" className="font-semibold text-primary underline-offset-4 hover:underline">
                Catat Iuran Kolektif
              </Link>
              .
            </p>
          </div>
        )}
        {jenisTerpilih?.menandaiMeninggal && pihak.trim() && !anggotaTerpilih && (
          <p className="text-ket text-muted">Nama di atas belum terdaftar sebagai anggota, jadi tidak ada status yang bisa ditandai. Catatan kasnya tetap tersimpan seperti biasa.</p>
        )}
      </div>

      {/* Siapa yang meninggal? (Spec 2 §A5) */}
      {tampilkanMeninggal && anggotaTerpilih && (
        <div className="flex flex-col gap-3 rounded-input border border-warning bg-warning-soft p-4">
          <Label htmlFor="anggotaKeluargaId" className="flex items-center gap-2 text-warning">
            <HeartCrack className="size-5" /> Siapa yang meninggal?
          </Label>
          <PilihanModal<number>
            id="anggotaKeluargaId"
            judul="Siapa yang meninggal?"
            nilai={anggotaKeluargaId}
            onUbah={setAnggotaKeluargaId}
            labelKosong={`${anggotaTerpilih.nama} (anggota sendiri)`}
            placeholder={`${anggotaTerpilih.nama} (anggota sendiri)`}
            placeholderCari="Ketik nama tanggungan…"
            pilihan={anggotaTerpilih.keluarga.map((k) => ({ nilai: k.id, label: k.nama, keterangan: `${k.hubungan}${k.status === 'meninggal' ? ' · sudah bertanda meninggal' : ''}` }))}
            galat={!!galatUmum && galatUmum.includes('keluarga')}
          />
          {sasaran && sasaran.status === 'meninggal' ? (
            <p className="text-isi font-medium text-keluar">
              <span className="font-bold">{sasaran.nama}</span> sudah bertanda meninggal dunia. Periksa dulu, jangan sampai santunannya terbayar dua kali.
            </p>
          ) : (
            sasaran && (
              <p className="text-isi text-warning">
                Menyimpan catatan ini akan menandai <span className="font-bold">{sasaran.nama}</span> meninggal dunia. Menghapus catatannya akan mengembalikan statusnya seperti semula.
              </p>
            )
          )}
        </div>
      )}

      {/* 6. Jumlah */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="jumlah">Jumlah Uang</Label>
        <Controller
          control={control}
          name="jumlah"
          render={({ field }) => (
            <InputRupiah
              id="jumlah"
              nilai={field.value ?? null}
              onUbah={(n) => field.onChange(n ?? undefined)}
              galat={!!g.jumlah}
              hanyaBaca={nominalTerkunci && !tanpaNama}
              petunjuk={petunjukJumlah}
            />
          )}
        />
        <PesanGalat>{g.jumlah?.message}</PesanGalat>
      </div>

      {/* 7. Cara bayar */}
      <div className="flex flex-col gap-2">
        <Label>Cara Bayar</Label>
        <Controller
          control={control}
          name="metode"
          render={({ field }) => (
            <PilihanGanda
              label="Cara Bayar"
              nilai={field.value ?? null}
              onPilih={field.onChange}
              pilihan={[
                { nilai: 'tunai', label: 'Tunai', Ikon: Banknote },
                { nilai: 'transfer', label: 'Transfer', Ikon: Landmark },
              ]}
            />
          )}
        />
        <PesanGalat>{g.metode?.message}</PesanGalat>
      </div>

      {/* 7b. Disetor / diserahkan oleh — siapa yang membawa uangnya */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="penyetorAnggotaId" className="flex items-center gap-2">
          <HandCoins className="size-5 text-muted" /> {arah === 'keluar' ? 'Diserahkan oleh' : 'Disetor oleh'}
        </Label>
        <PilihanModal<number>
          id="penyetorAnggotaId"
          judul={arah === 'keluar' ? 'Diserahkan oleh' : 'Disetor oleh'}
          nilai={penyetorId}
          onUbah={setPenyetorId}
          labelKosong="Bendahara (sendiri)"
          placeholder="Bendahara (sendiri)"
          placeholderCari="Ketik nama pengutip atau anggota…"
          pilihan={daftarPenyetor.map((a) => ({ nilai: a.id, label: a.nama, keterangan: [a.pengutip ? 'pengutip' : null, a.nomor].filter(Boolean).join(' · ') || undefined, kelompok: a.pengutip ? 'Tim pengutip' : 'Anggota lain' }))}
        />
        <p className="text-ket text-muted">{arah === 'keluar' ? 'Siapa yang membawa uangnya ke penerima. Kosongkan bila bendahara sendiri.' : 'Siapa yang membawa uangnya ke bendahara — tim pengutip atau anggota lain. Kosongkan bila langsung ke bendahara.'}</p>
      </div>

      {/* 8. Foto bukti */}
      <div className="flex flex-col gap-2">
        <Label>Foto Bukti <span className="font-normal text-muted">(boleh dikosongkan)</span></Label>
        <InputBukti buktiLama={awal?.buktiFile} onUbah={setBukti} />
      </div>

      <PesanGalat>{galatUmum}</PesanGalat>

      {/* 9. Simpan / Batal — lengket di bawah supaya selalu terlihat saat form panjang */}
      <div className="sticky bottom-20 z-10 -mx-4 -mb-4 flex gap-3 border-t-2 border-border bg-surface px-4 py-3 md:bottom-0 sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="button" variant="sekunder" ukuran="aksi" className="flex-1" onClick={() => router.back()} disabled={sedangKirim}>
          Batal
        </Button>
        <Button type="submit" ukuran="aksi" className="flex-[2]" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>

      {/* Kemungkinan duplikat (docs/02 §5.2): bukan penolakan */}
      <Dialog open={konfirmasi !== null} onOpenChange={(o) => !o && setKonfirmasi(null)}>
        <DialogContent judul="Catatan serupa sudah ada">
          <DialogDescription className="text-isi">{konfirmasi?.kalimat}</DialogDescription>
          <ul className="flex flex-col gap-2">
            {konfirmasi?.mirip.map((m) => (
              <li key={m.noBukti} className="rounded-input border border-border px-4 py-3">
                <span className="angka font-semibold">{m.noBukti}</span>
                <span className="text-muted"> · {m.keterangan}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button ukuran="aksi" className="sm:flex-1" onClick={() => { setKonfirmasi(null); handleSubmit((v) => kirim(v, true))() }}>
              Tetap Simpan
            </Button>
            <Button variant="sekunder" ukuran="aksi" className="sm:flex-1" onClick={() => setKonfirmasi(null)}>
              Batal, Saya Periksa Dulu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
