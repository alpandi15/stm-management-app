// Fungsi murni seputar PIN dan kode pemulihan — tanpa database, supaya bisa diuji langsung.
import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

const COST = 10

/** Enam angka sama (111111) atau berurutan naik/turun (123456, 654321) — docs/02 §4.2. */
export function pinMudahDitebak(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true
  const d = pin.split('').map(Number)
  const sama = d.every((x) => x === d[0])
  const naik = d.every((x, i) => i === 0 || x === d[i - 1] + 1)
  const turun = d.every((x, i) => i === 0 || x === d[i - 1] - 1)
  return sama || naik || turun
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, COST)
}

export async function cocokPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

// Alfabet tanpa karakter rancu: tanpa I, O, 0, 1 (docs/02 §4.2)
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Kode pemulihan 10 karakter, format XXXXX-XXXXX. */
export function buatKodePemulihan(): string {
  let k = ''
  for (let i = 0; i < 10; i++) k += ALFABET[randomInt(ALFABET.length)]
  return `${k.slice(0, 5)}-${k.slice(5)}`
}

/** Menerima ketikan pengguna dengan spasi/huruf kecil/tanpa strip, mengembalikan bentuk baku. */
export function normalisasiKode(teks: string): string {
  const bersih = teks.toUpperCase().replace(/[^A-Z2-9]/g, '')
  return bersih.length === 10 ? `${bersih.slice(0, 5)}-${bersih.slice(5)}` : bersih
}

export async function hashKode(kode: string): Promise<string> {
  return bcrypt.hash(kode, COST)
}

export async function cocokKode(kode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalisasiKode(kode), hash)
}

/**
 * Jeda setelah percobaan gagal (docs/02 §4.3): pada kelipatan 5 —
 * ke-5 → 1 menit, ke-10 → 5 menit, ke-15 dan seterusnya → 15 menit. Selain itu 0.
 */
export function jedaKunciMs(gagalLogin: number): number {
  if (gagalLogin <= 0 || gagalLogin % 5 !== 0) return 0
  if (gagalLogin === 5) return 1 * 60_000
  if (gagalLogin === 10) return 5 * 60_000
  return 15 * 60_000
}

/** Kalimat ramah untuk sisa waktu kunci. */
export function kalimatJeda(sisaDetik: number): string {
  if (sisaDetik >= 60) {
    const menit = Math.ceil(sisaDetik / 60)
    return `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.`
  }
  return `Terlalu banyak percobaan. Coba lagi dalam ${sisaDetik} detik.`
}
