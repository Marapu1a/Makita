import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import { join } from 'path'
import { categoriesRoutes } from './routes/categories.js'
import { modelsRoutes } from './routes/models.js'
import { partsRoutes } from './routes/parts.js'
import { ordersRoutes } from './routes/orders.js'
import { adminRoutes } from './routes/admin/index.js'
import { prisma } from './db.js'

const server = Fastify({
  logger: true,
  // весь трафик приходит через прокси (Astro middleware / nginx) —
  // без trustProxy rate-limit видел бы один IP на всех посетителей
  trustProxy: true,
  bodyLimit: 1024 * 1024, // JSON-запросам хватает 1 МБ; multipart админки лимитируется отдельно
})

// Браузер ходит на API только через same-origin прокси, кросс-доменные
// запросы легитимны лишь в dev. Прод-домены задаются через CORS_ORIGIN.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:4321', 'http://localhost:5174']
await server.register(cors, { origin: corsOrigins })

// Глобальный потолок на IP; точечные лимиты (заказ, поиск, логин) — в роутах
await server.register(rateLimit, {
  max: 300,
  timeWindow: '1 minute',
})

const imagesPath = process.env.IMAGES_PATH || '/var/www/images'
await server.register(staticFiles, {
  root: imagesPath,
  prefix: '/images/',
  decorateReply: false,
})

await server.register(categoriesRoutes, { prefix: '/api/v2/categories' })
await server.register(modelsRoutes,     { prefix: '/api/v2/models' })
await server.register(partsRoutes,      { prefix: '/api/v2/parts' })
await server.register(ordersRoutes,     { prefix: '/api/v2/orders' })
await server.register(adminRoutes,      { prefix: '/api/v2/admin' })

server.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

const port = parseInt(process.env.PORT || '5001')

try {
  await server.listen({ port, host: '0.0.0.0' })
} catch (err) {
  server.log.error(err)
  await prisma.$disconnect()
  process.exit(1)
}
