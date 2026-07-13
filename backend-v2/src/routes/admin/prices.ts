import type { FastifyPluginAsync } from 'fastify'
import { createWriteStream, existsSync, statSync, unlinkSync } from 'fs'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { UPLOADS_DIR, PRICE_ARCHIVE_DIR, PRICE_FILES, type PriceKind } from '../../lib/adminStorage.js'
import { runPricesUpdate } from '../../lib/pricesUpdate.js'

let updateRunning = false

export const adminPricesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /status — какие файлы загружены и когда был последний прогон
  fastify.get('/status', async () => {
    const files: Record<string, { uploaded: boolean; uploadedAt: string | null; size: number | null }> = {}
    for (const [kind, name] of Object.entries(PRICE_FILES)) {
      const path = join(UPLOADS_DIR, name)
      const exists = existsSync(path)
      const stat = exists ? statSync(path) : null
      files[kind] = {
        uploaded: exists,
        uploadedAt: stat ? stat.mtime.toISOString() : null,
        size: stat ? stat.size : null,
      }
    }

    // последний прогон — самый свежий файл в архиве
    let lastRunAt: string | null = null
    const archived = await readdir(PRICE_ARCHIVE_DIR).catch(() => [] as string[])
    for (const f of archived) {
      const m = statSync(join(PRICE_ARCHIVE_DIR, f)).mtime.toISOString()
      if (!lastRunAt || m > lastRunAt) lastRunAt = m
    }

    return { data: { files, lastRunAt, running: updateRunning } }
  })

  // POST /upload/:kind — загрузка xlsx (kind = result | site)
  fastify.post<{ Params: { kind: string } }>('/upload/:kind', async (req, reply) => {
    const kind = req.params.kind as PriceKind
    const targetName = PRICE_FILES[kind]
    if (!targetName) return reply.status(400).send({ error: `Неизвестный тип файла: ${kind}` })

    const file = await req.file()
    if (!file) return reply.status(400).send({ error: 'Файл не передан' })

    const targetPath = join(UPLOADS_DIR, targetName)
    await pipeline(file.file, createWriteStream(targetPath))

    if (file.file.truncated) {
      unlinkSync(targetPath)
      return reply.status(400).send({ error: 'Файл слишком большой' })
    }

    // xlsx — это zip: первые байты PK
    const { openSync, readSync, closeSync } = await import('fs')
    const fd = openSync(targetPath, 'r')
    const head = Buffer.alloc(2)
    readSync(fd, head, 0, 2, 0)
    closeSync(fd)
    if (head.toString('latin1') !== 'PK') {
      unlinkSync(targetPath)
      return reply.status(400).send({ error: 'Это не xlsx-файл (возможно, старый .xls — пересохраните в .xlsx)' })
    }

    return { success: true, message: `Файл ${targetName} загружен` }
  })

  // POST /run — прогон обновления, возвращает отчёт
  fastify.post('/run', async (_req, reply) => {
    if (updateRunning) return reply.status(409).send({ error: 'Обновление уже выполняется' })
    updateRunning = true
    try {
      const report = await runPricesUpdate()
      return { success: true, report }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.status(500).send({ error: `Ошибка обновления: ${msg}` })
    } finally {
      updateRunning = false
    }
  })
}
