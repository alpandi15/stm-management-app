import path from 'node:path'

/** Folder data: database, foto bukti, cadangan, kunci sesi. Diisi Electron ke `userData`. */
export const dataDir = path.resolve(process.env.STM_DATA_DIR ?? './data')

/** Folder berkas migrasi hasil drizzle-kit. Ikut disalin ke bundel standalone (docs/03 §2). */
export const migrationsDir = process.env.STM_MIGRATIONS_DIR ?? path.join(process.cwd(), 'drizzle')
