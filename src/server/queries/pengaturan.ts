import 'server-only'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/server/db'
import type { Pengaturan } from '@/server/db/schema'

/** Baris pengaturan tunggal (id = 1), atau null bila pengaturan awal belum dijalankan. */
export function ambilPengaturan(): Pengaturan | null {
  return db.select().from(schema.pengaturan).where(eq(schema.pengaturan.id, 1)).get() ?? null
}

export function sudahSetup(): boolean {
  return ambilPengaturan() !== null
}

/** Data yang aman dikirim ke layar kunci: tidak ada hash, tidak ada penghitung. */
export function identitasUntukLayarKunci(): { namaStm: string; namaBendahara: string } | null {
  const p = ambilPengaturan()
  return p ? { namaStm: p.namaStm, namaBendahara: p.namaBendahara } : null
}
