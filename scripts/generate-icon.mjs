import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFileSync } from 'fs'

const svgPath = 'assets/icon.svg'
const pngPath = 'assets/icon.png'
const icoPath = 'assets/icon.ico'

const sizes = [16, 32, 48, 64, 128, 256]

// SVG → PNG 512x512 (pour macOS / Linux)
await sharp(svgPath)
  .resize(512, 512)
  .png()
  .toFile(pngPath)

console.log('PNG 512x512 generé')

// Générer les PNGs multi-tailles pour l'ICO
const pngBuffers = await Promise.all(
  sizes.map(size =>
    sharp(svgPath).resize(size, size).png().toBuffer()
  )
)

const icoBuffer = await pngToIco(pngBuffers)
writeFileSync(icoPath, icoBuffer)

console.log(`ICO generé (${sizes.join(', ')}px)`)
