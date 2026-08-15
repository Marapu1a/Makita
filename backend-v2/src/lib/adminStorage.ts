import { join } from 'path'
import { mkdirSync } from 'fs'

// Файловое хранилище админки: загруженные прайсы, их архив, дампы БД.
// На проде каталог монтируется volume'ом, чтобы переживать пересборку контейнера.
const ROOT = process.env.ADMIN_STORAGE_DIR || join(process.cwd(), 'storage')

export const UPLOADS_DIR = join(ROOT, 'uploads')
export const PRICE_ARCHIVE_DIR = join(ROOT, 'price-archive')
export const DB_BACKUPS_DIR = join(ROOT, 'db-backups')

for (const dir of [UPLOADS_DIR, PRICE_ARCHIVE_DIR, DB_BACKUPS_DIR]) {
  mkdirSync(dir, { recursive: true })
}

// Имена файлов прайсов по типу загрузки
export const PRICE_FILES = {
  result: 'result.xlsx', // основной источник (обязателен)
} as const

export type PriceKind = keyof typeof PRICE_FILES
