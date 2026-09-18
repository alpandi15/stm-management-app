'use client'
import * as React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Titik awal peta bila belum ada pin: Medan (permintaan pengguna). */
export const PUSAT_BAWAAN: [number, number] = [3.5916998, 98.7858193]

// Ikon marker: Leaflet mencari gambar lewat path relatif yang tidak ada di bundel Next;
// pakai SVG inline supaya tidak bergantung berkas luar.
const ikonPin = L.divIcon({
  className: '',
  html: '<svg width="36" height="44" viewBox="0 0 36 44" fill="none"><path d="M18 43C18 43 33 25.5 33 16A15 15 0 0 0 3 16c0 9.5 15 27 15 27Z" fill="#1d4ed8" stroke="#fff" stroke-width="2"/><circle cx="18" cy="16" r="6" fill="#fff"/></svg>',
  iconSize: [36, 44],
  iconAnchor: [18, 43],
})

/**
 * Pilih titik alamat di peta (Leaflet + ubin OpenStreetMap, gratis). Klik peta atau seret pin.
 * Ubin butuh internet; tanpa internet peta abu-abu tapi pin dan koordinat tetap bekerja.
 */
export function PetaPin({ lat, lng, onUbah }: { lat: number | null; lng: number | null; onUbah: (titik: { lat: number; lng: number } | null) => void }) {
  const wadah = React.useRef<HTMLDivElement>(null)
  const peta = React.useRef<L.Map | null>(null)
  const pin = React.useRef<L.Marker | null>(null)
  const onUbahRef = React.useRef(onUbah)
  onUbahRef.current = onUbah

  React.useEffect(() => {
    if (!wadah.current || peta.current) return
    const m = L.map(wadah.current, { center: lat != null && lng != null ? [lat, lng] : PUSAT_BAWAAN, zoom: lat != null ? 16 : 13, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => {
      const t = { lat: Number(e.latlng.lat.toFixed(7)), lng: Number(e.latlng.lng.toFixed(7)) }
      letakkan(t)
      onUbahRef.current(t)
    })
    peta.current = m
    if (lat != null && lng != null) letakkan({ lat, lng })
    // Dialog/sheet baru saja terbuka: ukuran wadah belum final
    setTimeout(() => m.invalidateSize(), 150)
    return () => {
      m.remove()
      peta.current = null
      pin.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function letakkan(t: { lat: number; lng: number }) {
    const m = peta.current
    if (!m) return
    if (!pin.current) {
      pin.current = L.marker([t.lat, t.lng], { icon: ikonPin, draggable: true }).addTo(m)
      pin.current.on('dragend', () => {
        const p = pin.current!.getLatLng()
        onUbahRef.current({ lat: Number(p.lat.toFixed(7)), lng: Number(p.lng.toFixed(7)) })
      })
    } else {
      pin.current.setLatLng([t.lat, t.lng])
    }
  }

  function hapusPin() {
    pin.current?.remove()
    pin.current = null
    onUbah(null)
  }

  function lokasiSaya() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const t = { lat: Number(pos.coords.latitude.toFixed(7)), lng: Number(pos.coords.longitude.toFixed(7)) }
      peta.current?.setView([t.lat, t.lng], 16)
      letakkan(t)
      onUbah(t)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={wadah} className="h-64 w-full overflow-hidden rounded-input border border-border bg-bg" aria-label="Peta alamat" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="sekunder" onClick={lokasiSaya}>
          <LocateFixed /> Lokasi saya
        </Button>
        <Button type="button" variant="halus" onClick={hapusPin} disabled={lat == null}>
          <MapPinOff /> Hapus pin
        </Button>
        <span className="angka text-ket text-muted">{lat != null && lng != null ? `${lat}, ${lng}` : 'Klik peta untuk menaruh pin'}</span>
      </div>
    </div>
  )
}
