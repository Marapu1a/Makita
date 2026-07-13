import type { FastifyPluginAsync } from 'fastify'
import { spawn } from 'child_process'
import { createWriteStream, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { prisma } from '../../db.js'
import { DB_BACKUPS_DIR, PRICE_ARCHIVE_DIR } from '../../lib/adminStorage.js'

async function newestFile(dir: string): Promise<{ name: string; mtime: string } | null> {
  const files = await readdir(dir).catch(() => [] as string[])
  let newest: { name: string; mtime: string } | null = null
  for (const f of files) {
    const m = statSync(join(dir, f)).mtime.toISOString()
    if (!newest || m > newest.mtime) newest = { name: f, mtime: m }
  }
  return newest
}

let backupRunning = false

export const adminSystemRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /summary — сводка для дашборда
  fastify.get('/summary', async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400_000)
    const [newOrders, ordersWeek, partsTotal, partsNoPrice, modelsTotal, lastPriceRun, lastBackup] =
      await Promise.all([
        prisma.order.count({ where: { status: 'NEW' } }),
        prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.part.count(),
        prisma.part.count({ where: { price: 0 } }),
        prisma.model.count(),
        newestFile(PRICE_ARCHIVE_DIR),
        newestFile(DB_BACKUPS_DIR),
      ])

    return {
      data: {
        newOrders,
        ordersWeek,
        partsTotal,
        partsNoPrice,
        modelsTotal,
        lastPriceRunAt: lastPriceRun?.mtime ?? null,
        lastBackupAt: lastBackup?.mtime ?? null,
        lastBackupName: lastBackup?.name ?? null,
      },
    }
  })

  // POST /backup — pg_dump | gzip → storage/db-backups/
  fastify.post('/backup', async (_req, reply) => {
    if (backupRunning) return reply.status(409).send({ error: 'Бэкап уже выполняется' })
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) return reply.status(500).send({ error: 'DATABASE_URL не задан' })

    backupRunning = true
    try {
      const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
      const fileName = `backup_${ts}.sql.gz`
      const outPath = join(DB_BACKUPS_DIR, fileName)

      const dump = spawn('pg_dump', ['--dbname', dbUrl])
      let stderr = ''
      dump.stderr.on('data', (d) => (stderr += d))

      const exitCode = new Promise<number>((resolve) => dump.on('close', resolve))
      await pipeline(dump.stdout, createGzip(), createWriteStream(outPath))

      if ((await exitCode) !== 0) {
        return reply.status(500).send({ error: `pg_dump завершился с ошибкой: ${stderr.slice(0, 500)}` })
      }

      const size = statSync(outPath).size
      return { success: true, message: `Бэкап создан: ${fileName} (${(size / 1024 / 1024).toFixed(1)} МБ)` }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return reply.status(500).send({ error: `Ошибка бэкапа: ${msg}` })
    } finally {
      backupRunning = false
    }
  })
}
