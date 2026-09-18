import { count } from 'drizzle-orm'
import { db, dbFile, schema } from '@/server/db'
import { formatRupiah, terbilangRupiah } from '@/lib/rupiah'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { ujiTerbilang } from '@/server/actions/uji-fondasi'

// Halaman sementara Fase 1: membuktikan rantai Next → Drizzle → SQLite dan token desain.
// Digantikan layar kunci PIN pada Fase 2.
export const dynamic = 'force-dynamic'

export default function Halaman() {
  const totalJenis = db.select({ n: count() }).from(schema.jenis).get()?.n ?? 0
  const daftarJenis = db.select().from(schema.jenis).orderBy(schema.jenis.urutan).all()
  const contoh = 1_250_000

  return (
    <main className="mx-auto max-w-konten p-6">
      <h1 className="text-judul font-bold">Aplikasi Kas STM</h1>
      <p className="mt-1 text-ket text-muted">
        Fondasi siap · {formatTanggal(hariIni())} · database: {dbFile}
      </p>

      <section className="mt-6 rounded-kartu bg-surface p-6 shadow-kartu border border-border">
        <h2 className="text-judul-kartu font-semibold">Sisa Uang Kas (contoh)</h2>
        <p className="angka mt-2 text-saldo font-bold text-primary">{formatRupiah(contoh)}</p>
        <p className="mt-1 text-ket text-muted">{terbilangRupiah(contoh)}</p>
      </section>

      <form
        action={async (formData) => {
          'use server'
          // Hasil dicetak ke log server: dibaca saat uji runtime Electron 22
          console.log('[uji-fondasi]', JSON.stringify(await ujiTerbilang(formData)))
        }}
        className="mt-6 flex gap-3"
      >
        <input name="jumlah" defaultValue="1250000" className="h-sentuh rounded-input border border-border bg-surface px-4 text-form" />
        <button type="submit" className="h-sentuh rounded-input bg-primary px-6 font-semibold text-primary-fg">Uji</button>
      </form>

      <section className="mt-6 rounded-kartu bg-surface p-6 shadow-kartu border border-border">
        <h2 className="text-judul-kartu font-semibold">Jenis bawaan: {totalJenis}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {daftarJenis.map((j) => (
            <li key={j.id} className="flex min-h-sentuh items-center justify-between rounded-input border border-border px-4">
              <span>{j.nama}</span>
              <span
                className={
                  j.arah === 'masuk'
                    ? 'rounded-badge bg-masuk-soft px-3 py-1 text-ket font-semibold text-masuk'
                    : 'rounded-badge bg-keluar-soft px-3 py-1 text-ket font-semibold text-keluar'
                }
              >
                {j.arah === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
