// Proses utama Electron (docs/03 §3, docs/05 §7).
//
// Menjalankan server Next standalone sebagai proses anak (biner Electron dalam mode Node 16
// lewat electron/jalankan-server.js), menunggu siap, lalu membuka jendela ke 127.0.0.1:PORT.
// Saat pengembangan (`npm run dev:electron`) STM_DEV_URL diisi dan server tidak di-fork.
'use strict'

const { app, BrowserWindow, Menu, dialog, ipcMain, shell, session } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')
const http = require('http')

// Laptop tua Windows 7 dengan driver GPU lama kadang menampilkan jendela kosong (docs/05 §7)
app.disableHardwareAcceleration()

// Satu instans saja: dua jendela berarti dua proses menulis berkas SQLite yang sama
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

let server = null
let win = null
let portServer = 0
const devUrl = process.env.STM_DEV_URL || ''

/**
 * Folder data (database, foto bukti, cadangan, kunci sesi).
 * Bawaan: %APPDATA%/Aplikasi Kas STM/data. Versi portable: bila ada berkas
 * `stm-portable.txt` di sebelah .exe, data ikut di folder `data` sebelahnya (docs/03 §5).
 */
function tentukanDataDir() {
  const folderExe = process.env.PORTABLE_EXECUTABLE_DIR
  if (folderExe && fs.existsSync(path.join(folderExe, 'stm-portable.txt'))) {
    return path.join(folderExe, 'data')
  }
  return path.join(app.getPath('userData'), 'data')
}
const dataDir = tentukanDataDir()
fs.mkdirSync(dataDir, { recursive: true })

const logFile = path.join(dataDir, 'aplikasi.log')
function log(...pesan) {
  const baris = `[${new Date().toISOString()}] ${pesan.join(' ')}\n`
  try {
    fs.appendFileSync(logFile, baris)
  } catch (_) {
    /* abaikan */
  }
  if (!app.isPackaged) process.stdout.write(baris)
}

function portKosong() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

function tungguSiap(url, batasMs = 60000) {
  const mulai = Date.now()
  return new Promise((resolve, reject) => {
    const coba = () => {
      if (server && server.exitCode !== null) return reject(new Error(`Server berhenti dengan kode ${server.exitCode}`))
      if (Date.now() - mulai > batasMs) return reject(new Error('Server tidak kunjung siap dalam 60 detik'))
      const req = http.get(url, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => setTimeout(coba, 250))
      req.setTimeout(2000, () => {
        req.destroy()
        setTimeout(coba, 250)
      })
    }
    coba()
  })
}

async function jalankanServer() {
  const port = await portKosong()
  const serverPath = path.join(process.resourcesPath, 'standalone', 'server.js')
  if (!fs.existsSync(serverPath)) throw new Error(`server.js tidak ditemukan di ${serverPath}`)

  // Bukan server.js langsung: pembungkus memasang polyfill Node 16 dulu (docs/05 §4)
  server = fork(path.join(__dirname, 'jalankan-server.js'), [], {
    execArgv: ['--experimental-fetch'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      STM_DATA_DIR: dataDir,
      STM_SERVER_JS: serverPath,
      ELECTRON_RUN_AS_NODE: '1',
    },
    cwd: path.dirname(serverPath),
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  server.stdout.on('data', (d) => log('[server]', d.toString().trim()))
  server.stderr.on('data', (d) => log('[server!]', d.toString().trim()))
  server.on('exit', (kode) => log('[server] berhenti, kode', kode))

  await tungguSiap(`http://127.0.0.1:${port}/`)
  return port
}

function buatJendela() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#f7f8fa',
    title: 'Aplikasi Kas STM',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })
  win.once('ready-to-show', () => win.show())
  // Tautan luar (mis. peta OpenStreetMap) dibuka di browser sistem, bukan jendela baru
  const internal = (url) => url.startsWith(`http://127.0.0.1:${portServer}`) || (!!devUrl && url.startsWith(devUrl))
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !internal(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:\/\//.test(url) && !internal(url)) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })
  win.on('closed', () => {
    win = null
  })
  return win
}

// Unduhan (mis. /api/cadangan di mode browser) selalu lewat dialog simpan berbahasa Indonesia
function pasangUnduhan() {
  session.defaultSession.on('will-download', (_e, item) => {
    item.setSaveDialogOptions({ title: 'Simpan berkas', defaultPath: path.join(app.getPath('documents'), item.getFilename()) })
  })
}

// ---------- Kanal IPC (daftar tetap, lihat electron/preload.js dan src/lib/electron.ts) ----------

ipcMain.handle('cetak:pdf', async (e, namaBerkas) => {
  const wc = e.sender
  const nama = String(namaBerkas || 'dokumen.pdf').replace(/[\\/:*?"<>|]/g, '-')
  const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(wc) || win, {
    title: 'Simpan sebagai PDF',
    defaultPath: path.join(app.getPath('documents'), nama.endsWith('.pdf') ? nama : `${nama}.pdf`),
    filters: [{ name: 'Berkas PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { ok: false, pesan: 'Dibatalkan.' }
  try {
    const pdf = await wc.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } })
    fs.writeFileSync(filePath, pdf)
    return { ok: true, data: { path: filePath } }
  } catch (err) {
    log('cetak:pdf gagal', String(err))
    return { ok: false, pesan: 'PDF gagal dibuat. Coba lagi, atau pakai tombol Cetak.' }
  }
})

ipcMain.handle('cadangan:simpan', async (_e, namaBawaan) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Simpan cadangan',
    defaultPath: path.join(app.getPath('documents'), String(namaBawaan || 'cadangan-stm.db')),
    filters: [{ name: 'Berkas database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { ok: false, pesan: 'Dibatalkan.' }
  return { ok: true, data: { path: filePath } }
})

ipcMain.handle('cadangan:pulihkan', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Pilih berkas cadangan',
    properties: ['openFile'],
    filters: [{ name: 'Berkas database', extensions: ['db'] }],
  })
  if (canceled || !filePaths[0]) return { ok: false, pesan: 'Dibatalkan.' }
  return { ok: true, data: { path: filePaths[0] } }
})

ipcMain.handle('data:buka-folder', () => shell.openPath(dataDir))

ipcMain.handle('app:versi', () => ({ versi: app.getVersion(), dataDir }))

// ---------- Daur hidup ----------

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  pasangUnduhan()
  const jendela = buatJendela()
  await jendela.loadFile(path.join(__dirname, 'memuat.html'))
  try {
    let url = devUrl
    if (!url) {
      portServer = await jalankanServer()
      url = `http://127.0.0.1:${portServer}/`
    }
    log('membuka', url, '· data di', dataDir)
    if (win) await win.loadURL(url)
  } catch (err) {
    log('gagal memulai:', String(err && err.stack ? err.stack : err))
    dialog.showErrorBox(
      'Aplikasi Kas STM tidak bisa dimulai',
      `${err && err.message ? err.message : err}\n\nCatatan lengkap ada di:\n${logFile}`,
    )
    app.quit()
  }
})

app.on('window-all-closed', () => app.quit())

// Proses Node yang tertinggal mengunci berkas database dan membuat aplikasi gagal dibuka lagi
app.on('before-quit', () => {
  if (server && server.exitCode === null) {
    log('mematikan server')
    server.kill()
  }
})
