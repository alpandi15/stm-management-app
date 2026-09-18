'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { TEMA, type Tema } from '@/server/db/schema'
import { berhasil, gagal } from '@/lib/hasil'

// Fase 3 hanya membawa pilihan tema. Identitas STM, saldo awal, PIN, dan lainnya
// menyusul di Fase 8 (docs/04).

export const aturTema = aksiTerlindungi(async (tema: Tema) => {
  if (!TEMA.includes(tema)) return gagal('Pilihan tampilan tidak dikenali.')
  db.update(schema.pengaturan)
    .set({ tema, diubahPada: Date.now() })
    .where(eq(schema.pengaturan.id, 1))
    .run()
  revalidatePath('/', 'layout')
  return berhasil(undefined)
})
