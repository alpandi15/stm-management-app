'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tambahKejadian, ubahKejadian } from '@/server/actions/duka'
import type { InputKejadian } from '@/lib/validasi'
import type { KejadianDuka } from '@/server/db/schema'
import { hariIni } from '@/lib/tanggal'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { InputRupiah } from '@/components/keuangan/InputRupiah'

export type PilihanAlmarhum = { kunci: string; nama: string; keterangan: string; tanggalMeninggal: string | null; anggotaId: number; anggotaKeluargaId: number | null }

type Form = { namaAlmarhum: string; hubungan: string; anggotaId: number | null; anggotaKeluargaId: number | null; tanggalMeninggal: string; tarif: number | null; keterangan: string }

/**
 * Form tambah/ubah kejadian duka di panel samping. Nama boleh dipilih dari anggota/tanggungan
 * yang berstatus meninggal (mengisi nama, tanggal, dan tautan), atau diketik bebas.
 * Tarif bawaan mengikuti kejadian terakhir; kejadian lama tidak berubah bila tarif naik.
 */
export function FormKejadian({
  terbuka,
  onTutup,
  awal,
  pilihanAlmarhum,
  tarifBerlaku,
  onSelesai,
}: {
  terbuka: boolean
  onTutup: () => void
  awal?: KejadianDuka | null
  pilihanAlmarhum: PilihanAlmarhum[]
  tarifBerlaku: number | null
  onSelesai?: (k: KejadianDuka) => void
}) {
  const router = useRouter()
  const kosong = React.useMemo<Form>(
    () => ({ namaAlmarhum: '', hubungan: '', anggotaId: null, anggotaKeluargaId: null, tanggalMeninggal: hariIni(), tarif: tarifBerlaku, keterangan: '' }),
    [tarifBerlaku],
  )
  const [form, setForm] = React.useState<Form>(kosong)
  const [kunciPilihan, setKunciPilihan] = React.useState<string | null>(null)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  React.useEffect(() => {
    if (!terbuka) return
    setGalat(null)
    if (awal) {
      setForm({ namaAlmarhum: awal.namaAlmarhum, hubungan: awal.hubungan ?? '', anggotaId: awal.anggotaId, anggotaKeluargaId: awal.anggotaKeluargaId, tanggalMeninggal: awal.tanggalMeninggal, tarif: awal.tarif, keterangan: awal.keterangan ?? '' })
      setKunciPilihan(awal.anggotaKeluargaId ? `k-${awal.anggotaKeluargaId}` : awal.anggotaId ? `a-${awal.anggotaId}` : null)
    } else {
      setForm(kosong)
      setKunciPilihan(null)
    }
  }, [terbuka, awal, kosong])

  function pilihDariDaftar(kunci: string | null) {
    setKunciPilihan(kunci)
    const p = pilihanAlmarhum.find((x) => x.kunci === kunci)
    if (!p) {
      setForm((f) => ({ ...f, anggotaId: null, anggotaKeluargaId: null }))
      return
    }
    setForm((f) => ({
      ...f,
      namaAlmarhum: p.nama,
      hubungan: p.keterangan,
      anggotaId: p.anggotaId,
      anggotaKeluargaId: p.anggotaKeluargaId,
      tanggalMeninggal: p.tanggalMeninggal ?? f.tanggalMeninggal,
    }))
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const input: InputKejadian = {
        namaAlmarhum: form.namaAlmarhum,
        hubungan: form.hubungan || null,
        anggotaId: form.anggotaId,
        anggotaKeluargaId: form.anggotaKeluargaId,
        tanggalMeninggal: form.tanggalMeninggal,
        tarif: form.tarif ?? (undefined as unknown as number),
        keterangan: form.keterangan || null,
      }
      const hasil = awal ? await ubahKejadian(awal.id, input) : await tambahKejadian(input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(awal ? 'Perubahan tersimpan.' : `Kejadian ke-${hasil.data.nomor} dicatat: Alm. ${hasil.data.namaAlmarhum}.`)
      onTutup()
      onSelesai?.(hasil.data)
      router.refresh()
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  return (
    <Sheet open={terbuka} onOpenChange={(o) => !o && onTutup()}>
      <SheetContent judul={awal ? 'Ubah Kejadian Duka' : 'Catat Kejadian Duka'} className="max-w-xl">
        <form onSubmit={simpan} className="flex flex-1 flex-col gap-5" noValidate>
          {pilihanAlmarhum.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="pilih-almarhum">
                Pilih dari data anggota <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <PilihanCari
                id="pilih-almarhum"
                nilai={kunciPilihan}
                onUbah={pilihDariDaftar}
                pilihan={pilihanAlmarhum.map((p) => ({ nilai: p.kunci, label: p.nama, keterangan: p.keterangan }))}
                placeholder="Cari nama yang sudah ditandai meninggal…"
                labelKosong="Ketik nama sendiri"
              />
              <p className="text-ket text-muted">Kalau namanya belum ada di data anggota, langsung ketik di bawah.</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="nama-almarhum">Nama almarhum / almarhumah</Label>
            <Input id="nama-almarhum" value={form.namaAlmarhum} onChange={(e) => setForm({ ...form, namaAlmarhum: e.target.value })} maxLength={120} placeholder="Contoh: Bpk. Karim" aria-invalid={galat?.field === 'namaAlmarhum'} autoFocus={!awal} />
            {galatField('namaAlmarhum')}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hubungan-almarhum">
              Siapa beliau? <span className="font-normal text-muted">(boleh kosong)</span>
            </Label>
            <Input id="hubungan-almarhum" value={form.hubungan} onChange={(e) => setForm({ ...form, hubungan: e.target.value })} maxLength={120} placeholder="Contoh: Anggota, atau Istri dari Budi Santoso" />
            {galatField('hubungan')}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tanggal-kejadian">Tanggal meninggal</Label>
            <PilihTanggal inline id="tanggal-kejadian" nilai={form.tanggalMeninggal} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalMeninggal: v })} galat={galat?.field === 'tanggalMeninggal'} />
            {galatField('tanggalMeninggal')}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tarif-kejadian">Iuran per anggota untuk kejadian ini</Label>
            <InputRupiah
              id="tarif-kejadian"
              nilai={form.tarif}
              onUbah={(n) => setForm({ ...form, tarif: n })}
              galat={galat?.field === 'tarif'}
              petunjuk={tarifBerlaku != null && !awal ? `Mengikuti kejadian terakhir (${formatRupiah(tarifBerlaku)}). Ubah bila tarif sudah naik — kejadian lama tidak ikut berubah.` : 'Tarif ini tetap untuk kejadian ini, walau tarif berubah di kemudian hari.'}
            />
            {galatField('tarif')}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ket-kejadian">
              Keterangan <span className="font-normal text-muted">(boleh kosong)</span>
            </Label>
            <Input id="ket-kejadian" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} maxLength={255} />
            {galatField('keterangan')}
          </div>
          {galat && !['namaAlmarhum', 'hubungan', 'tanggalMeninggal', 'tarif', 'keterangan'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex gap-3 border-t-2 border-border bg-surface px-6 py-3">
            <Button type="button" variant="sekunder" ukuran="aksi" className="flex-1" onClick={onTutup} disabled={sedangKirim}>
              Batal
            </Button>
            <Button type="submit" ukuran="aksi" className="flex-[2]" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
