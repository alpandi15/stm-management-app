#!/usr/bin/env node
/**
 * Membuat rilis: naikkan versi → build .exe → tag → unggah ke GitHub Releases.
 *
 *   npm run rilis -- patch           # 0.2.0 → 0.2.1
 *   npm run rilis -- minor           # 0.2.0 → 0.3.0
 *   npm run rilis -- 1.0.0           # versi persis
 *   npm run rilis -- patch --kering  # latihan: tampilkan langkahnya, tidak mengubah apa pun
 *   npm run rilis -- patch --lewati-build   # pakai berkas di release/ yang sudah ada
 *   npm run rilis -- patch --draf    # rilis disimpan sebagai draf, tidak langsung terbit
 *
 * Syarat: Node 20 (`nvm use`), `gh` sudah login (`gh auth login`), pohon kerja bersih.
 * Catatan rilis disusun otomatis dari pesan commit sejak tag sebelumnya.
 */
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const bendera = new Set(argv.filter((a) => a.startsWith('--')))
const target = argv.find((a) => !a.startsWith('--')) ?? 'patch'
const kering = bendera.has('--kering') || bendera.has('--dry-run')
const lewatiBuild = bendera.has('--lewati-build')
const draf = bendera.has('--draf') || bendera.has('--draft')

const akar = process.cwd()
const pkgPath = path.join(akar, 'package.json')
const warna = { biru: '\x1b[34m', hijau: '\x1b[32m', kuning: '\x1b[33m', merah: '\x1b[31m', abu: '\x1b[90m', mati: '\x1b[0m' }
const langkah = (s) => console.log(`\n${warna.biru}▸ ${s}${warna.mati}`)
const info = (s) => console.log(`  ${warna.abu}${s}${warna.mati}`)
const ok = (s) => console.log(`  ${warna.hijau}✓${warna.mati} ${s}`)

function gagal(pesan, saran) {
  console.error(`\n${warna.merah}✗ ${pesan}${warna.mati}`)
  if (saran) console.error(`  ${saran}`)
  process.exit(1)
}

function jalan(perintah, args, { diam = false } = {}) {
  if (kering) {
    info(`(latihan) ${perintah} ${args.join(' ')}`)
    return ''
  }
  return execFileSync(perintah, args, { cwd: akar, encoding: 'utf8', stdio: diam ? 'pipe' : ['inherit', 'inherit', 'inherit'] }) ?? ''
}

const baca = (perintah) => execSync(perintah, { cwd: akar, encoding: 'utf8' }).trim()

function versiBerikut(sekarang, naik) {
  if (/^\d+\.\d+\.\d+$/.test(naik)) return naik
  const [besar, menengah, kecil] = sekarang.split('.').map(Number)
  if (naik === 'major') return `${besar + 1}.0.0`
  if (naik === 'minor') return `${besar}.${menengah + 1}.0`
  if (naik === 'patch') return `${besar}.${menengah}.${kecil + 1}`
  gagal(`Versi "${naik}" tidak dikenali.`, 'Pakai: patch, minor, major, atau angka persis seperti 1.0.0')
}

// ---------- 1. Pemeriksaan sebelum mulai ----------
langkah('Memeriksa keadaan repositori')

const node = Number(process.versions.node.split('.')[0])
if (node !== 20) gagal(`Node ${process.versions.node} dipakai, repo ini butuh Node 20.`, 'Jalankan `nvm use` lebih dulu (lihat docs/05).')
ok(`Node ${process.versions.node}`)

try {
  execFileSync('gh', ['auth', 'status'], { stdio: 'pipe' })
} catch {
  gagal('GitHub CLI (`gh`) belum siap.', 'Pasang dari https://cli.github.com lalu jalankan `gh auth login`.')
}
ok('GitHub CLI siap')

const kotor = baca('git status --porcelain')
if (kotor && !kering) {
  gagal('Masih ada perubahan yang belum di-commit.', `Commit atau simpan dulu:\n${kotor.split('\n').slice(0, 10).map((b) => `    ${b}`).join('\n')}`)
}
ok('Pohon kerja bersih')

const cabang = baca('git rev-parse --abbrev-ref HEAD')
info(`Cabang: ${cabang}`)

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const versiLama = pkg.version
const versi = versiBerikut(versiLama, target)
const tag = `v${versi}`

if (baca('git tag').split('\n').includes(tag)) gagal(`Tag ${tag} sudah ada.`, 'Pilih versi lain, atau hapus tag itu dengan `git tag -d ' + tag + '`.')

console.log(`\n${warna.kuning}  ${versiLama} → ${versi}${warna.mati}${kering ? `  ${warna.abu}(latihan, tidak ada yang diubah)${warna.mati}` : ''}`)

// ---------- 2. Mutu kode ----------
if (!lewatiBuild) {
  langkah('Memeriksa mutu kode (lint, typecheck, uji)')
  jalan('npm', ['run', 'lint'])
  jalan('npm', ['run', 'typecheck'])
  jalan('npm', ['test'])
  ok('Lint, typecheck, dan uji lolos')
}

