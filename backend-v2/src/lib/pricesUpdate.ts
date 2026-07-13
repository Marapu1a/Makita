import ExcelJS from 'exceljs'
import { existsSync, renameSync } from 'fs'
import { join } from 'path'
import { prisma } from '../db.js'
import { UPLOADS_DIR, PRICE_ARCHIVE_DIR, PRICE_FILES } from './adminStorage.js'

// Порт prices_update.py: обновление цен и наличия из двух xlsx.
//   1. result.xlsx (лист «обновление цен и наличия») — основной источник
//   2. makita_site_update.xlsx (лист «Для импорта») — применяется ПОВЕРХ
// Детали, отсутствующие в обоих файлах, не трогаются.
// После успешного прогона файлы уезжают в архив с таймстампом.

interface ImportRow {
  part_number: string
  price: number | null // null = цену не менять (пустая или <=0 в файле)
  availability: boolean
  quantity: number
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if ('result' in v) return String((v as ExcelJS.CellFormulaValue).result ?? '')
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
    return String(cell.text ?? '')
  }
  return String(v)
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const t = cellText(cell).replace(',', '.').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

async function readSheet(path: string, sheetName: string, requiredCols: string[]) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  const ws = wb.getWorksheet(sheetName)
  if (!ws) {
    const names = wb.worksheets.map((w) => `«${w.name}»`).join(', ')
    throw new Error(`Нет листа «${sheetName}». Листы в файле: ${names}`)
  }

  // колонки ищем по заголовкам первой строки
  const colByName: Record<string, number> = {}
  ws.getRow(1).eachCell((cell, colNumber) => {
    colByName[cellText(cell).trim()] = colNumber
  })
  const missing = requiredCols.filter((c) => !(c in colByName))
  if (missing.length) {
    throw new Error(`Нет колонок: ${missing.join(', ')}. Есть: ${Object.keys(colByName).join(', ')}`)
  }
  return { ws, colByName }
}

async function loadResult(path: string): Promise<ImportRow[]> {
  const cols = ['Артикул', 'доступно (наличие)', 'доступно (кол-во)', 'цена со скидками']
  const { ws, colByName } = await readSheet(path, 'обновление цен и наличия', cols)

  const rows: ImportRow[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const pn = cellText(row.getCell(colByName['Артикул'])).trim()
    if (!pn) return
    let price = cellNumber(row.getCell(colByName['цена со скидками']))
    if (price !== null && price <= 0) price = null // нулевую цену не льём
    const availability = cellText(row.getCell(colByName['доступно (наличие)'])).trim().toUpperCase() === 'Y'
    const quantity = Math.trunc(cellNumber(row.getCell(colByName['доступно (кол-во)'])) ?? 0)
    rows.push({ part_number: pn, price, availability, quantity })
  })
  return rows
}

async function loadSite(path: string): Promise<ImportRow[]> {
  const cols = ['Артикул', 'Количество', 'Цена']
  const { ws, colByName } = await readSheet(path, 'Для импорта', cols)

  const rows: ImportRow[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const pn = cellText(row.getCell(colByName['Артикул'])).trim()
    if (!pn) return
    let price = cellNumber(row.getCell(colByName['Цена']))
    if (price !== null && price <= 0) price = null
    const quantity = Math.trunc(cellNumber(row.getCell(colByName['Количество'])) ?? 0)
    rows.push({ part_number: pn, price, availability: quantity > 0, quantity })
  })
  return rows
}

async function applyRows(rows: ImportRow[], label: string, report: string[]): Promise<void> {
  // дубли артикулов в файле: последняя строка побеждает
  const dedup = new Map<string, ImportRow>()
  for (const r of rows) dedup.set(r.part_number, r)
  const unique = [...dedup.values()]

  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      CREATE TEMP TABLE _price_import (
        part_number  VARCHAR PRIMARY KEY,
        price        DOUBLE PRECISION,
        availability BOOLEAN,
        quantity     INTEGER
      ) ON COMMIT DROP
    `
    await tx.$executeRaw`
      INSERT INTO _price_import (part_number, price, availability, quantity)
      SELECT part_number, price, availability, quantity
      FROM jsonb_to_recordset(${JSON.stringify(unique)}::jsonb)
        AS t(part_number VARCHAR, price DOUBLE PRECISION, availability BOOLEAN, quantity INTEGER)
    `
    return tx.$executeRaw`
      UPDATE parts p
      SET price        = ROUND(COALESCE(i.price, p.price)),
          availability = i.availability,
          quantity     = i.quantity,
          updated_at   = NOW()
      FROM _price_import i
      WHERE p.part_number = i.part_number
    `
  })

  report.push(`${label}: строк в файле ${rows.length}, обновлено деталей в БД: ${updated}, не найдено в базе: ${unique.length - updated}`)
}

function archive(path: string): void {
  if (!existsSync(path)) return
  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
  renameSync(path, join(PRICE_ARCHIVE_DIR, `${ts}_${path.split(/[\\/]/).pop()}`))
}

export async function runPricesUpdate(): Promise<string> {
  const resultPath = join(UPLOADS_DIR, PRICE_FILES.result)
  const sitePath = join(UPLOADS_DIR, PRICE_FILES.site)

  if (!existsSync(resultPath)) {
    throw new Error('Файл result.xlsx не загружен')
  }

  const report: string[] = []
  const startedAt = new Date()

  const resultRows = await loadResult(resultPath)
  await applyRows(resultRows, 'result.xlsx', report)

  if (existsSync(sitePath)) {
    const siteRows = await loadSite(sitePath)
    await applyRows(siteRows, 'makita_site_update.xlsx (поверх)', report)
  } else {
    report.push('makita_site_update.xlsx: не загружен, шаг пропущен')
  }

  const [total, allParts] = await Promise.all([
    prisma.part.count({ where: { updatedAt: { gte: startedAt } } }),
    prisma.part.count(),
  ])
  report.push(`ИТОГО: обновлено ${total} из ${allParts} деталей каталога`)

  archive(resultPath)
  archive(sitePath)
  report.push('Файлы перемещены в архив. Готово.')

  return report.join('\n')
}
