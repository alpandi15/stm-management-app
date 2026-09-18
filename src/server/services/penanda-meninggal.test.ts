import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '@/server/db/schema'
import { seedJenisBawaan } from '@/server/db/seed'
import { batalkan, segarkan, terapkan } from './penanda-meninggal'
import { cariDuplikat, periksaKeluargaMilik, periksaNominal } from './aturan-catatan'

function dbUji() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  seedJenisBawaan(db)
  const kode = (k: string) => db.select().from(schema.jenis).where(eq(schema.jenis.kode, k)).get()!
  const budi = db.insert(schema.anggota).values({ nama: 'Budi Santoso', dibuatPada: 0 }).returning().get()
  const ani = db.insert(schema.anggotaKeluarga).values({ anggotaId: budi.id, nama: 'Ani Santoso', hubungan: 'Istri', dibuatPada: 0, diubahPada: 0 }).returning().get()
  const lain = db.insert(schema.anggota).values({ nama: 'Orang Lain', dibuatPada: 0 }).returning().get()
  const cahyo = db.insert(schema.anggotaKeluarga).values({ anggotaId: lain.id, nama: 'Cahyo', hubungan: 'Anak', dibuatPada: 0, diubahPada: 0 }).returning().get()
  let n = 0
  const catat = (v: Partial<typeof schema.transaksi.$inferInsert> & { jenisId: number }) => {
    const j = db.select().from(schema.jenis).where(eq(schema.jenis.id, v.jenisId)).get()!
    const tanggal = v.tanggal ?? '2026-03-10'
    const periode = v.periode ?? (j.periode === 'bulanan' ? tanggal.slice(0, 7) : j.periode === 'tahunan' ? tanggal.slice(0, 4) : null)
    return db
      .insert(schema.transaksi)
      .values({ noBukti: `X-${++n}`, tanggal, arah: 'keluar', keterangan: 'uji', jumlah: 1000, dibuatPada: 0, diubahPada: 0, ...v, periode })
      .returning()
      .get()
  }
  const statusBudi = () => db.select().from(schema.anggota).where(eq(schema.anggota.id, budi.id)).get()!
  const statusAni = () => db.select().from(schema.anggotaKeluarga).where(eq(schema.anggotaKeluarga.id, ani.id)).get()!
  return { db, kode, budi, ani, lain, cahyo, catat, statusBudi, statusAni }
}

test('seed: 22 jenis, PK01 satu-satunya penanda, periode PM01/PM03/PM10/PM11/PK01 benar, nominal kosong', () => {
  const { db, kode } = dbUji()
  const semua = db.select().from(schema.jenis).all()
  assert.equal(semua.length, 22)
  assert.deepEqual(semua.filter((j) => j.menandaiMeninggal).map((j) => j.kode), ['PK01'])
  assert.equal(kode('PM01').periode, 'bulanan')
  assert.equal(kode('PM03').periode, 'sekali')
  assert.equal(kode('PM10').periode, 'tahunan')
  assert.equal(kode('PM11').periode, 'sekali')
  assert.equal(kode('PK01').periode, 'sekali')
  assert.ok(semua.every((j) => j.nominalBawaan === null && !j.nominalDikunci))
})

test('santunan untuk tanggungan menandainya meninggal; anggotanya sendiri tidak', () => {
  const { kode, db, budi, ani, catat, statusBudi, statusAni } = dbUji()
  const t = catat({ jenisId: kode('PK01').id, anggotaId: budi.id, anggotaKeluargaId: ani.id })
  terapkan(db, t)
  assert.equal(statusAni().status, 'meninggal')
  assert.equal(statusAni().tanggalMeninggal, '2026-03-10')
  assert.equal(statusAni().ditandaiOlehTransaksiId, t.id)
  assert.equal(statusBudi().status, 'aktif')
})

test('santunan tanpa tanggungan menandai anggotanya sendiri; hapus mengembalikan semuanya', () => {
  const { kode, db, budi, catat, statusBudi } = dbUji()
  const t = catat({ jenisId: kode('PK01').id, anggotaId: budi.id })
  terapkan(db, t)
  assert.equal(statusBudi().status, 'meninggal')
  batalkan(db, t.id)
  assert.equal(statusBudi().status, 'aktif')
  assert.equal(statusBudi().tanggalMeninggal, null)
  assert.equal(statusBudi().ditandaiOlehTransaksiId, null)
  terapkan(db, t) // memulihkan menandai ulang
  assert.equal(statusBudi().status, 'meninggal')
})

test('status yang diisi manual tidak ikut dibatalkan (kembali seperti sebelumnya)', () => {
  const { kode, db, budi, catat, statusBudi } = dbUji()
  db.update(schema.anggota).set({ status: 'meninggal', tanggalMeninggal: '2026-01-01' }).where(eq(schema.anggota.id, budi.id)).run()
  const t = catat({ jenisId: kode('PK01').id, anggotaId: budi.id })
  terapkan(db, t)
  assert.equal(statusBudi().ditandaiOlehTransaksiId, null, 'penanda tidak diambil alih')
  batalkan(db, t.id)
  assert.equal(statusBudi().status, 'meninggal')
  assert.equal(statusBudi().tanggalMeninggal, '2026-01-01')
})

test('memindahkan sasaran membebaskan yang lama; mengganti jenis ke bukan penanda membatalkan', () => {
  const { kode, db, budi, ani, catat, statusBudi, statusAni } = dbUji()
  const t = catat({ jenisId: kode('PK01').id, anggotaId: budi.id })
  terapkan(db, t)
  assert.equal(statusBudi().status, 'meninggal')
  segarkan(db, { ...t, anggotaKeluargaId: ani.id })
  assert.equal(statusBudi().status, 'aktif')
  assert.equal(statusAni().status, 'meninggal')
  segarkan(db, { ...t, anggotaKeluargaId: ani.id, jenisId: kode('PK04').id })
  assert.equal(statusAni().status, 'aktif')
})

