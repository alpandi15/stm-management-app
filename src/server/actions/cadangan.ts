'use server'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { aksiTerlindungi } from '@/server/auth/session'
import { GalatPengguna } from '@/server/galat'
import * as service from '@/server/services/cadangan'
import { berhasil, gagal, type HasilAksi } from '@/lib/hasil'

function tangkap<T>(fn: () => T): HasilAksi<T> {
  try {
    return berhasil(fn())
  } catch (e) {
    if (e instanceof GalatPengguna) return gagal(e.message, e.field)
    throw e
  }
}

/** Dari Electron: path hasil dialog simpan. */
export const cadangkanKeLokasi = aksiTerlindungi(async (tujuan: string) => {
  if (!path.isAbsolute(tujuan) || !tujuan.endsWith('.db')) return gagal('Lokasi penyimpanan tidak sah.')
  const hasil = tangkap(() => service.cadangkanKe(tujuan))
  revalidatePath('/pengaturan')
  return hasil
})

/** Cadangan manual ke folder cadangan (tanpa dialog) — dipakai juga saat browser. */
export const cadangkanKeFolder = aksiTerlindungi(async () => {
  const hasil = tangkap(() => service.cadangkanKe(path.join(service.cadanganDir, `manual-${service.namaCadanganBaru().replace('stm-cadangan-', '')}`)))
  revalidatePath('/pengaturan')
  return hasil
})

export const periksaBerkasPulihkan = aksiTerlindungi(async (berkas: string) => tangkap(() => service.periksaBerkasPulihkan(berkas)))

export const unggahBerkasPulihkan = aksiTerlindungi(async (fd: FormData) => {
  const b = fd.get('berkas')
  if (!b || typeof b === 'string' || b.size === 0) return gagal('Pilih dulu berkas cadangan (.db).')
  try {
    const p = await service.simpanUnggahanPulihkan(b)
    return berhasil(service.periksaBerkasPulihkan(p))
  } catch (e) {
    if (e instanceof GalatPengguna) return gagal(e.message)
    throw e
  }
})

export const pulihkanDari = aksiTerlindungi(async (berkas: string) => {
  const hasil = tangkap(() => service.pulihkanDari(berkas))
  if (hasil.ok) revalidatePath('/', 'layout')
  return hasil
})
