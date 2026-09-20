const { app, BrowserWindow, nativeTheme } = require('electron'); const fs = require('fs'); const path = require('path')
const URL = 'http://127.0.0.1:3985'; const tidur = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = process.env.OUT; const W = 1366, H = 768
let win, n = 0; const catat = (s) => console.log(`[${++n}] ${s}`)
const js = async (k) => { try { return await win.webContents.executeJavaScript(k, true) } catch (e) { return 'ERR' } }
async function tunggu(k, batas = 15000) { const m = Date.now(); while (Date.now() - m < batas) { if ((await js(k)) === true) return; await tidur(150) } throw new Error('habis waktu: ' + k) }
const isi = (sel, v) => js(`(() => { const el = document.querySelector('${sel}'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
const klik = (t) => js(`(() => { const b = [...document.querySelectorAll('button, a')].find(b => b.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(t)} && b.offsetParent !== null); if (!b) return false; b.click(); return true })()`)
const ketik = async (teks) => { for (const ch of teks) { win.webContents.sendInputEvent({ type: 'char', keyCode: ch }); await tidur(20) }; await tidur(250) }
async function klikNyata(ekspresi) { const r = await js(`(() => { const el = (${ekspresi}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`); if (!r || r === 'ERR') throw new Error('elemen tidak ada: ' + ekspresi); for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) { win.webContents.sendInputEvent({ type, x: Math.round(r.x), y: Math.round(r.y), button: 'left', clickCount: 1 }); await tidur(60) } await tidur(300) }
// Tangkapan penuh halaman: tinggi jendela disesuaikan dengan tinggi dokumen (maks 2600px)
async function foto(nama, { penuh = true, maks = 2600 } = {}) {
  await js(`window.scrollTo(0, 0)`); await tidur(150)
  let h = H
  if (penuh) h = Math.min(maks, Math.max(H, await js(`document.documentElement.scrollHeight`)))
  win.setContentSize(W, h); await tidur(450)
  fs.writeFileSync(path.join(OUT, nama + '.png'), (await win.webContents.capturePage()).toPNG())
  win.setContentSize(W, H); await tidur(200)
  catat(nama)
}
const buka = async (u, ms = 1200) => { await win.loadURL(URL + u); await tidur(ms) }
app.whenReady().then(async () => {
  try {
    nativeTheme.themeSource = 'light'
    win = new BrowserWindow({ width: W, height: H, show: false, useContentSize: true })
    // ---- Pengaturan awal (wizard 3 langkah + kode pemulihan)
    await buka('/'); await tunggu(`location.pathname === '/setup'`)
    await foto('01-setup-nama-stm', { penuh: false })
    await isi('#nama-stm', 'STM Setia Kawan Blok C'); await js(`document.querySelector('form').requestSubmit()`); await tidur(500)
    await isi('#nama-bendahara', 'Ibu Sari Wulandari'); await foto('02-setup-bendahara', { penuh: false })
    await js(`document.querySelector('form').requestSubmit()`); await tidur(500)
    for (const d of '2468') { await klik(d); await tidur(60) }
    await foto('03-setup-pin', { penuh: false })
    for (const d of '10') { await klik(d); await tidur(60) } await tidur(1200)
    for (const d of '246810') { await klik(d); await tidur(60) } await tidur(1200)
    await tunggu(`!!document.querySelector('#sudah-simpan')`)
    await foto('04-setup-kode-pemulihan', { penuh: false })
    await js(`document.querySelector('#sudah-simpan').click()`); await tidur(200); await klik('Lanjut ke Beranda')
    await tunggu(`location.pathname === '/beranda'`, 20000)
    // ---- Isi data dummy langsung ke database (tabel & jenis bawaan sudah ada)
    const d = require('better-sqlite3')(process.env.STM_DATA_DIR + '/stm.db')
    const { ids, km, kk } = require('./data-demo.js')(d)
    catat(`data dummy: ${ids.length} anggota, ${km} uang masuk, ${kk} uang keluar`)
    // Beberapa perubahan lewat UI supaya Riwayat terisi: ubah + hapus + kembalikan
    await buka('/catatan/baru?jenis=masuk'); await tidur(600)
    await klikNyata(`document.querySelector('#jenisId')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await ketik('denda'); await klikNyata(`document.querySelector('[role=dialog] [cmdk-item]')`); await tidur(300)
    await isi('#keterangan', 'Denda keterlambatan iuran 2 bulan'); await klikNyata(`document.querySelector('#pihak')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await ketik('hendra'); await klikNyata(`document.querySelector('[role=dialog] [cmdk-item]')`); await tidur(300)
    await isi('#jumlah', '20000'); await tidur(200)
    await foto('10-catat-uang-masuk-terisi')
    await klikNyata(`document.querySelector('#jenisId')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await tidur(300)
    await foto('11-catat-pilihan-modal', { penuh: false })
    await js(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Batal').click()`); await tidur(300)
    await js(`window.scrollTo(0, 700)`); await tidur(500); win.setContentSize(W, H); fs.writeFileSync(path.join(OUT, '12-catat-bilah-lengket.png'), (await win.webContents.capturePage()).toPNG()); catat('12-catat-bilah-lengket')
    await js(`document.querySelector('main form').requestSubmit()`); await tunggu(`location.pathname === '/catatan'`, 20000); await tidur(800)
    // ---- Kunci & buka PIN
    await klik('Kunci'); await tunggu(`location.pathname === '/'`, 10000); await tidur(800)
    await foto('05-kunci-pin', { penuh: false })
    for (const x of '246810') { await klik(x); await tidur(50) } await tunggu(`location.pathname === '/beranda'`, 15000); await tidur(1000)
    await foto('06-beranda')
    // ---- Catatan kas
    await buka('/catatan?rentang=bulan-ini'); await foto('13-catatan-kas-tabel')
    await buka('/catatan?rentang=tahun-ini&arah=keluar'); await foto('14-catatan-kas-saring-keluar')
    await buka('/catatan/setoran'); await foto('15-setoran-kolektif-daftar')
    const sid = d.prepare("select id from setoran order by id desc limit 1").get().id
    await buka('/catatan/setoran/' + sid); await foto('16-setoran-detail')
    await buka('/catatan/setoran/baru'); await tidur(600)
    await klikNyata(`document.querySelector('#penyetorAnggotaId')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await ketik('rahmat'); await klikNyata(`document.querySelector('[role=dialog] [cmdk-item]')`); await tidur(300)
    await klikNyata(`document.querySelector('#jenisUtama')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await ketik('wajib'); await klikNyata(`document.querySelector('[role=dialog] [cmdk-item]')`); await tidur(400)
    await klik('Tambah anggota'); await tunggu(`!!document.querySelector('[role=dialog] li')`); await tidur(400)
    await klikNyata(`document.querySelector('[role=dialog] input')`); await ketik('a'); await tidur(300)
    await foto('17-setoran-modal-pilih-anggota', { penuh: false })
    await js(`[...document.querySelectorAll('[role=dialog] li button')].slice(0, 5).forEach(b => b.click())`); await tidur(200)
    await klikNyata(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.startsWith('Tambahkan'))`); await tidur(600)
    await foto('18-setoran-form-terisi')
    await buka('/cetak/setoran/' + sid + '?cetak=0', 1500); await foto('19-cetak-tanda-terima-setoran')
    // ---- Laporan
    await buka('/laporan?periode=bulanan&acuan=2026-08-15'); await foto('20-laporan-bulanan')
    await buka('/laporan?periode=tahunan&acuan=2026-08-15'); await foto('21-laporan-tahunan')
    await buka('/cetak/ringkas?periode=bulanan&acuan=2026-08-15&cetak=0', 1500); await foto('22-cetak-laporan-ringkas')
    await buka('/cetak/buku-kas?periode=bulanan&acuan=2026-08-15&cetak=0', 1500); await foto('23-cetak-buku-kas')
    await buka('/cetak/pemeriksaan?periode=bulanan&acuan=2026-08-15&cetak=0', 1500); await foto('24-cetak-berita-acara')
    // ---- Riwayat: buat perubahan dulu (ubah & hapus lewat UI)
    const tid = d.prepare("select id from transaksi where keterangan like 'Denda keterlambatan%'").get().id
    await buka(`/catatan/${tid}/ubah`); await tidur(600); await isi('#jumlah', '25000'); await js(`document.querySelector('main form').requestSubmit()`); await tunggu(`location.pathname === '/catatan'`, 20000); await tidur(600)
    await buka('/catatan?rentang=bulan-ini'); await tidur(600)
    await klikNyata(`[...document.querySelectorAll('button[aria-label^="Menu catatan"]')][1]`); await tunggu(`!!document.querySelector('[role=menuitem]')`); await klikNyata(`[...document.querySelectorAll('[role=menuitem]')].find(m => m.textContent.includes('Hapus'))`); await tunggu(`!!document.querySelector('[role=dialog]')`); await tidur(300)
    await foto('25-dialog-hapus-catatan', { penuh: false })
    await klikNyata(`[...document.querySelectorAll('[role=dialog] button')].find(b => /Ya, Hapus|Hapus/.test(b.textContent) && b.textContent.trim() !== 'Batal')`); await tunggu(`!document.querySelector('[role=dialog]')`, 15000); await tidur(800)
    await buka('/riwayat'); await foto('26-riwayat')
    // ---- Anggota
    await buka('/anggota'); await foto('30-anggota-daftar')
    await buka('/anggota?saring=nunggak-duka'); await foto('31-anggota-saring-nunggak-duka')
    await buka('/anggota'); await tidur(400); await klik('Tambah Anggota'); await tunggu(`!!document.querySelector('[role=dialog] #nama-anggota')`); await tidur(400)
    await isi('#nama-anggota', 'Andi Wijaya'); await isi('#alamat-anggota', 'Jl. Kenanga No. 5, Blok C'); await tidur(600)
    await js(`[...document.querySelectorAll('[role=dialog] [role=radiogroup][aria-label="Jenis kelamin"] [role=radio]')][0].click()`)
    await klik('Tambah anggota keluarga'); await tidur(300)
    await js(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }; set(document.querySelector('[role=dialog] input[id^=nama-keluarga]'), 'Ratna Wijaya'); return true })()`)
    await klikNyata(`document.querySelector('[role=dialog] [id^=hubungan-]')`); await tunggu(`!!document.querySelector('[role=dialog] [cmdk-input]')`); await klikNyata(`[...document.querySelectorAll('[cmdk-item]')].find(i => i.textContent.trim() === 'Istri')`); await tidur(300)
    await klik('Isi tunggakan duka lama'); await tidur(300)
    await js(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }; const j = [...document.querySelectorAll('[role=dialog] input[id^=anggota-tunggakan-jumlah]')]; set(j[0], '2'); if (j[1]) set(j[1], '4'); return true })()`); await tidur(300)
    await foto('32-anggota-form-tambah', { maks: 3400 })
    await js(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Tutup')?.click()`); await tidur(400)
    await buka('/anggota/' + ids[0]); await foto('33-anggota-detail', { maks: 3200 })
    await buka('/anggota/' + ids[25]); await js(`document.querySelector('section[aria-label="Iuran duka"]').scrollIntoView()`); await tidur(400); win.setContentSize(W, H); fs.writeFileSync(path.join(OUT, '34-anggota-tunggakan-duka-lama.png'), (await win.webContents.capturePage()).toPNG()); catat('34-anggota-tunggakan-duka-lama')
    await buka('/anggota/' + ids[0] + '/keluarga'); await foto('35-anggota-keluarga')
    await buka('/anggota/rt'); await foto('36-data-rt')
    await buka('/peta', 4000); await foto('37-peta-anggota', { penuh: false })
    // ---- Buku Duka
    await buka('/duka'); await foto('40-buku-duka')
    const kid = d.prepare("select id from kejadian_duka where nomor=4").get().id
    await buka('/duka/' + kid); await foto('41-buku-duka-kejadian-centang')
    await buka('/duka'); await tidur(400); await klik('Catat Kejadian'); await tunggu(`!!document.querySelector('[role=dialog] #nama-almarhum')`); await tidur(500)
    await foto('42-buku-duka-form-kejadian', { maks: 3000 })
    await js(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Tutup')?.click()`); await tidur(300)
    await buka('/cetak/duka/' + kid + '?cetak=0', 1500); await foto('43-cetak-tunggakan-duka')
    // ---- Jenis uang & pengaturan
    await buka('/jenis'); await foto('50-jenis-uang', { maks: 3000 })
    await buka('/pengaturan'); await foto('51-pengaturan', { maks: 3000 })
    // ---- Mode gelap & layar sempit
    await js(`document.documentElement.setAttribute('data-tema', 'gelap')`); await buka('/beranda'); await js(`document.documentElement.setAttribute('data-tema', 'gelap')`); await tidur(400); await foto('60-beranda-mode-gelap')
    await js(`document.documentElement.removeAttribute('data-tema')`)
    win.setContentSize(390, 844); await tidur(300)
    const fotoHp = async (u, nama, ms = 1200) => { await buka(u, ms); await tidur(300); fs.writeFileSync(path.join(OUT, nama + '.png'), (await win.webContents.capturePage()).toPNG()); catat(nama) }
    await fotoHp('/beranda', '70-hp-beranda'); await fotoHp('/catatan?rentang=bulan-ini', '71-hp-catatan'); await fotoHp('/catatan/baru?jenis=masuk', '72-hp-catat'); await fotoHp('/anggota', '73-hp-anggota')
    console.log('SELESAI')
  } catch (e) { console.log('GAGAL:', e.message); try { fs.writeFileSync(path.join(OUT, 'gagal.png'), (await win.webContents.capturePage()).toPNG()) } catch (_) {} }
  app.quit()
})
