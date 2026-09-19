'use client'
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckSquare, HeartHandshake, Square } from 'lucide-react'
import { toast } from 'sonner'
import { aturPembayaranDuka, tandaiSemuaDukaAnggota } from '@/server/actions/duka'
import type { RingkasanDukaAnggota } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TunggakanLama } from './TunggakanLama'

/**
 * Bagian "Iuran Duka" di detail anggota. Admin bisa mencentang langsung di sini (tersimpan
 * seketika, sama seperti di Buku Duka), menandai semua, dan mengisi tunggakan lama — kejadian
 * sebelum Buku Duka dipakai yang almarhumnya tidak tercatat: cukup berapa kejadian + rupiah.
 */
export function RingkasanDuka({ anggotaId, ringkasan: r, tarifSaran }: { anggotaId: number; ringkasan: RingkasanDukaAnggota; tarifSaran: number[] }) {
  const router = useRouter()
  const [bayar, setBayar] = React.useState<Map<number, string | null>>(() => new Map(r.daftar.filter((k) => k.sudahBayar).map((k) => [k.id, k.tanggalBayar])))
  const [sibuk, setSibuk] = React.useState<Set<number>>(new Set())
  const [sedangKirim, mulai] = React.useTransition()

  React.useEffect(() => {
    setBayar(new Map(r.daftar.filter((k) => k.sudahBayar).map((k) => [k.id, k.tanggalBayar])))
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

      <div className="mt-4">
        <TunggakanLama anggotaId={anggotaId} baris={r.lama} tarifSaran={tarifSaran} />
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

    </section>
  )
}
