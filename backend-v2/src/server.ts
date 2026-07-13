import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { join } from 'path'
import { categoriesRoutes } from './routes/categories.js'
import { modelsRoutes } from './routes/models.js'
import { partsRoutes } from './routes/parts.js'
import { ordersRoutes } from './routes/orders.js'
import { adminRoutes } from './routes/admin/index.js'
import { prisma } from './db.js'

const server = Fastify({ logger: true })

await server.register(cors, { origin: '*' })

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
