import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { rcedit } = require('rcedit')
import { existsSync } from 'fs'
import { resolve } from 'path'

const exePath = resolve('release/win-unpacked/Kandidat.exe')
const icoPath = resolve('assets/icon.ico')

if (!existsSync(exePath)) {
  console.log('Kandidat.exe non trouvé, skip icon patch')
  process.exit(0)
}

try {
  await rcedit(exePath, { icon: icoPath })
  console.log('Icône appliquée sur Kandidat.exe')
} catch (e) {
  console.error('Erreur patch icône:', e.message)
}
