// Polyfill global Web API untuk Node 16.17 — runtime yang dibawa Electron 22,
// satu-satunya Electron yang masih bisa dijalankan di Windows 7 (docs/05).
//
// Next.js 14 dan React 18 memakai kelas-kelas di bawah sebagai global. Node 16 sudah
// memilikinya, hanya belum memasangnya sebagai global. Berkas ini dimuat SEBELUM
// server.js oleh electron/jalankan-server.js. Jangan memakai sintaks di atas ES2020.
//
// `fetch`, `Request`, `Response`, `Headers`, `FormData` TIDAK dipasang di sini:
// Node 16.15+ menyediakannya lewat flag `--experimental-fetch` (lihat jalankan-server.js).
'use strict'

const web = require('stream/web')
const KELAS_STREAM = [
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'ReadableStreamDefaultReader',
  'ReadableStreamBYOBReader',
  'ReadableByteStreamController',
  'ReadableStreamDefaultController',
  'WritableStreamDefaultWriter',
  'WritableStreamDefaultController',
  'TransformStreamDefaultController',
  'ByteLengthQueuingStrategy',
  'CountQueuingStrategy',
  'TextEncoderStream',
  'TextDecoderStream',
]
for (const nama of KELAS_STREAM) {
  if (typeof globalThis[nama] === 'undefined' && web[nama]) globalThis[nama] = web[nama]
}

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto').webcrypto
}

if (typeof globalThis.structuredClone === 'undefined') {
  const v8 = require('v8')
  globalThis.structuredClone = (nilai) => v8.deserialize(v8.serialize(nilai))
}

if (typeof globalThis.DOMException === 'undefined') {
  // Cara yang lazim dipakai: DOMException diambil dari galat MessagePort
  try {
    const { MessageChannel } = require('worker_threads')
    const port = new MessageChannel().port1
    const ab = new ArrayBuffer(1)
    try {
      port.postMessage(ab, [ab, ab])
    } catch (e) {
      globalThis.DOMException = e.constructor
    }
    port.close()
  } catch (_) {
    // biarkan kosong; hanya dipakai untuk pesan galat
  }
}

if (typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = (ms) => {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), ms)
    if (t.unref) t.unref()
    return c.signal
  }
}

if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    writable: true,
    configurable: true,
    value(fn, thisArg) {
      for (let i = this.length - 1; i >= 0; i--) if (fn.call(thisArg, this[i], i, this)) return this[i]
      return undefined
    },
  })
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    writable: true,
    configurable: true,
    value(fn, thisArg) {
      for (let i = this.length - 1; i >= 0; i--) if (fn.call(thisArg, this[i], i, this)) return i
      return -1
    },
  })
}

if (!Object.hasOwn) {
  Object.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
}
