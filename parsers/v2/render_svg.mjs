// Растеризация SVG-рисунков схем в webp через headless Chromium.
// Вход: manifest.json — [{svg, out, width}], пути абсолютные.
// Запуск: node render_svg.mjs data/render_manifest.json
import puppeteer from 'puppeteer'
import { readFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf-8'))
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage()

let done = 0
for (const item of manifest) {
  const svg = readFileSync(item.svg, 'utf-8')
  // вычисляем высоту из viewBox, чтобы вьюпорт совпал с кадром
  const vb = svg.match(/viewBox="([\d. ]+)"/i)
  const [, , vw, vh] = vb[1].split(' ').map(Number)
  const width = item.width
  const height = Math.round((width * vh) / vw)

  await page.setViewport({ width, height })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff">` +
      svg.replace('<svg ', `<svg width="${width}" height="${height}" `) +
      `</body></html>`
  )
  mkdirSync(dirname(item.out), { recursive: true })
  await page.screenshot({ path: item.out, type: 'webp', quality: 82 })
  done++
  if (done % 20 === 0) console.log(`  ${done}/${manifest.length}`)
}

await browser.close()
console.log(`Готово: ${done}/${manifest.length}`)
