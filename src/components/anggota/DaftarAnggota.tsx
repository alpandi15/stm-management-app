'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CircleCheck, ExternalLink, HeartHandshake, Home, Map as MapIcon, MoreVertical, Pencil, Phone, Plus, Search, Trash2, UserRound, UserRoundCheck, UserRoundX, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { aturAktifAnggota, hapusAnggota, tambahAnggota, ubahAnggota } from '@/server/actions/anggota'
import type { BarisAnggota } from '@/server/queries/anggota'
import type { Rt } from '@/server/db/schema'
import { PER_HALAMAN_ANGGOTA, type SaringAnggota } from '@/lib/anggota'
import { HUBUNGAN, jenisKelaminDariHubungan, type JenisKelamin } from '@/lib/validasi'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PesanGalat } from '@/components/ui/pesan-galat'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { PilihanCari } from '@/components/ui/pilihan-cari'
import { PetaPinDinamis } from './PetaPinDinamis'
import { PilihJenisKelamin } from './PilihJenisKelamin'
import { FieldTunggakanLama, barisTunggakanBaru, type BarisTunggakanForm } from './FieldTunggakanLama'
import { cn } from '@/lib/utils'

type BarisKeluargaForm = { kunci: number; nama: string; hubungan: (typeof HUBUNGAN)[number] | null; jenisKelamin: JenisKelamin | null }
type Form = {
  nomor: string
  nama: string
  jenisKelamin: JenisKelamin | null
  noHp: string
  alamat: string
  rtId: number | null
  lat: number | null
  lng: number | null
  pengutip: boolean
  status: 'aktif' | 'meninggal'
  tanggalMeninggal: string
  tanggalBergabung: string
  /** Hanya dipakai saat tambah — keluarga dan tunggakan duka lama ikut tersimpan bersama anggota baru */
  keluarga: BarisKeluargaForm[]
  tunggakanLama: BarisTunggakanForm[]
}
const formKosong: Form = { nomor: '', nama: '', jenisKelamin: null, noHp: '', alamat: '', rtId: null, lat: null, lng: null, pengutip: false, status: 'aktif', tanggalMeninggal: '', tanggalBergabung: '', keluarga: [], tunggakanLama: [] }
let kunciKeluarga = 0