test('jenis tanpa sakelar tidak menandai siapa pun', () => {
  const { kode, db, budi, catat, statusBudi } = dbUji()
  terapkan(db, catat({ jenisId: kode('PK02').id, anggotaId: budi.id }))
  assert.equal(statusBudi().status, 'aktif')
})

test('tanggungan keluarga lain ditolak; tanggungan sendiri diterima', () => {
  const { db, budi, ani, cahyo } = dbUji()
  assert.throws(() => periksaKeluargaMilik(db, cahyo.id, budi.id), /bukan tanggungan nama yang dipilih/)
  assert.throws(() => periksaKeluargaMilik(db, 9999, budi.id), /tidak dikenali/)
  assert.equal(periksaKeluargaMilik(db, ani.id, budi.id), ani.id)
  assert.equal(periksaKeluargaMilik(db, null, budi.id), null)
})

test('nominal terkunci menolak jumlah berbeda; tidak terkunci menerima', () => {
  const j = { nama: 'Iuran Wajib Anggota', nominalBawaan: 50000, nominalDikunci: true }
  assert.throws(() => periksaNominal(j, 60000), /sudah ditetapkan Rp 50.000/)
  assert.doesNotThrow(() => periksaNominal(j, 50000))
  assert.doesNotThrow(() => periksaNominal({ ...j, nominalDikunci: false }, 60000))
  assert.doesNotThrow(() => periksaNominal({ nama: 'x', nominalBawaan: null, nominalDikunci: false }, 1))
})

test('duplikat per periode: bulanan, tahunan, sekali, bebas, dan nama lepas', () => {
  const { db, kode, budi, catat } = dbUji()
  const pm01 = kode('PM01'), pm10 = kode('PM10'), pm03 = kode('PM03'), pm02 = kode('PM02')
  catat({ jenisId: pm01.id, anggotaId: budi.id, arah: 'masuk', tanggal: '2026-09-03', jumlah: 50000 })
  const bulanSama = cariDuplikat(db, { tanggal: '2026-09-20', jenisId: pm01.id, jumlah: 50000, anggotaId: budi.id, namaPihak: 'Budi Santoso' }, pm01)
  assert.ok(bulanSama && /Budi Santoso sudah membayar Iuran Wajib Anggota untuk September 2026 \(nomor bukti X-1\)/.test(bulanSama.kalimat))
  assert.equal(cariDuplikat(db, { tanggal: '2026-10-03', jenisId: pm01.id, jumlah: 50000, anggotaId: budi.id }, pm01), null)

  catat({ jenisId: pm10.id, anggotaId: budi.id, arah: 'masuk', tanggal: '2026-01-15', jumlah: 120000 })
  assert.ok(cariDuplikat(db, { tanggal: '2026-12-01', jenisId: pm10.id, jumlah: 120000, anggotaId: budi.id }, pm10))
  assert.equal(cariDuplikat(db, { tanggal: '2027-01-01', jenisId: pm10.id, jumlah: 120000, anggotaId: budi.id }, pm10), null)

  catat({ jenisId: pm03.id, anggotaId: budi.id, arah: 'masuk', tanggal: '2026-01-12', jumlah: 250000 })
  const sekali = cariDuplikat(db, { tanggal: '2029-05-05', jenisId: pm03.id, jumlah: 250000, anggotaId: budi.id, namaPihak: 'Budi Santoso' }, pm03)
  assert.ok(sekali && /sudah pernah membayar Uang Pangkal Anggota Baru pada 12 Januari 2026 \(X-3\)\. Uang pangkal biasanya hanya sekali/.test(sekali.kalimat))

  // Nama lepas (tanpa anggota): aturan lama tanggal + jenis + jumlah
  catat({ jenisId: pm02.id, arah: 'masuk', tanggal: '2026-09-03', jumlah: 10000, namaPihak: 'Warga' })
  assert.ok(cariDuplikat(db, { tanggal: '2026-09-03', jenisId: pm02.id, jumlah: 10000, anggotaId: null }, pm02))
  assert.equal(cariDuplikat(db, { tanggal: '2026-09-03', jenisId: pm02.id, jumlah: 20000, anggotaId: null }, pm02), null)
  // Periode bulanan tapi nama lepas → aturan lama juga
  assert.equal(cariDuplikat(db, { tanggal: '2026-09-20', jenisId: pm01.id, jumlah: 50000, anggotaId: null }, pm01), null)
})

test('periode eksplisit: setoran 18 Sep untuk Oktober tidak dianggap duplikat September, tapi duplikat Oktober', () => {
  const { db, kode, budi, catat } = dbUji()
  const pm01 = kode('PM01')
  catat({ jenisId: pm01.id, anggotaId: budi.id, arah: 'masuk', tanggal: '2026-09-18', periode: '2026-10', jumlah: 50000 })
  assert.equal(cariDuplikat(db, { tanggal: '2026-09-25', jenisId: pm01.id, jumlah: 50000, anggotaId: budi.id }, pm01), null)
  const okt = cariDuplikat(db, { tanggal: '2026-09-25', jenisId: pm01.id, jumlah: 50000, anggotaId: budi.id, periode: '2026-10', namaPihak: 'Budi' }, pm01)
  assert.ok(okt && /untuk Oktober 2026/.test(okt.kalimat))
})
