'use client'
import * as React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import Link from 'next/link'
import { ArrowLeft, Search, X } from 'lucide-react'
import type { TitikAnggota } from '@/server/queries/anggota'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PUSAT_BAWAAN } from './PetaPin'
import { cn } from '@/lib/utils'

const ikon = (warna: string) =>
  L.divIcon({
    className: '',
    html: `<svg width="30" height="38" viewBox="0 0 36 44" fill="none"><path d="M18 43C18 43 33 25.5 33 16A15 15 0 0 0 3 16c0 9.5 15 27 15 27Z" fill="${warna}" stroke="#fff" stroke-width="2"/><circle cx="18" cy="16" r="6" fill="#fff"/></svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -34],
  })
const IKON = { aktif: ikon('#1d4ed8'), nonaktif: ikon('#6b7280'), meninggal: ikon('#b91c1c') }

function lolos(a: TitikAnggota, cari: string) {
  if (!cari) return true
  const c = cari.toLowerCase()
  return [a.nama, a.nomor, a.alamat, a.noHp].some((v) => v?.toLowerCase().includes(c))
}

/**
 * Peta seluruh alamat anggota (halaman penuh, tanpa sidebar): marker diklaster
 * (leaflet.markercluster) supaya ribuan titik tetap terbaca; pencarian menyaring marker dan
 * menampilkan daftar hasil yang bisa diklik untuk terbang ke titiknya.
 */
export function PetaSemua({ titik, totalAnggota }: { titik: TitikAnggota[]; totalAnggota: number }) {
  const wadah = React.useRef<HTMLDivElement>(null)
  const peta = React.useRef<L.Map | null>(null)
  const klaster = React.useRef<L.MarkerClusterGroup | null>(null)
  const marker = React.useRef<Map<number, L.Marker>>(new Map())
  const [cari, setCari] = React.useState('')
  const hasil = React.useMemo(() => titik.filter((a) => lolos(a, cari.trim())), [titik, cari])

  React.useEffect(() => {
    if (!wadah.current || peta.current) return
    const m = L.map(wadah.current, { center: PUSAT_BAWAAN, zoom: 12, zoomControl: true })
    L.tileLayer('/api/ubin/{z}/{x}/{y}', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m)
    const k = L.markerClusterGroup({ maxClusterRadius: 60, showCoverageOnHover: false, spiderfyOnMaxZoom: true })
    for (const a of titik) {
      const jenis = a.status === 'meninggal' ? 'meninggal' : a.aktif ? 'aktif' : 'nonaktif'
      const mk = L.marker([a.lat, a.lng], { icon: IKON[jenis], title: a.nama })
      mk.bindPopup(
        `<div style="font:15px/1.4 var(--font-sans, sans-serif);min-width:180px">` +
          (a.nomor ? `<div style="font-size:12px;color:#6b7280">${a.nomor}</div>` : '') +
          `<div style="font-weight:700;font-size:16px">${a.nama}</div>` +
          (a.alamat ? `<div style="color:#374151">${a.alamat}</div>` : '') +
          (a.noHp ? `<div style="color:#6b7280">${a.noHp}</div>` : '') +
          `<div style="margin-top:6px"><a href="/anggota/${a.id}" style="color:#1d4ed8;font-weight:600">Detail & riwayat →</a></div></div>`,
      )
      marker.current.set(a.id, mk)
      k.addLayer(mk)
    }
    m.addLayer(k)
    klaster.current = k
    peta.current = m
    if (titik.length > 0) m.fitBounds(k.getBounds().pad(0.15), { maxZoom: 15 })
    setTimeout(() => m.invalidateSize(), 150)
    return () => {
      m.remove()
      peta.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pencarian menyaring marker di klaster
  React.useEffect(() => {
    const k = klaster.current
    if (!k) return
    k.clearLayers()
    const daftar = hasil.map((a) => marker.current.get(a.id)!).filter(Boolean)
    k.addLayers(daftar)
    if (cari.trim() && daftar.length > 0 && peta.current) peta.current.fitBounds(k.getBounds().pad(0.2), { maxZoom: 16 })
  }, [hasil, cari])

  function terbangKe(a: TitikAnggota) {
    const m = peta.current
    const mk = marker.current.get(a.id)
    if (!m || !mk) return
    m.setView([a.lat, a.lng], 17)
    setTimeout(() => {
      klaster.current?.zoomToShowLayer(mk, () => mk.openPopup())
    }, 250)
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-[1000] flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Button asChild variant="halus">
          <Link href="/anggota">
            <ArrowLeft /> Anggota
          </Link>
        </Button>
        <h1 className="text-judul-kartu font-semibold">Peta Anggota</h1>
        <span className="text-ket text-muted">
          {titik.length} dari {totalAnggota} anggota punya titik peta
        </span>
        <div className="relative w-full sm:ml-auto sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input aria-label="Cari anggota di peta" placeholder="Cari nama, nomor, alamat…" className="pl-12 pr-11" value={cari} onChange={(e) => setCari(e.target.value)} autoComplete="off" />
          {cari && (
            <button type="button" onClick={() => setCari('')} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-input text-muted hover:bg-bg" aria-label="Hapus pencarian">
              <X className="size-4" />
            </button>
          )}
          {cari.trim() && (
            <ul className="absolute left-0 right-0 top-full z-[1001] mt-1 max-h-80 overflow-y-auto rounded-kartu border border-border bg-surface p-1.5 shadow-kartu">
              {hasil.length === 0 && <li className="px-3 py-3 text-isi text-muted">Tidak ada yang cocok.</li>}
              {hasil.slice(0, 30).map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => terbangKe(a)} className="flex w-full flex-col items-start rounded-input px-3 py-2 text-left hover:bg-bg">
                    <span className="font-semibold">
                      {a.nama}
                      {a.nomor && <span className="angka ml-2 text-ket font-normal text-muted">{a.nomor}</span>}
                    </span>
                    {a.alamat && <span className="line-clamp-1 text-ket text-muted">{a.alamat}</span>}
                  </button>
                </li>
              ))}
              {hasil.length > 30 && <li className="px-3 py-2 text-ket text-muted">…dan {hasil.length - 30} lagi. Persempit pencarian.</li>}
            </ul>
          )}
        </div>
      </header>
      <div className="relative flex-1">
        <div ref={wadah} className="absolute inset-0" aria-label="Peta alamat anggota" />
        <div className={cn('absolute bottom-4 left-4 z-[1000] flex flex-col gap-1 rounded-kartu border border-border bg-surface px-3 py-2 text-ket shadow-kartu')} aria-label="Keterangan warna">
          <span className="flex items-center gap-2"><span className="size-3 rounded-badge bg-primary" /> Aktif</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-badge bg-muted" /> Nonaktif</span>
          <span className="flex items-center gap-2"><span className="size-3 rounded-badge bg-keluar" /> Meninggal</span>
        </div>
        {titik.length === 0 && (
          <div className="absolute inset-x-4 top-4 z-[1000] rounded-kartu border border-border bg-surface p-4 text-isi shadow-kartu sm:left-1/2 sm:w-96 sm:-translate-x-1/2">
            Belum ada anggota yang punya titik peta. Buka <Link href="/anggota" className="font-semibold text-primary">Anggota</Link>, pilih Ubah, lalu klik peta untuk menaruh pin.
          </div>
        )}
      </div>
    </div>
  )
}
