'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifJenis, hapusJenis, tambahJenis, ubahJenis } from '@/server/actions/jenis'
import type { BarisJenis } from '@/server/queries/jenis'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { cn } from '@/lib/utils'

export function KartuJenis({ daftar }: { daftar: BarisJenis[] }) {
  const router = useRouter()
  const [namaBaru, setNamaBaru] = React.useState('')
  const [arahBaru, setArahBaru] = React.useState<'masuk' | 'keluar'>('masuk')
  const [galat, setGalat] = React.useState<string | null>(null)
  const [ubahId, setUbahId] = React.useState<number | null>(null)
  const [namaUbah, setNamaUbah] = React.useState('')
  const [sedangKirim, mulai] = React.useTransition()

  function tambah(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const hasil = await tambahJenis({ nama: namaBaru, arah: arahBaru })
      if (!hasil.ok) {
        setGalat(hasil.pesan)
        return
      }
      setGalat(null)
      setNamaBaru('')
      toast.success(`Jenis “${hasil.data.nama}” ditambahkan.`)
      router.refresh()
    })
  }
  function simpanUbah(id: number) {
    mulai(async () => {
      const hasil = await ubahJenis(id, { nama: namaUbah })
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      setUbahId(null)
      toast.success('Nama jenis tersimpan.')
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

  // Fungsi render biasa (bukan komponen) supaya input ubah nama tidak kehilangan fokus
  const kelompok = ({ arah, judul }: { arah: 'masuk' | 'keluar'; judul: string }) => (
    <div>
      <h3 className={cn('mb-2 text-label font-semibold', arah === 'masuk' ? 'text-masuk' : 'text-keluar')}>{judul}</h3>
      <ul className="divide-y divide-border rounded-input border border-border">
        {daftar
          .filter((j) => j.arah === arah)
          .map((j) => (
            <li key={j.id} className={cn('flex flex-wrap items-center gap-2 px-3 py-2', !j.aktif && 'opacity-60')}>
              {ubahId === j.id ? (
                <>
                  <Input value={namaUbah} onChange={(e) => setNamaUbah(e.target.value)} className="min-w-0 flex-1" autoFocus maxLength={120} aria-label="Nama jenis" />
                  <Button ukuran="ikon" aria-label="Simpan nama" onClick={() => simpanUbah(j.id)} disabled={sedangKirim}>
                    <Check />
                  </Button>
                  <Button variant="halus" ukuran="ikon" aria-label="Batal" onClick={() => setUbahId(null)}>
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {j.nama}
                      {!j.aktif && <span className="ml-2 rounded-badge bg-border px-2 py-0.5 text-ket text-muted">Nonaktif</span>}
                    </p>
                    <p className="angka text-ket text-muted">
                      {j.kode} · {j.bawaan ? 'bawaan' : 'buatan sendiri'} · dipakai {j.dipakai} catatan
                    </p>
                  </div>
                  <Button variant="halus" ukuran="ikon" aria-label={`Ubah nama ${j.nama}`} onClick={() => { setUbahId(j.id); setNamaUbah(j.nama) }}>
                    <Pencil />
                  </Button>
                  <Button variant="halus" onClick={() => aktif(j)} disabled={sedangKirim}>
                    {j.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                  {!j.bawaan && (
                    <Button variant="halus" ukuran="ikon" className="text-keluar" aria-label={`Hapus ${j.nama}`} onClick={() => hapus(j)} disabled={sedangKirim}>
                      <Trash2 />
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
      </ul>
    </div>
  )

  return (
    <Kartu judul="Jenis Uang Masuk & Keluar" keterangan="Pilihan “Untuk apa” di form catatan. Jenis bawaan tidak bisa dihapus; jenis yang sudah dipakai cukup dinonaktifkan.">
      <form onSubmit={tambah} className="mb-5 flex flex-col gap-3 rounded-input border border-dashed border-border p-4" noValidate>
        <Label htmlFor="jenis-baru">Tambah jenis baru</Label>
        <PilihanGanda
          label="Arah"
          warnaArah
          nilai={arahBaru}
          onPilih={setArahBaru}
          pilihan={[
            { nilai: 'masuk', label: 'Uang Masuk' },
            { nilai: 'keluar', label: 'Uang Keluar' },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="jenis-baru" placeholder="Contoh: Arisan Bulanan" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} maxLength={120} className="flex-1" />
          <Button type="submit" disabled={sedangKirim}>
            <Plus /> Tambah
          </Button>
        </div>
        <PesanGalat>{galat}</PesanGalat>
      </form>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {kelompok({ arah: 'masuk', judul: 'Uang Masuk' })}
        {kelompok({ arah: 'keluar', judul: 'Uang Keluar' })}
      </div>
    </Kartu>
  )
}
