// Jembatan renderer ↔ proses utama (docs/03 §3). Hanya kanal di bawah ini yang tersedia;
// tipe di sisi aplikasi ada di src/lib/electron.ts (JembatanStm).
'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('stm', {
  cetakPdf: (namaBerkas) => ipcRenderer.invoke('cetak:pdf', namaBerkas),
  pilihLokasiCadangan: (namaBawaan) => ipcRenderer.invoke('cadangan:simpan', namaBawaan),
  pilihBerkasPulihkan: () => ipcRenderer.invoke('cadangan:pulihkan'),
  bukaFolderData: () => ipcRenderer.invoke('data:buka-folder'),
  versi: () => ipcRenderer.invoke('app:versi'),
})
