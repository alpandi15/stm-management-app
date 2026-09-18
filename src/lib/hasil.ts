/** Bentuk seragam hasil setiap Server Action (docs/02 §10). */
export type HasilAksi<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; pesan: string; field?: string }

export function gagal(pesan: string, field?: string): { ok: false; pesan: string; field?: string } {
  return field ? { ok: false, pesan, field } : { ok: false, pesan }
}

export function berhasil<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}
