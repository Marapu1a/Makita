import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { slugParamsSchema, pagingQuerySchema } from '../lib/schemas.js'

// Общий include: где деталь используется
const usedInSelect = {
  diagramParts: {
    select: {
      number: true,
      slide: { select: { slideNumber: true } },
      model: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { model: { name: 'asc' } },
  },
} as const

function shapePart(part: {
  id: number
  partNumber: string
  name: string | null
  price: number
  availability: boolean
  quantity: number
  slug: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  h1?: string | null
  content?: string | null
  isIndexable?: boolean
  diagramParts: {
    number: number
    slide: { slideNumber: number } | null
    model: { id: number; name: string; slug: string | null; category: { name: string; slug: string | null } }
  }[]
}) {
  const { diagramParts, ...rest } = part
  return {
    ...rest,
    usedIn: diagramParts.map((dp) => ({
      modelId: dp.model.id,
      modelName: dp.model.name,
      modelSlug: dp.model.slug,
      category: dp.model.category.name,
      categorySlug: dp.model.category.slug,
      number: dp.number,
      slideNumber: dp.slide?.slideNumber ?? null,
    })),
  }
}

export const partsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v2/parts/search?q=&limit=&page= — поиск по артикулу или названию
  fastify.get<{ Querystring: { q?: string; page?: string; limit?: string } }>(
    '/search',
    {
      schema: { querystring: pagingQuerySchema(50) },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const q     = (req.query.q || '').trim()
      const page  = Math.max(1, parseInt(req.query.page  || '1'))
      const limit = Math.min(50, parseInt(req.query.limit || '20'))

      if (!q || q.length < 2) {
        return reply.status(400).send({ error: 'Запрос слишком короткий (минимум 2 символа)' })
      }

      const where = {
        OR: [
          { partNumber: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
        ],
      }

      const [total, rows] = await Promise.all([
        prisma.part.count({ where }),
        prisma.part.findMany({
          where,
          select: { partNumber: true, name: true, price: true, availability: true, slug: true },
          orderBy: { partNumber: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ])

      // Ключи в snake_case — для совместимости с прежним форматом ответа
      const data = rows.map((r) => ({
        part_number: r.partNumber,
        name: r.name,
        price: r.price,
        availability: r.availability,
        slug: r.slug,
      }))

      return { data, total, page, limit }
    }
  )

  // GET /api/v2/parts/by-slug/:slug — деталь по слагу (для SEO-страниц)
  fastify.get<{ Params: { slug: string } }>('/by-slug/:slug', { schema: { params: slugParamsSchema } }, async (req, reply) => {
    const part = await prisma.part.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        partNumber: true,
        name: true,
        price: true,
        availability: true,
        quantity: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        h1: true,
        content: true,
        isIndexable: true,
        ...usedInSelect,
      },
    })
    if (!part) return reply.status(404).send({ error: 'Деталь не найдена' })
    return { data: shapePart(part) }
  })

  // GET /api/v2/parts/sitemap — слаги индексируемых деталей
  fastify.get('/sitemap', async () => {
    const parts = await prisma.part.findMany({
      where: { slug: { not: null }, isIndexable: true },
      select: { slug: true },
      orderBy: { partNumber: 'asc' },
    })
    return { parts: parts.map((p) => p.slug) }
  })

  // GET /api/v2/parts/:partNumber — деталь по артикулу + где используется
  fastify.get<{ Params: { partNumber: string } }>('/:partNumber', async (req, reply) => {
    const part = await prisma.part.findUnique({
      where: { partNumber: req.params.partNumber },
      select: {
        id: true,
        partNumber: true,
        name: true,
        price: true,
        availability: true,
        quantity: true,
        slug: true,
        ...usedInSelect,
      },
    })
    if (!part) return reply.status(404).send({ error: 'Деталь не найдена' })
    return { data: shapePart(part) }
  })
}
