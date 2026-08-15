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
//
// ВАЖНО: читаем потоковым ExcelJS.stream.xlsx.WorkbookReader, а не
// Workbook.xlsx.readFile(). Обычный ридер строит в памяти полную DOM-модель
// книги (стили, shared strings, все строки разом) — на result.xlsx (~47k строк)
// это ушло за 490 МБ и убило процесс OOM-киллером на проде (957 МБ RAM, без свопа).
// Потоковый ридер разбирает файл построчно и почти не держит его в памяти.

interface ImportRow {
  part_number: string
  price: number | null // null = цену не менять (пустая или <=0 в файле)
  availability: boolean
  quantity: number
}

const RESULT_PRICE_COL = 'цена для физлиц'

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('result' in value) return String((value as ExcelJS.CellFormulaValue).result ?? '')
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
    return ''
  }
  return String(value)
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  const t = cellText(value).replace(',', '.').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

// exceljs WorkbookReader отдаёт Row только внутри итерации, поэтому разбор
// строки — inline-колбэк на месте в каждой функции, без общей абстракции
// (она усложнила бы типизацию без реальной выгоды при всего двух форматах файла).

// Найти нужный лист среди листов книги.
// ВАЖНО: в потоковом режиме (worksheets: 'emit') exceljs не успевает
// сопоставить настоящие имена листов из workbook.xml — worksheet.name
// приходит как заглушка "Sheet1", "Sheet2"... (проверено на реальных файлах).
// Поэтому лист ищем не по имени, а по набору колонок в шапке — оно
// однозначно отличает нужный лист от остальных в обоих форматах файлов.
async function loadByColumns(path: string, requiredCols: string[], fileLabel: string): Promise<ImportRow[]> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(path, {
    entries: 'emit',
    sharedStrings: 'cache',
    styles: 'ignore',
    worksheets: 'emit',
  })

  const rows: ImportRow[] = []
  let found = false

  for await (const worksheet of reader) {
    let colByName: Record<string, number> | null = null

    for await (const row of worksheet) {
      if (row.number === 1) {
        const header: Record<string, number> = {}
        row.eachCell((cell, colNumber) => {
          header[cellText(cell.value).trim()] = colNumber
        })
        if (requiredCols.every((c) => c in header)) {
          colByName = header
          found = true
        }
        continue
      }
      if (!colByName) continue // не наш лист — строки пропускаем, не разбирая

      rows.push(parseRow(row, colByName, requiredCols))
    }
  }

  if (!found) throw new Error(`${fileLabel}: не найден лист с колонками ${requiredCols.join(', ')}`)
  return rows
}

function parseRow(row: ExcelJS.Row, col: Record<string, number>, requiredCols: string[]): ImportRow {
  const pn = cellText(row.getCell(col['Артикул']).value).trim()
  // result.xlsx: доступно (наличие) Y/пусто + доступно (кол-во)
  // makita_site_update.xlsx: только Количество (наличие = количество > 0)
  if (requiredCols.includes('доступно (наличие)')) {
    let price = cellNumber(row.getCell(col[RESULT_PRICE_COL]).value)
    if (price !== null && price <= 0) price = null
    const availability = cellText(row.getCell(col['доступно (наличие)']).value).trim().toUpperCase() === 'Y'
    const quantity = Math.trunc(cellNumber(row.getCell(col['доступно (кол-во)']).value) ?? 0)
    return { part_number: pn, price, availability, quantity }
  }
  let price = cellNumber(row.getCell(col['Цена']).value)
  if (price !== null && price <= 0) price = null
  const quantity = Math.trunc(cellNumber(row.getCell(col['Количество']).value) ?? 0)
  return { part_number: pn, price, availability: quantity > 0, quantity }
}

async function loadResult(path: string): Promise<ImportRow[]> {
  const rows = await loadByColumns(
    path,
    ['Артикул', 'доступно (наличие)', 'доступно (кол-во)', RESULT_PRICE_COL],
    'result.xlsx'
  )
  return rows.filter((r) => r.part_number)
}

async function loadSite(path: string): Promise<ImportRow[]> {
  const rows = await loadByColumns(path, ['Артикул', 'Количество', 'Цена'], 'makita_site_update.xlsx')
  return rows.filter((r) => r.part_number)
}

async function applyRows(rows: ImportRow[], label: string, report: string[]): Promise<void> {
  // дубли артикулов в файле: последняя строка побеждает
  const dedup = new Map<string, ImportRow>()
  for (const r of rows) dedup.set(r.part_number, r)
  const unique = [...dedup.values()]

  const updated = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
      CREATE TEMP TABLE _price_import (
        part_number  VARCHAR PRIMARY KEY,
        price        DOUBLE PRECISION,
        availability BOOLEAN,
        quantity     INTEGER
      ) ON COMMIT DROP
    `
      // пачками по 5000 — один JSONB-параметр на полные 47k строк не разгонит
      // память так, как DOM-парсер xlsx, но лишний повод не собирать гигантскую
      // строку целиком незачем
      const BATCH = 5000
      for (let i = 0; i < unique.length; i += BATCH) {
        const batch = unique.slice(i, i + BATCH)
        await tx.$executeRaw`
        INSERT INTO _price_import (part_number, price, availability, quantity)
        SELECT part_number, price, availability, quantity
        FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
          AS t(part_number VARCHAR, price DOUBLE PRECISION, availability BOOLEAN, quantity INTEGER)
      `
      }
      return tx.$executeRaw`
      UPDATE parts p
      SET price        = ROUND(COALESCE(i.price, p.price)),
          availability = i.availability,
          quantity     = i.quantity,
          updated_at   = NOW()
      FROM _price_import i
      WHERE p.part_number = i.part_number
    `
    },
    { timeout: 5 * 60 * 1000 }
  )

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
