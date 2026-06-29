import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

export const partsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v2/parts/search?q=&limit=&page= — поиск по артикулу или названию
  // ВАЖНО: этот маршрут должен быть зарегистрирован ДО /:partNumber
  fastify.get<{ Querystring: { q?: string; page?: string; limit?: string } }>(
    '/search',
    async (req, reply) => {
      const q     = (req.query.q || '').trim()
      const page  = Math.max(1, parseInt(req.query.page  || '1'))
      const limit = Math.min(50, parseInt(req.query.limit || '20'))
      const skip  = (page - 1) * limit

      if (!q || q.length < 2) {
        return reply.status(400).send({ error: 'Запрос слишком короткий (минимум 2 символа)' })
      }

      // Ищем уникальные part_number по артикулу или названию.
      // Берём одну строку на part_number (DISTINCT ON эквивалент через groupBy не поддерживается,
      // используем raw query для агрегации).
      const rows = await prisma.$queryRaw<
        { part_number: string; name: string | null; price: number; availability: boolean; slug: string | null; total: bigint }[]
      >`
        SELECT DISTINCT ON (part_number)
          part_number,
          name,
          price,
          availability,
          slug,
          COUNT(*) OVER() AS total
        FROM parts
        WHERE
          part_number ILIKE ${'%' + q + '%'}
          OR name ILIKE ${'%' + q + '%'}
        ORDER BY part_number, id
        LIMIT ${limit} OFFSET ${skip}
      `

      const total = rows.length > 0 ? Number(rows[0].total) : 0
      const data  = rows.map(({ total: _t, ...r }) => r)

      return { data, total, page, limit }
    }
  )

  // GET /api/v2/parts/:partNumber — деталь по артикулу + список моделей где используется
  fastify.get<{ Params: { partNumber: string } }>('/:partNumber', async (req, reply) => {
    const { partNumber } = req.params

    const rows = await prisma.part.findMany({
      where: { partNumber },
      select: {
        id: true,
        partNumber: true,
        name: true,
        price: true,
        availability: true,
        quantity: true,
        slug: true,
        number: true,
        model: {
          select: { id: true, name: true, slug: true, category: { select: { name: true, slug: true } } },
        },
        slide: { select: { slideNumber: true } },
      },
      orderBy: { model: { name: 'asc' } },
    })

    if (!rows.length) return reply.status(404).send({ error: 'Деталь не найдена' })

    const first = rows[0]
    const part = {
      partNumber: first.partNumber,
      name:       first.name,
      price:      first.price,
      availability: first.availability,
      slug:       first.slug,
    }
    const usedIn = rows.map((r) => ({
      modelId:     r.model.id,
      modelName:   r.model.name,
      modelSlug:   r.model.slug,
      category:    r.model.category.name,
      categorySlug: r.model.category.slug,
      number:      r.number,
      slideNumber: r.slide?.slideNumber ?? null,
    }))

    return { data: { ...part, usedIn } }
  })
}
