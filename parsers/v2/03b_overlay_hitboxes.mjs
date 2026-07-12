// Пост-обработка НОВОформатных оверлеев: зонам-контурам добавляются
// невидимые hit-прямоугольники по bbox (иначе мышь ловится только на
// тонкой линии обводки). Старые оверлеи (symbol/use refN.1) не трогаем.
//
// defs: <g id="refN"><path исходный/><rect bbox fill=прозрачный/></g>
// uses отсортированы: крупные зоны первыми (мелкие — сверху при хит-тесте).
//
// Запуск: node 03b_overlay_hitboxes.mjs
import puppeteer from 'puppeteer'
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const files = globSync('data/out_images/**/*.svg')
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage()

let processed = 0, skipped = 0
for (const file of files) {
  const svg = readFileSync(file, 'utf-8')
  if (svg.includes('<symbol id="ref')) { skipped++; continue }       // старый формат — работает как есть
  if (svg.includes('data-hitbox')) { skipped++; continue }           // уже обработан
  if (!svg.includes('<defs><path')) { skipped++; continue }

  await page.setContent(`<!doctype html><body>${svg}</body>`)
  const result = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('defs > path[id^="ref"]').forEach((p) => {
      const b = p.getBBox()
      out.push({ id: p.id, x: b.x, y: b.y, w: b.width, h: b.height })
    })
    return out
  })
  const bboxes = Object.fromEntries(result.map((r) => [r.id, r]))

  // пересобираем: каждый path оборачиваем в группу с hit-ректом
  let out = svg.replace(/<path([^>]*?)\bid="(ref\d+)"([^>]*?)\/>/g, (m, pre, id, post) => {
    const b = bboxes[id]
    if (!b) return m
    const rect = `<rect x="${b.x.toFixed(2)}" y="${b.y.toFixed(2)}" width="${b.w.toFixed(2)}" height="${b.h.toFixed(2)}" fill="rgba(0,0,0,0)" data-hitbox="1"/>`
    return `<g id="${id}"><path${pre}${post}/>${rect}</g>`
  })

  // sort uses: большие первыми → маленькие ловят мышь поверх
  const useRe = /<use xlink:href="#(ref\d+)"[^>]*\/>/g
  const uses = [...out.matchAll(useRe)].map((m) => ({ tag: m[0], id: m[1] }))
  uses.sort((a, b) => {
    const A = bboxes[a.id], B = bboxes[b.id]
    return (B ? B.w * B.h : 0) - (A ? A.w * A.h : 0)
  })
  out = out.replace(/<use xlink:href="#ref\d+"[^>]*\/>/g, '')
  out = out.replace('</svg>', uses.map((u) => u.tag).join('') + '</svg>')

  writeFileSync(file, out)
  processed++
}

await browser.close()
console.log(`Обработано: ${processed}, пропущено: ${skipped}`)
