// `npm run dev:electron`: menjalankan `next dev` lalu membuka jendela Electron ke sana
// (STM_DEV_URL). Server tidak di-fork oleh main.js pada mode ini.
import { spawn } from 'node:child_process'
import { get } from 'node:http'

const port = process.env.PORT || '3000'
const url = `http://localhost:${port}`
const env = { ...process.env, PORT: port }
delete env.ELECTRON_RUN_AS_NODE // beberapa terminal menyetelnya (docs/05 §8)

const next = spawn('npx', ['next', 'dev', '-p', port], { stdio: 'inherit', env, shell: process.platform === 'win32' })

function tunggu() {
  get(url, (res) => {
    res.resume()
    const electron = spawn('npx', ['electron', '.'], { stdio: 'inherit', env: { ...env, STM_DEV_URL: url }, shell: process.platform === 'win32' })
    electron.on('exit', () => {
      next.kill()
      process.exit(0)
    })
  }).on('error', () => setTimeout(tunggu, 500))
}
setTimeout(tunggu, 1500)
process.on('SIGINT', () => {
  next.kill()
  process.exit(0)
})