export function DaftarAnggota({
  baris,
  total,
  halaman,
  cari,
  saring,
  ringkasan,
  saranNomor,
  tarifSaran,
  daftarRt,
  rtId,
}: {
  baris: BarisAnggota[]
  total: number
  halaman: number
  cari: string
  saring: SaringAnggota
  ringkasan: { semua: number; aktif: number; nonaktif: number; meninggal: number; pengutip: number; nunggakDuka: number }
  saranNomor: string
  /** Tarif tunggakan duka lama yang pernah dipakai — bawaan baris di form tambah */
  tarifSaran: number[]
  daftarRt: Rt[]
  /** Penyaring RT aktif dari URL: id RT, 'tanpa', atau kosong */
  rtId?: number | 'tanpa'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [teksCari, setTeksCari] = React.useState(cari)
  const [sedangCari, mulaiCari] = React.useTransition()

  // Pencarian langsung ke query: ketikan ditunda 300 ms lalu ditulis ke URL → halaman dirender ulang di server
  const ubahUrl = React.useCallback(
    (perubahan: Record<string, string | undefined>) => {
      const p = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(perubahan)) {
        if (v) p.set(k, v)
        else p.delete(k)
      }
      mulaiCari(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }))
    },
    [params, pathname, router],
  )
  React.useEffect(() => {
    if (teksCari.trim() === cari) return
    const t = setTimeout(() => ubahUrl({ cari: teksCari.trim() || undefined, hal: undefined }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teksCari])

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN_ANGGOTA))
  const [panel, setPanel] = React.useState<{ mode: 'tambah' } | { mode: 'ubah'; id: number } | null>(null)
  const [form, setForm] = React.useState<Form>(formKosong)
  const [galat, setGalat] = React.useState<{ pesan: string; field?: string } | null>(null)
  const [hapus, setHapus] = React.useState<BarisAnggota | null>(null)
  const [sedangKirim, mulai] = React.useTransition()

  function bukaTambah() {
    setForm({ ...formKosong, nomor: saranNomor })
    setGalat(null)
    setPanel({ mode: 'tambah' })
  }
  function bukaUbah(a: BarisAnggota) {
    setForm({ ...formKosong, nomor: a.nomor ?? '', nama: a.nama, jenisKelamin: a.jenisKelamin, noHp: a.noHp ?? '', alamat: a.alamat ?? '', rtId: a.rtId, lat: a.lat, lng: a.lng, pengutip: a.pengutip, status: a.status, tanggalMeninggal: a.tanggalMeninggal ?? '', tanggalBergabung: a.tanggalBergabung ?? '' })
    setGalat(null)
    setPanel({ mode: 'ubah', id: a.id })
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!panel) return
    mulai(async () => {
      const input = {
        nomor: form.nomor || null,
        nama: form.nama,
        jenisKelamin: form.jenisKelamin,
        noHp: form.noHp || null,
        alamat: form.alamat || null,
        rtId: form.rtId,
        lat: form.lat,
        lng: form.lng,
        pengutip: form.pengutip,
        status: form.status,
        tanggalMeninggal: form.status === 'meninggal' ? form.tanggalMeninggal || null : null,
        tanggalBergabung: form.tanggalBergabung || null,
      }
      const keluarga = form.keluarga.map((k) => ({
        nama: k.nama,
        hubungan: k.hubungan as (typeof HUBUNGAN)[number],
        jenisKelamin: jenisKelaminDariHubungan(k.hubungan) ?? k.jenisKelamin,
      }))
      const tunggakanLama = form.tunggakanLama
        .filter((t) => t.jumlah || t.tarif || t.keterangan)
        .map((t) => ({ jumlah: Number(t.jumlah || 0), tarif: t.tarif ?? 0, keterangan: t.keterangan || null }))
      const hasil = panel.mode === 'tambah' ? await tambahAnggota({ ...input, keluarga, tunggakanLama }) : await ubahAnggota(panel.id, input)
      if (!hasil.ok) {
        setGalat({ pesan: hasil.pesan, field: hasil.field })
        return
      }
      toast.success(
        panel.mode === 'tambah'
          ? `${hasil.data.nama} ditambahkan${keluarga.length ? ` bersama ${keluarga.length} anggota keluarga` : ''}${tunggakanLama.length ? ` dan ${tunggakanLama.length} baris tunggakan duka lama` : ''}.`
          : 'Perubahan tersimpan.',
      )
      setPanel(null)
      router.refresh()
    })
  }

  function tambahBarisKeluarga() {
    setForm((f) => ({ ...f, keluarga: [...f.keluarga, { kunci: ++kunciKeluarga, nama: '', hubungan: null, jenisKelamin: null }] }))
  }
  function ubahBarisKeluarga(kunci: number, ubahan: Partial<BarisKeluargaForm>) {
    setForm((f) => ({ ...f, keluarga: f.keluarga.map((k) => (k.kunci === kunci ? { ...k, ...ubahan } : k)) }))
  }
  function hapusBarisKeluarga(kunci: number) {
    setForm((f) => ({ ...f, keluarga: f.keluarga.filter((k) => k.kunci !== kunci) }))
  }

  function aturAktif(a: BarisAnggota) {
    mulai(async () => {
      const hasil = await aturAktifAnggota(a.id, !a.aktif)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(a.aktif ? `${a.nama} dinonaktifkan.` : `${a.nama} diaktifkan lagi.`)
      router.refresh()
    })
  }

  function hapusSekarang() {
    if (!hapus) return
    mulai(async () => {
      const hasil = await hapusAnggota(hapus.id)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        setHapus(null)
        return
      }
      toast.success(`${hapus.nama} dihapus.`)
      setHapus(null)
      router.refresh()
    })
  }

  const galatField = (k: string) => (galat?.field === k ? <PesanGalat>{galat.pesan}</PesanGalat> : null)

  /** Keadaan: satu badge utama (Aktif / Nonaktif / Meninggal) + tag kecil bergaris (Pengutip, Pecah KK). */
  const Badge = ({ a }: { a: BarisAnggota }) => (
    <span className="flex flex-wrap items-center gap-1.5">
      {a.status === 'meninggal' ? (
        <span className="rounded-badge bg-keluar-soft px-2.5 py-0.5 text-ket font-semibold text-keluar">Meninggal</span>
      ) : a.aktif ? (
        <span className="rounded-badge bg-masuk-soft px-2.5 py-0.5 text-ket font-semibold text-masuk">Aktif</span>
      ) : (
        <span className="rounded-badge bg-border px-2.5 py-0.5 text-ket font-semibold text-muted">Nonaktif</span>
      )}
      {a.pengutip && <span className="rounded-badge border border-warning px-2 py-0.5 text-ket font-medium text-warning">Pengutip</span>}
      {a.anggotaAsalId && <span className="rounded-badge border border-primary px-2 py-0.5 text-ket font-medium text-primary">Pecah KK</span>}
    </span>
  )

  /** Iuran duka: lunas (hijau) atau nunggak N kejadian · Rp X (merah) — kolom sendiri, bukan tercampur dengan badge keadaan. */
  const StatusDuka = ({ a, ringkas }: { a: BarisAnggota; ringkas?: boolean }) => {
    const t = a.tunggakanDuka
    if (!t || (t.jumlahWajib === 0 && t.lamaJumlah === 0)) return ringkas ? null : <span className="text-ket text-muted">–</span>
    if (t.jumlahNunggak === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-ket font-semibold text-masuk">
          <CircleCheck className="size-4" /> Duka lunas
        </span>
      )
    }
    return (
      <span className="inline-flex flex-col leading-tight" title={t.lamaJumlah ? `Termasuk ${t.lamaJumlah} tunggakan lama (${formatRupiah(t.lamaRupiah)})` : undefined}>
        <span className="inline-flex items-center gap-1 text-ket font-semibold text-keluar">
          <HeartHandshake className="size-4" /> Nunggak {t.jumlahNunggak} duka
        </span>
        <span className="angka text-ket text-keluar">{formatRupiah(t.totalNunggak)}</span>
      </span>
    )
  }

  const MenuAksi = ({ a }: { a: BarisAnggota }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex size-sentuh items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label={`Menu ${a.nama}`}>
          <MoreVertical className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/anggota/${a.id}`}>
            <UserRound /> Detail & riwayat
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => bukaUbah(a)}>
          <Pencil /> Ubah
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/anggota/${a.id}/keluarga`}>
            <Users /> Keluarga ({a.jumlahKeluarga})
          </Link>
        </DropdownMenuItem>
        {a.lat != null && a.lng != null && (
          <DropdownMenuItem asChild>
            <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Buka di Google Maps
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => aturAktif(a)}>
          {a.aktif ? <UserRoundX /> : <UserRoundCheck />} {a.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </DropdownMenuItem>
        {a.jumlahCatatan === 0 && (
          <DropdownMenuItem bahaya onSelect={() => setHapus(a)}>
            <Trash2 /> Hapus
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const tautanHalaman = (h: number) => {
    const p = new URLSearchParams(params.toString())
    p.set('hal', String(h))
    return `${pathname}?${p.toString()}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-kartu border border-border bg-surface p-4 shadow-kartu">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <Input aria-label="Cari anggota" placeholder="Cari nama, nomor, alamat, atau HP…" className="pl-12" value={teksCari} onChange={(e) => setTeksCari(e.target.value)} autoComplete="off" />
            {sedangCari && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ket text-muted">mencari…</span>}
          </div>
          <Button asChild variant="sekunder">
            <Link href="/peta">
              <MapIcon /> Peta Anggota
            </Link>
          </Button>
          <Button asChild variant="sekunder">
            <Link href="/anggota/rt">
              <Home /> Data RT
            </Link>
          </Button>
          <Button onClick={bukaTambah}>
            <Plus /> Tambah Anggota
          </Button>
        </div>
        {daftarRt.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label font-semibold text-muted">RT:</span>
            <div className="w-full sm:w-72">
              <PilihanCari<string>
                id="saring-rt"
                nilai={rtId === 'tanpa' ? 'tanpa' : rtId ? String(rtId) : null}
                onUbah={(v) => ubahUrl({ rt: v ?? undefined, hal: undefined })}
                pilihan={[{ nilai: 'tanpa', label: 'Belum punya RT' }, ...daftarRt.map((r) => ({ nilai: String(r.id), label: r.nama, keterangan: r.keterangan ?? undefined }))]}
                placeholder="Semua RT"
                labelKosong="Semua RT"
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tampilkan">
          {(
            [
              ['semua', `Semua (${ringkasan.semua})`],
              ['aktif', `Aktif (${ringkasan.aktif})`],
              ['nonaktif', `Nonaktif (${ringkasan.nonaktif})`],
              ['meninggal', `Meninggal (${ringkasan.meninggal})`],
              ['pengutip', `Tim pengutip (${ringkasan.pengutip})`],
              ['nunggak-duka', `Nunggak duka (${ringkasan.nunggakDuka})`],
            ] as const
          ).map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              role="radio"
              aria-checked={saring === nilai}
              onClick={() => ubahUrl({ saring: nilai === 'semua' ? undefined : nilai, hal: undefined })}
              className={cn(
                'min-h-sentuh rounded-badge border-2 px-4 text-isi font-semibold transition-colors duration-150',
                saring === nilai ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text hover:bg-bg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-isi text-muted">
        {total === 0 ? 'Tidak ada anggota' : `${total} anggota`}
        {cari && <> yang cocok dengan “<span className="font-semibold text-text">{cari}</span>”</>}
        {total > PER_HALAMAN_ANGGOTA && ` · halaman ${halaman} dari ${totalHalaman}`}
      </p>

      {baris.length === 0 ? (
        ringkasan.semua === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <KeadaanKosong judul="Belum ada anggota" kalimat="Daftar anggota memudahkan mencatat iuran dan santunan. Anda juga bisa mengetik nama bebas saat mencatat." />
            <Button ukuran="aksi" onClick={bukaTambah}>
              <Plus /> Tambah Anggota Pertama
            </Button>
          </div>
        ) : (
          <KeadaanKosong judul="Tidak ada yang cocok" kalimat="Coba kata lain, atau ubah pilihan Tampilkan di atas." />
        )
      ) : (
        <>
          {/* Tabel di layar lebar */}
          <div className="hidden overflow-hidden rounded-kartu border border-border bg-surface shadow-kartu md:block">
            <table className="w-full text-isi">
              <thead className="bg-bg text-left text-ket font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Nomor</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Keadaan</th>
                  <th className="px-4 py-3">Iuran duka</th>
                  <th className="px-4 py-3 text-right">Total iuran</th>
                  <th className="px-4 py-3 text-right">Keluarga</th>
                  <th className="px-2 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {baris.map((a) => (
                  <tr key={a.id} className={cn('hover:bg-bg', !a.aktif && 'opacity-70')}>
                    <td className="angka whitespace-nowrap px-4 py-3 text-muted">{a.nomor ?? '–'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/anggota/${a.id}`} className="font-semibold hover:text-primary hover:underline">
                        {a.nama}
                      </Link>
                      {a.noHp && (
                        <p className="angka flex items-center gap-1 text-ket text-muted">
                          <Phone className="size-3.5" /> {a.noHp}
                        </p>
                      )}
                      {a.namaAsal && <p className="text-ket text-muted">Pecah dari {a.namaAsal}</p>}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-muted">
                      {a.namaRt && <span className="mb-0.5 inline-block rounded-badge bg-bg px-2 py-0.5 text-ket font-semibold text-text">{a.namaRt}</span>}
                      <span className="line-clamp-2">{a.alamat ?? (a.namaRt ? '' : '–')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge a={a} />
                      {a.status === 'meninggal' && a.tanggalMeninggal && <p className="mt-1 text-ket text-muted">{formatTanggal(a.tanggalMeninggal)}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusDuka a={a} />
                    </td>
                    <td className="angka whitespace-nowrap px-4 py-3 text-right font-semibold text-masuk">
                      {formatRupiah(a.totalIuran)}
                      <p className="text-ket font-normal text-muted">{a.jumlahCatatan} catatan</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="halus">
                        <Link href={`/anggota/${a.id}/keluarga`}>
                          <Users /> {a.jumlahKeluarga}
                        </Link>
                      </Button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <MenuAksi a={a} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu di layar sempit */}
          <ul className="flex flex-col gap-3 md:hidden">
            {baris.map((a) => (
              <li key={a.id} className={cn('flex items-start gap-3 rounded-kartu border border-border bg-surface p-4 shadow-kartu', !a.aktif && 'opacity-70')}>
                <div className="min-w-0 flex-1">
                  {a.nomor && <p className="angka text-ket font-semibold text-muted">{a.nomor}</p>}
                  <Link href={`/anggota/${a.id}`} className="block truncate text-judul-kartu font-semibold hover:text-primary">
                    {a.nama}
                  </Link>
                  {(a.alamat || a.namaRt) && (
                    <p className="line-clamp-2 text-ket text-muted">
                      {a.namaRt && <span className="mr-1 font-semibold text-text">{a.namaRt}</span>}
                      {a.alamat}
                    </p>
                  )}
                  <p className="mt-1 text-isi">
                    <span className="angka font-bold text-masuk">{formatRupiah(a.totalIuran)}</span>
                    <span className="text-ket text-muted"> · keluarga {a.jumlahKeluarga}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge a={a} />
                    <StatusDuka a={a} ringkas />
                  </div>
                </div>
                <MenuAksi a={a} />
              </li>
            ))}
          </ul>

          {totalHalaman > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Halaman">
              <Button asChild variant="sekunder" className={cn(halaman <= 1 && 'pointer-events-none opacity-50')}>
                <Link href={tautanHalaman(halaman - 1)} scroll={false}>Sebelumnya</Link>
              </Button>
              <span className="order-first w-full text-center text-isi text-muted sm:order-none sm:w-auto">
                Halaman {halaman} dari {totalHalaman}
              </span>
              <Button asChild variant="sekunder" className={cn(halaman >= totalHalaman && 'pointer-events-none opacity-50')}>
                <Link href={tautanHalaman(halaman + 1)} scroll={false}>Berikutnya</Link>
              </Button>
            </nav>
          )}
        </>
      )}

      <Sheet open={panel !== null} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent judul={panel?.mode === 'ubah' ? 'Ubah Anggota' : 'Tambah Anggota'} className="max-w-lg">
          <form onSubmit={simpan} className="flex flex-col gap-5" noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomor-anggota">Nomor anggota</Label>
                <Input id="nomor-anggota" className="angka" value={form.nomor} onChange={(e) => setForm({ ...form, nomor: e.target.value })} maxLength={30} aria-invalid={galat?.field === 'nomor'} />
                {galatField('nomor')}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nama-anggota">Nama</Label>
                <Input id="nama-anggota" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} autoFocus maxLength={120} aria-invalid={galat?.field === 'nama'} />
                {galatField('nama')}
              </div>
            </div>
            <PilihJenisKelamin nilai={form.jenisKelamin} onUbah={(v) => setForm({ ...form, jenisKelamin: v })} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="hp-anggota">Nomor HP <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="hp-anggota" inputMode="tel" value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} maxLength={30} className="angka" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="alamat-anggota">Alamat <span className="font-normal text-muted">(boleh kosong)</span></Label>
              <Input id="alamat-anggota" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} maxLength={255} placeholder="Contoh: Jl. Melati No. 12, Blok C" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rt-anggota">
                RT <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <PilihanCari<number>
                id="rt-anggota"
                nilai={form.rtId}
                onUbah={(v) => setForm({ ...form, rtId: v })}
                pilihan={daftarRt.map((r) => ({ nilai: r.id, label: r.nama, keterangan: r.keterangan ?? undefined }))}
                placeholder={daftarRt.length ? 'Pilih RT…' : 'Belum ada RT — buat di Data RT'}
                labelKosong="Tanpa RT"
                galat={galat?.field === 'rtId'}
              />
              {galatField('rtId')}
              <p className="text-ket text-muted">
                Daftar RT diatur di{' '}
                <Link href="/anggota/rt" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Data RT
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-ket text-muted">Titik di peta (boleh kosong) — klik peta atau seret pin. Peta butuh internet.</p>
              {panel && <PetaPinDinamis lat={form.lat} lng={form.lng} onUbah={(t) => setForm((f) => ({ ...f, lat: t?.lat ?? null, lng: t?.lng ?? null }))} />}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tanggal-bergabung">
                Tanggal bergabung <span className="font-normal text-muted">(boleh kosong)</span>
              </Label>
              <PilihTanggal id="tanggal-bergabung" nilai={form.tanggalBergabung} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalBergabung: v })} placeholder="Kosong = anggota lama" />
              <p className="text-ket text-muted">Dipakai Buku Duka: anggota tidak ditagih kejadian yang terjadi sebelum tanggal ini. Kosongkan untuk anggota lama.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tim pengutip iuran?</Label>
              <PilihanGanda
                label="Tim pengutip"
                nilai={form.pengutip ? 'ya' : 'tidak'}
                onPilih={(v) => setForm({ ...form, pengutip: v === 'ya' })}
                pilihan={[
                  { nilai: 'tidak', label: 'Bukan' },
                  { nilai: 'ya', label: 'Ya, pengutip' },
                ]}
              />
              <p className="text-ket text-muted">Pengutip muncul paling atas di pilihan “Disetor oleh” saat mencatat.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <PilihanGanda
                label="Status"
                nilai={form.status}
                onPilih={(v) => setForm({ ...form, status: v })}
                pilihan={[
                  { nilai: 'aktif', label: 'Masih hidup' },
                  { nilai: 'meninggal', label: 'Meninggal dunia' },
                ]}
              />
              {form.status === 'meninggal' && (
                <div className="mt-2 flex flex-col gap-2">
                  <Label htmlFor="tanggal-meninggal">Tanggal meninggal</Label>
                  <PilihTanggal id="tanggal-meninggal" nilai={form.tanggalMeninggal} maks={hariIni()} onUbah={(v) => setForm({ ...form, tanggalMeninggal: v })} galat={galat?.field === 'tanggalMeninggal'} />
                  {galatField('tanggalMeninggal')}
                  <p className="text-ket text-muted">Status yang diisi di sini bersifat manual dan tidak ikut berubah bila catatan santunan dihapus.</p>
                </div>
              )}
            </div>
            {panel?.mode === 'tambah' ? (
              <fieldset className="flex flex-col gap-3 rounded-kartu border border-border bg-bg p-4">
                <legend className="px-1 text-label font-semibold uppercase tracking-wide text-muted">Keluarga / tanggungan (boleh kosong)</legend>
                <p className="text-ket text-muted">Istri, suami, anak, atau orang tua yang ditanggung. Tanggal lahir dan data lain bisa dilengkapi nanti di halaman Keluarga.</p>
                {form.keluarga.map((k, i) => (
                  <div key={k.kunci} className="flex flex-col gap-3 rounded-input border border-border bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-semibold text-muted">Keluarga {i + 1}</span>
                      <Button type="button" variant="halus" ukuran="ikon" aria-label={`Hapus keluarga ${i + 1}`} onClick={() => hapusBarisKeluarga(k.kunci)}>
                        <X />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`nama-keluarga-${k.kunci}`}>Nama</Label>
                        <Input id={`nama-keluarga-${k.kunci}`} value={k.nama} onChange={(e) => ubahBarisKeluarga(k.kunci, { nama: e.target.value })} maxLength={100} autoFocus />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`hubungan-${k.kunci}`}>Hubungan</Label>
                        <PilihanCari
                          id={`hubungan-${k.kunci}`}
                          nilai={k.hubungan}
                          onUbah={(v) => ubahBarisKeluarga(k.kunci, { hubungan: v, jenisKelamin: jenisKelaminDariHubungan(v) ?? k.jenisKelamin })}
                          pilihan={HUBUNGAN.map((h) => ({ nilai: h, label: h }))}
                          placeholder="Pilih hubungan…"
                        />
                      </div>
                    </div>
                    <PilihJenisKelamin nilai={k.jenisKelamin} hubungan={k.hubungan} onUbah={(v) => ubahBarisKeluarga(k.kunci, { jenisKelamin: v })} />
                  </div>
                ))}
                <Button type="button" variant="sekunder" onClick={tambahBarisKeluarga}>
                  <Plus /> {form.keluarga.length ? 'Tambah keluarga lagi' : 'Tambah anggota keluarga'}
                </Button>
                {galatField('keluarga')}
              </fieldset>
            ) : null}
            {panel?.mode === 'tambah' ? (
              <fieldset className="flex flex-col gap-3 rounded-kartu border border-border bg-bg p-4">
                <legend className="px-1 text-label font-semibold uppercase tracking-wide text-muted">Tunggakan iuran duka lama (boleh kosong)</legend>
                <p className="text-ket text-muted">Dari buku manual: berapa kejadian yang belum dibayar dan iuran per kejadian saat itu. Satu baris per tarif, mis. 6 × Rp 5.000 dan 10 × Rp 7.000.</p>
                {form.tunggakanLama.map((t, i) => (
                  <div key={t.kunci} className="flex flex-col gap-3 rounded-input border border-border bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label font-semibold text-muted">Baris {i + 1}</span>
                      <Button type="button" variant="halus" ukuran="ikon" aria-label={`Hapus baris tunggakan ${i + 1}`} onClick={() => setForm((f) => ({ ...f, tunggakanLama: f.tunggakanLama.filter((x) => x.kunci !== t.kunci) }))}>
                        <X />
                      </Button>
                    </div>
                    <FieldTunggakanLama b={t} awalan="anggota-tunggakan" galat={galat?.field === 'tunggakanLama' ? galat : null} onUbah={(u) => setForm((f) => ({ ...f, tunggakanLama: f.tunggakanLama.map((x) => (x.kunci === t.kunci ? { ...x, ...u } : x)) }))} />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="sekunder"
                  onClick={() => setForm((f) => ({ ...f, tunggakanLama: f.tunggakanLama.length === 0 && tarifSaran.length ? tarifSaran.map((x) => barisTunggakanBaru(x)) : [...f.tunggakanLama, barisTunggakanBaru()] }))}
                >
                  <Plus /> {form.tunggakanLama.length ? 'Tambah baris tarif lain' : 'Isi tunggakan duka lama'}
                </Button>
                {galatField('tunggakanLama')}
              </fieldset>
            ) : (
              panel && (
                <p className="text-ket text-muted">
                  Keluarga / tanggungan diatur di{' '}
                  <Link href={`/anggota/${panel.id}/keluarga`} className="font-semibold text-primary underline-offset-4 hover:underline">
                    halaman Keluarga
                  </Link>
                  .
                </p>
              )
            )}
            {galat && !['nomor', 'nama', 'tanggalMeninggal', 'keluarga', 'tunggakanLama'].includes(galat.field ?? '') && <PesanGalat>{galat.pesan}</PesanGalat>}
            <Button type="submit" ukuran="aksi" className="w-full" disabled={sedangKirim}>
              {sedangKirim ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <DialogContent judul="Hapus anggota ini?">
          <p className="text-judul-kartu font-semibold">{hapus?.nama}</p>
          <DialogDescription className="text-isi text-muted">Anggota ini belum pernah dipakai di catatan, jadi bisa dihapus permanen beserta daftar keluarganya.</DialogDescription>
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
