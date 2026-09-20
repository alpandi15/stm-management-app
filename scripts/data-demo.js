// Data dummy untuk tangkapan layar — dijalankan setelah setup (tabel sudah ada).
module.exports = function seed(d) {
  const t = (s) => Date.parse(s)
  d.prepare("update pengaturan set tanggal_mulai='2026-01-01', alamat='Jl. Melati Raya Blok C, Sambirejo Timur, Percut Sei Tuan', nama_ketua='Bpk. H. Ahmad Syarif', saldo_awal=2350000").run()
  const rt = d.prepare("insert into rt (nama, keterangan, urutan, dibuat_pada) values (?,?,?,?)")
  const rtId = {}
  for (const [i, [n, k]] of [['RT 01', 'Ketua RT Bpk. Surya'], ['RT 02', 'Ketua RT Bpk. Hasibuan'], ['RT 03', 'Ketua RT Ibu Ratna'], ['RT 04', 'Blok C ujung, dekat masjid']].entries()) rtId[n] = rt.run(n, k, i + 1, t('2026-01-05')).lastInsertRowid
  const nama = ['Budi Santoso','Siti Aminah','Ahmad Fauzi','Dewi Lestari','Eko Prasetyo','Fitri Handayani','Gunawan Wibowo','Hendra Saputra','Indah Permata','Joko Susilo','Kartika Sari','Lukman Hakim','Maya Anggraini','Nurdin Halim','Putri Rahayu','Rahmat Hidayat','Sri Mulyani','Taufik Ismail','Umi Kalsum','Wahyu Nugroho','Yanti Kusuma','Zainal Abidin','Agus Salim','Bambang Irawan','Citra Dewi','Dian Permata','Erna Wati','Fajar Ramadhan','Hasan Basri','Ika Nurjanah','Jumadi Siregar','Khairul Anwar','Lina Marlina','Mulyadi Nasution','Nita Sari','Oki Setiawan','Rina Sitompul','Sutrisno','Tini Suharti','Usman Harahap']
  const jalan = ['Jl. Melati', 'Jl. Kenanga', 'Jl. Anggrek', 'Jl. Mawar', 'Gang Dahlia', 'Jl. Cempaka']
  const rts = Object.values(rtId)
  const ins = d.prepare("insert into anggota (nomor, nama, jenis_kelamin, no_hp, alamat, rt_id, lat, lng, aktif, pengutip, status, tanggal_meninggal, tanggal_bergabung, tanggal_nonaktif, dibuat_pada) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  const ids = []
  for (let i = 0; i < nama.length; i++) {
    const p = ['Siti','Dewi','Fitri','Indah','Kartika','Maya','Putri','Sri','Umi','Yanti','Citra','Dian','Erna','Ika','Lina','Nita','Rina','Tini'].some((x) => nama[i].startsWith(x)) ? 'P' : 'L'
    const meninggal = i === 21 || i === 33
    const nonaktif = i === 37
    ids.push(ins.run(`A-${String(i + 1).padStart(4, '0')}`, nama[i], p, i % 3 === 0 ? `0812-${3000 + i * 37}-${1000 + i * 91}` : null, `${jalan[i % jalan.length]} No. ${(i * 7) % 40 + 1}, Blok C`, rts[i % 4], 3.5916998 + ((i * 37) % 23 - 11) * 0.0007, 98.7858193 + ((i * 53) % 29 - 14) * 0.0009, nonaktif ? 0 : 1, i === 15 || i === 6 ? 1 : 0, meninggal ? 'meninggal' : 'aktif', i === 21 ? '2026-03-14' : i === 33 ? '2026-07-02' : null, i >= 36 ? '2026-06-01' : null, nonaktif ? '2026-05-10' : null, t('2026-01-05') + i * 60000).lastInsertRowid)
  }
  const kel = d.prepare("insert into anggota_keluarga (anggota_id, nama, hubungan, jenis_kelamin, tanggal_lahir, status, tanggal_meninggal, keterangan, dibuat_pada, diubah_pada) values (?,?,?,?,?,?,?,?,?,?)")
  kel.run(ids[0], 'Siti Rahma', 'Istri', 'P', '1985-04-12', 'aktif', null, null, t('2026-01-05'), t('2026-01-05'))
  kel.run(ids[0], 'Rina Santoso', 'Anak', 'P', '2010-03-02', 'aktif', null, 'Kuliah di Medan', t('2026-01-05'), t('2026-01-05'))
  kel.run(ids[0], 'Doni Santoso', 'Anak', 'L', '2014-08-19', 'aktif', null, null, t('2026-01-05'), t('2026-01-05'))
  const sumi = kel.run(ids[0], 'Nenek Sumi', 'Orang Tua', 'P', '1940-01-01', 'meninggal', '2026-08-12', null, t('2026-01-05'), t('2026-08-12')).lastInsertRowid
  kel.run(ids[2], 'Aisyah Fauzi', 'Istri', 'P', '1988-11-30', 'aktif', null, null, t('2026-01-05'), t('2026-01-05'))
  kel.run(ids[2], 'Rizky Fauzi', 'Anak', 'L', '2012-05-05', 'aktif', null, null, t('2026-01-05'), t('2026-01-05'))
  kel.run(ids[4], 'Sari Prasetyo', 'Istri', 'P', '1990-02-14', 'aktif', null, null, t('2026-01-05'), t('2026-01-05'))
  const kartim = kel.run(ids[9], 'Bpk. Kartim', 'Orang Tua', 'L', '1945-06-01', 'meninggal', '2026-05-20', null, t('2026-01-05'), t('2026-05-20')).lastInsertRowid
  // Buku Duka: 4 kejadian (2 × 5.000 pengurus lama, 2 × 7.000)
  const kj = d.prepare("insert into kejadian_duka (nomor, nama_almarhum, hubungan, anggota_id, anggota_keluarga_id, tanggal_meninggal, tarif, keterangan, dibuat_pada, diubah_pada) values (?,?,?,?,?,?,?,?,?,?)")
  const k1 = kj.run(1, 'Bpk. Karim', 'Anggota', null, null, '2026-02-08', 5000, 'Pengurus lama', t('2026-02-08'), t('2026-02-08')).lastInsertRowid
  const k2 = kj.run(2, 'Zainal Abidin', 'Anggota · A-0022', ids[21], null, '2026-03-14', 5000, null, t('2026-03-14'), t('2026-03-14')).lastInsertRowid
  const k3 = kj.run(3, 'Bpk. Kartim', 'Orang Tua dari Joko Susilo', ids[9], kartim, '2026-05-20', 7000, 'Tarif baru mulai Mei', t('2026-05-20'), t('2026-05-20')).lastInsertRowid
  const k4 = kj.run(4, 'Nenek Sumi', 'Orang Tua dari Budi Santoso', ids[0], sumi, '2026-08-12', 7000, null, t('2026-08-12'), t('2026-08-12')).lastInsertRowid
  const bayar = d.prepare("insert or ignore into pembayaran_duka (kejadian_id, anggota_id, tanggal_bayar, dibuat_pada) values (?,?,?,?)")
  ids.forEach((id, i) => {
    if (i < 36) { bayar.run(k1, id, '2026-02-15', t('2026-02-15')); if (i % 9 !== 4) bayar.run(k2, id, '2026-03-22', t('2026-03-22')) }
    if (i < 36 && i % 5 !== 2) bayar.run(k3, id, '2026-05-28', t('2026-05-28'))
    if (i % 3 !== 1) bayar.run(k4, id, '2026-08-20', t('2026-08-20'))
  })
  const lama = d.prepare("insert into tunggakan_duka_lama (anggota_id, jumlah, tarif, keterangan, dibuat_pada, diubah_pada) values (?,?,?,?,?,?)")
  lama.run(ids[25], 6, 5000, 'Januari–Mei 2026, pengurus lama', t('2026-09-01'), t('2026-09-01'))
  lama.run(ids[25], 10, 7000, 'Mei 2026 sampai sekarang', t('2026-09-01'), t('2026-09-01'))
  lama.run(ids[13], 3, 5000, 'Tahun 2025', t('2026-09-01'), t('2026-09-01'))
  // Transaksi
  const J = Object.fromEntries(d.prepare("select kode, id from jenis").all().map((r) => [r.kode, r.id]))
  d.prepare("update jenis set nominal_bawaan=50000, nominal_dikunci=1 where kode='PM01'").run()
  d.prepare("update jenis set nominal_bawaan=120000 where kode='PM10'").run()
  d.prepare("update jenis set nominal_bawaan=1500000, nominal_dikunci=1 where kode='PK01'").run()
  let km = 0, kk = 0
  const trx = d.prepare("insert into transaksi (no_bukti, tanggal, arah, jenis_id, anggota_id, anggota_keluarga_id, penyetor_anggota_id, periode, setoran_id, nama_pihak, keterangan, metode, jumlah, dibuat_pada, diubah_pada) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  const st = d.prepare("insert into setoran (nomor, tanggal, jenis_id, periode, penyetor_anggota_id, keterangan, metode, dibuat_pada, diubah_pada) values (?,?,?,?,?,?,?,?,?)")
  const masuk = (tgl, kode, a, ket, jumlah, ekstra = {}) => trx.run(`KM-2026-${String(++km).padStart(4, '0')}`, tgl, 'masuk', J[kode], a ?? null, ekstra.keluarga ?? null, ekstra.penyetor ?? null, ekstra.periode ?? null, ekstra.setoran ?? null, a ? nama[ids.indexOf(a)] : ekstra.pihak ?? null, ket, ekstra.metode ?? 'tunai', jumlah, t(tgl) + (ekstra.jam ?? 9) * 3600000, t(tgl) + (ekstra.jam ?? 9) * 3600000)
  const keluar = (tgl, kode, a, ket, jumlah, ekstra = {}) => trx.run(`KK-2026-${String(++kk).padStart(4, '0')}`, tgl, 'keluar', J[kode], a ?? null, ekstra.keluarga ?? null, ekstra.penyetor ?? null, null, null, a ? nama[ids.indexOf(a)] : ekstra.pihak ?? null, ket, ekstra.metode ?? 'tunai', jumlah, t(tgl) + (ekstra.jam ?? 10) * 3600000, t(tgl) + (ekstra.jam ?? 10) * 3600000)
  let ns = 0
  const bulan = ['01','02','03','04','05','06','07','08','09']
  for (const b of bulan) {
    const tgl = `2026-${b}-0${Number(b) % 2 === 0 ? 6 : 8}`
    // setoran kolektif iuran wajib lewat pengutip Rahmat (RT 01 & 03) dan Gunawan (RT 02 & 04)
    for (const [peng, ganjil] of [[ids[15], 0], [ids[6], 1]]) {
      const sid = st.run(`SI-2026-${String(++ns).padStart(4, '0')}`, tgl, J.PM01, `2026-${b}`, peng, `Kutipan iuran wajib ${['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September'][Number(b)]}`, 'tunai', t(tgl) + 8 * 3600000, t(tgl) + 8 * 3600000).lastInsertRowid
      ids.forEach((id, i) => { if (i % 2 === ganjil && i < 36 && (i * 7 + Number(b)) % 9 !== 0) masuk(tgl, 'PM01', id, `Iuran Wajib Anggota — ${['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September'][Number(b)]} 2026`, 50000, { penyetor: peng, periode: `2026-${b}`, setoran: sid, jam: 8 }) })
    }
    masuk(`2026-${b}-15`, 'PM02', ids[Number(b) * 3 % 36], 'Iuran sukarela', 25000 + Number(b) * 5000, { jam: 11 })
    keluar(`2026-${b}-20`, 'PK04', null, `Konsumsi rapat bulanan ${b}/2026`, 150000 + Number(b) * 10000, { pihak: 'Warung Bu Ida', jam: 14 })
  }
  masuk('2026-01-10', 'PM10', ids[0], 'Iuran Tahunan — 2026', 120000, { periode: '2026' })
  masuk('2026-01-10', 'PM10', ids[2], 'Iuran Tahunan — 2026', 120000, { periode: '2026' })
  masuk('2026-02-12', 'PM12', null, 'Iuran duka alm. Bpk. Karim, 36 anggota', 180000, { penyetor: ids[15], jam: 16 })
  masuk('2026-03-20', 'PM12', null, 'Iuran duka alm. Zainal Abidin, 32 anggota', 160000, { penyetor: ids[6] })
  masuk('2026-05-26', 'PM12', null, 'Iuran duka alm. Bpk. Kartim, 29 anggota', 203000, { penyetor: ids[15] })
  masuk('2026-08-18', 'PM12', null, 'Iuran duka alm. Nenek Sumi, 27 anggota', 189000, { penyetor: ids[6] })
  masuk('2026-04-03', 'PM04', null, 'Sumbangan Bpk. H. Ahmad untuk kegiatan 17 Agustus', 500000, { pihak: 'Bpk. H. Ahmad Syarif', metode: 'transfer' })
  masuk('2026-06-02', 'PM03', ids[36], 'Uang pangkal anggota baru', 100000)
  masuk('2026-06-02', 'PM03', ids[37], 'Uang pangkal anggota baru', 100000)
  masuk('2026-08-25', 'PM06', null, 'Hasil bazar 17 Agustus', 1250000, { pihak: 'Panitia 17 Agustus', metode: 'transfer' })
  keluar('2026-03-15', 'PK01', ids[21], 'Santunan duka alm. Zainal Abidin', 1500000, { jam: 9 })
  keluar('2026-05-21', 'PK01', ids[9], 'Santunan duka alm. Bpk. Kartim', 1500000, { keluarga: kartim })
  keluar('2026-08-13', 'PK01', ids[0], 'Santunan duka alm. Nenek Sumi', 1500000, { keluarga: sumi })
  keluar('2026-04-18', 'PK02', ids[12], 'Bantuan rawat inap RS Haji', 500000)
  keluar('2026-07-11', 'PK03', ids[27], 'Bantuan pernikahan', 300000)
  keluar('2026-08-16', 'PK07', null, 'Sewa tenda & kursi 17 Agustus', 750000, { pihak: 'CV Tenda Jaya', metode: 'transfer' })
  keluar('2026-02-03', 'PK06', null, 'Buku kas, pulpen, stempel', 85000, { pihak: 'Toko Gramedia' })
  keluar('2026-09-12', 'PK09', null, 'Sumbangan korban banjir Desa Sena', 400000, { pihak: 'Posko Banjir Sena', metode: 'transfer' })
  d.prepare("update anggota set ditandai_oleh_transaksi_id=(select id from transaksi where keterangan like 'Santunan duka alm. Zainal%') where id=?").run(ids[21])
  return { ids, km, kk }
}
