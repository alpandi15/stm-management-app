'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Banknote, Landmark, HeartCrack } from 'lucide-react'
import { simpanCatatan, ubahCatatan, type HasilSimpanCatatan } from '@/server/actions/transaksi'
import type { Jenis, Transaksi } from '@/server/db/schema'
import type { AnggotaUntukForm } from '@/server/queries/transaksi'
import { skemaJumlah, skemaTanggal } from '@/lib/validasi'
import { formatRupiah } from '@/lib/rupiah'
import { hariIni, kemarin } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
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

type ModeTanggal = 'hari-ini' | 'kemarin' | 'pilih'

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
  awal,
  arahAwal,
  kodeJenisAwal,
  anggotaIdAwal,
}: {
  daftarJenis: Jenis[]
  daftarAnggota: AnggotaUntukForm[]
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
  const [modeTanggal, setModeTanggal] = React.useState<ModeTanggal>(
    tanggalAwal === hariIni() ? 'hari-ini' : tanggalAwal === kemarin() ? 'kemarin' : 'pilih',
  )

  const jenisAwalDariKode = kodeJenisAwal ? daftarJenis.find((j) => j.kode === kodeJenisAwal && j.aktif) : undefined
  const anggotaAwal = anggotaIdAwal ? daftarAnggota.find((a) => a.id === anggotaIdAwal) : undefined
  const [anggotaKeluargaId, setAnggotaKeluargaId] = React.useState<number | null>(awal?.anggotaKeluargaId ?? null)

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

  function pilihModeTanggal(m: ModeTanggal) {
    setModeTanggal(m)
    if (m === 'hari-ini') setValue('tanggal', hariIni(), { shouldValidate: true })
    if (m === 'kemarin') setValue('tanggal', kemarin(), { shouldValidate: true })
  }

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

  return (
    <form onSubmit={handleSubmit((v) => kirim(v))} noValidate className="flex flex-col gap-5">
      {/* 1. Jenis (arah) */}
      <div className="flex flex-col gap-2">
        <Label>Jenis</Label>
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

      {/* 2. Tanggal */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="tanggal">Tanggal</Label>
        <PilihanGanda<ModeTanggal>
          label="Tanggal"
          nilai={modeTanggal}
          onPilih={pilihModeTanggal}
          pilihan={[
            { nilai: 'hari-ini', label: 'Hari Ini' },
            { nilai: 'kemarin', label: 'Kemarin' },
            { nilai: 'pilih', label: 'Pilih Tanggal' },
          ]}
        />
        {modeTanggal === 'pilih' && (
          <Controller
            control={control}
            name="tanggal"
            render={({ field }) => <PilihTanggal id="tanggal" nilai={field.value} onUbah={field.onChange} maks={hariIni()} galat={!!g.tanggal} />}
          />
        )}
        <PesanGalat>{g.tanggal?.message}</PesanGalat>
      </div>

      {/* 3. Untuk apa */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="jenisId">Untuk apa uangnya?</Label>
        <Controller
          control={control}
          name="jenisId"
          render={({ field }) => (
            <PilihanCari
              id="jenisId"
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

      {/* 4. Keterangan */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" placeholder="Contoh: Iuran wajib Januari 2026" maxLength={255} {...register('keterangan')} aria-invalid={!!g.keterangan} />
        <PesanGalat>{g.keterangan?.message}</PesanGalat>
      </div>

      {/* 5. Dari / Untuk siapa */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="pihak">{arah === 'keluar' ? 'Untuk siapa' : 'Dari siapa'}</Label>
        <Controller
          control={control}
          name="pihak"
          render={({ field }) => (
            <PilihanCari<string>
              id="pihak"
              nilai={field.value || null}
              onUbah={(v) => field.onChange(v ?? '')}
              pilihan={daftarAnggota.map((a) => ({ nilai: a.nama, label: a.nama, keterangan: [a.nomor, a.status === 'meninggal' ? 'meninggal dunia' : null].filter(Boolean).join(' · ') || undefined }))}
              placeholder="Pilih anggota atau ketik nama (boleh dikosongkan)"
              placeholderCari="Ketik nama anggota atau nama bebas…"
              labelKosong="Tanpa nama"
              bolehBebas
            />
          )}
        />
        <PesanGalat>{g.pihak?.message}</PesanGalat>
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
          <PilihanCari<number>
            id="anggotaKeluargaId"
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
              hanyaBaca={nominalTerkunci}
              petunjuk={nominalTerkunci ? 'Nominal ditetapkan pengurus. Ubah di Pengaturan › Jenis Uang bila memang berubah.' : jenisTerpilih?.nominalBawaan != null ? 'Terisi otomatis dari nominal jenis ini; boleh diubah.' : undefined}
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

      {/* 8. Foto bukti */}
      <div className="flex flex-col gap-2">
        <Label>Foto Bukti <span className="font-normal text-muted">(boleh dikosongkan)</span></Label>
        <InputBukti buktiLama={awal?.buktiFile} onUbah={setBukti} />
      </div>

      <PesanGalat>{galatUmum}</PesanGalat>

      {/* 9. Simpan / Batal */}
      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
          {sedangKirim ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="halus" ukuran="aksi" className="w-full" onClick={() => router.back()} disabled={sedangKirim}>
          Batal
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
