// Pembungkus server Next standalone untuk runtime Node 16 (Electron 22).
//
// Dipanggil oleh electron/main.js lewat child_process.fork dengan:
//   execArgv: ['--experimental-fetch']   ← memasang fetch/Request/Response/FormData global
//   env.ELECTRON_RUN_AS_NODE = '1'       ← biner Electron berjalan sebagai Node
//   env.STM_SERVER_JS = <path server.js>
//
// Bisa juga dijalankan manual untuk menguji bundel (docs/05 §4):
//   ELECTRON_RUN_AS_NODE=1 NODE_OPTIONS=--experimental-fetch STM_SERVER_JS=.next/standalone/server.js \
//     ./node_modules/.bin/electron electron/jalankan-server.js
'use strict'

require('./polyfill-node16.js')
require('./sesi-secret.js').pasangSecretSesi()

const path = require('path')
const serverJs = process.env.STM_SERVER_JS || path.join(process.cwd(), 'server.js')

// server.js hasil Next membaca process.env.PORT dan HOSTNAME, dan menganggap
// cwd = folder standalone (untuk .next/static dan public).
process.chdir(path.dirname(serverJs))
require(serverJs)