// ---------- 3. Naikkan versi ----------
langkah(`Menaikkan versi ke ${versi}`)
if (!kering) {
  pkg.version = versi
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  // package-lock ikut diperbarui tanpa menyentuh jaringan
  try {
    execFileSync('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: akar, stdio: 'pipe' })
  } catch {
    info('package-lock.json tidak ikut diperbarui (tidak apa-apa)')
  }
}
ok(`package.json → ${versi}`)

// ---------- 4. Build .exe ----------
if (lewatiBuild) {
  info('Build dilewati (--lewati-build)')
} else {
  langkah('Membuat berkas .exe (beberapa menit)')
  if (!kering) {
    // Sebagian terminal menyetel ELECTRON_RUN_AS_NODE=1; electron-builder menolak jalan dengan itu
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE
    execFileSync('npm', ['run', 'dist:win'], { cwd: akar, stdio: 'inherit', env })
  } else {
    info('(latihan) npm run dist:win')
  }
  ok('Build selesai')
}

// ---------- 5. Kumpulkan berkas rilis ----------
langkah('Mengumpulkan berkas rilis')
const berkas = [
  `release/AplikasiKasSTM-Setup-${versi}.exe`,
  `release/AplikasiKasSTM-Portable-${versi}-ia32.exe`,
  `release/AplikasiKasSTM-Portable-${versi}-x64.exe`,
].filter((f) => existsSync(path.join(akar, f)) || kering)

if (!kering && berkas.length === 0) gagal('Tidak ada berkas .exe di folder release/.', 'Jalankan tanpa --lewati-build, atau periksa hasil `npm run dist:win`.')
for (const f of berkas) info(f)

// ---------- 6. Catatan rilis ----------
langkah('Menyusun catatan rilis')
const tagSebelumnya = baca('git tag --sort=-v:refname').split('\n').filter(Boolean)[0]
const rentang = tagSebelumnya ? `${tagSebelumnya}..HEAD` : 'HEAD'
const commit = baca(`git log ${rentang} --no-merges --pretty=format:%s`)
  .split('\n')
  .filter((b) => b && !/^(Versi \d|Merge |README:)/.test(b))
  .map((b) => `- ${b}`)

const catatan = [
  `## Aplikasi Kas STM ${versi}`,
  '',
  commit.length ? '### Perubahan' : '### Perubahan\n\n- Perbaikan kecil dan perapian.',
  ...(commit.length ? ['', ...commit] : []),
  '',
  '### Cara memasang',
  '',
  '1. Unduh **`AplikasiKasSTM-Setup-' + versi + '.exe`** (installer ini memilih sendiri 32 atau 64-bit).',
  '2. Jalankan berkasnya. Bila Windows menampilkan *“Windows protected your PC”*, klik **More info → Run anyway** — installer memang belum ditandatangani secara digital.',
  '3. Memasang di atas versi lama **tidak menghapus data**; database lama ikut diperbarui otomatis saat aplikasi dibuka.',
  '',
  'Versi portable (dijalankan langsung tanpa dipasang) tersedia untuk 32-bit dan 64-bit.',
  '',
  '> Butuh Windows 7 SP1 atau lebih baru. Tidak perlu internet.',
].join('\n')

if (kering) console.log(`\n${warna.abu}${catatan}${warna.mati}`)
else ok(`${commit.length} perubahan dirangkum dari ${tagSebelumnya ?? 'awal repo'}`)

// ---------- 7. Commit, tag, dorong ----------
langkah('Menyimpan versi dan tag')
jalan('git', ['add', 'package.json', 'package-lock.json'])
jalan('git', ['commit', '-m', `Versi ${versi}`])
jalan('git', ['tag', '-a', tag, '-m', `Aplikasi Kas STM ${versi}`])
jalan('git', ['push', 'origin', cabang])
jalan('git', ['push', 'origin', tag])
ok(`Commit dan tag ${tag} terdorong ke origin`)

// ---------- 8. Rilis GitHub ----------
langkah('Mengunggah ke GitHub Releases')
const berkasCatatan = path.join(akar, 'release', 'catatan-rilis.md')
if (!kering) writeFileSync(berkasCatatan, catatan)
jalan('gh', [
  'release',
  'create',
  tag,
  ...berkas,
  '--title',
  `Aplikasi Kas STM ${versi}`,
  '--notes-file',
  kering ? '(catatan di atas)' : berkasCatatan,
  ...(draf ? ['--draft'] : []),
])

const repo = kering ? '<repo>' : baca('gh repo view --json nameWithOwner -q .nameWithOwner')
console.log(`\n${warna.hijau}✓ Rilis ${versi} selesai.${warna.mati}`)
console.log(`  https://github.com/${repo}/releases/tag/${tag}`)
if (draf) console.log(`  ${warna.kuning}Masih berupa draf — terbitkan dari halaman itu.${warna.mati}`)
