import { defineConfig } from 'drizzle-kit'
import path from 'node:path'

// Dipakai oleh drizzle-kit (generate/migrate/studio) saat pengembangan.
// Lokasi database mengikuti variabel yang sama dengan aplikasi (docs/02 §2.3).
const dataDir = process.env.STM_DATA_DIR ?? './data'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: path.join(dataDir, 'stm.db') },
  strict: true,
  verbose: true,
})
