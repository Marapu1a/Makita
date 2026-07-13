import type { FastifyPluginAsync } from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { timingSafeEqual } from 'crypto'
import { adminOrdersRoutes } from './orders.js'
import { adminCatalogRoutes } from './catalog.js'
import { adminPricesRoutes } from './prices.js'
import { adminSystemRoutes } from './system.js'

const COOKIE_NAME = 'admin_token'
const TOKEN_TTL = '24h'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

// Админ-API: /api/v2/admin/*
// Авторизация — JWT в httpOnly-куке; SPA и API живут на одном origin
// (nginx на проде, vite-прокси локально), поэтому CORS и Bearer не нужны.
export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const { ADMIN_LOGIN, ADMIN_PASSWORD, JWT_SECRET } = process.env
  if (!ADMIN_LOGIN || !ADMIN_PASSWORD || !JWT_SECRET) {
    throw new Error('Админ-API: не заданы ADMIN_LOGIN / ADMIN_PASSWORD / JWT_SECRET')
  }

  await fastify.register(cookie)
  await fastify.register(jwt, {
    secret: JWT_SECRET,
    cookie: { cookieName: COOKIE_NAME, signed: false },
  })
  // rate-limit зарегистрирован глобально в server.ts; здесь только route-конфиги
  await fastify.register(multipart, {
    limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  })

  // POST /login — единственный публичный роут, с защитой от перебора
  fastify.post<{ Body: { login?: string; password?: string } }>(
    '/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { login, password } = req.body || {}
      if (!login || !password || !safeEqual(login, ADMIN_LOGIN) || !safeEqual(password, ADMIN_PASSWORD)) {
        return reply.status(401).send({ error: 'Неверный логин или пароль' })
      }
      const token = fastify.jwt.sign({ role: 'admin' }, { expiresIn: TOKEN_TTL })
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60,
      })
      return { success: true }
    }
  )

  fastify.post('/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' })
    return { success: true }
  })

  // Защищённая зона: все остальные роуты требуют валидную куку
  await fastify.register(async (protectedZone) => {
    protectedZone.addHook('onRequest', async (req, reply) => {
      try {
        await req.jwtVerify()
      } catch {
        return reply.status(401).send({ error: 'Не авторизован' })
      }
    })

    // GET /me — проверка сессии для фронта
    protectedZone.get('/me', async () => ({ success: true, role: 'admin' }))

    await protectedZone.register(adminOrdersRoutes, { prefix: '/orders' })
    await protectedZone.register(adminCatalogRoutes, { prefix: '/catalog' })
    await protectedZone.register(adminPricesRoutes, { prefix: '/prices' })
    await protectedZone.register(adminSystemRoutes, { prefix: '/system' })
  })
}
