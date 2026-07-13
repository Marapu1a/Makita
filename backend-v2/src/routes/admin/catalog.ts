import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db.js'
import { idParamsSchema } from '../../lib/schemas.js'

export const adminCatalogRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /search?q= — единый поиск: модели по имени + детали по артикулу/названию
  fastify.get<{ Querystring: { q?: string } }>('/search', async (req, reply) => {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return reply.status(400).send({ error: 'Минимум 2 символа' })

    const [models, parts] = await Promise.all([
      prisma.model.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, category: { select: { name: true } } },
        orderBy: { name: 'asc' },
        take: 10,
      }),
      prisma.part.findMany({
        where: {
          OR: [
            { partNumber: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, partNumber: true, name: true, price: true, availability: true },
        orderBy: { partNumber: 'asc' },
        take: 15,
      }),
    ])

    return {
      data: {
        models: models.map((m) => ({ id: m.id, name: m.name, category: m.category.name })),
        parts,
      },
    }
  })

  // GET /categories — дерево категорий с числом моделей
  fastify.get('/categories', async () => {
    const cats = await prisma.category.findMany({
      select: { id: true, name: true, parentId: true, _count: { select: { models: true } } },
      orderBy: { name: 'asc' },
    })
    return {
      data: cats.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        modelsCount: c._count.models,
      })),
    }
  })

  // GET /categories/:id/models — модели категории
  fastify.get<{ Params: { id: string } }>('/categories/:id/models', { schema: { params: idParamsSchema } }, async (req) => {
    const models = await prisma.model.findMany({
      where: { categoryId: parseInt(req.params.id) },
      select: { id: true, name: true, slug: true, _count: { select: { diagramParts: true } } },
      orderBy: { name: 'asc' },
    })
    return {
      data: models.map((m) => ({ id: m.id, name: m.name, slug: m.slug, partsCount: m._count.diagramParts })),
    }
  })

  // GET /models/:id — модель + SEO-поля + детали
  fastify.get<{ Params: { id: string } }>('/models/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const model = await prisma.model.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        h1: true,
        content: true,
        isIndexable: true,
        category: { select: { id: true, name: true, slug: true } },
        diagramParts: {
          select: {
            number: true,
            part: { select: { id: true, partNumber: true, name: true, price: true, availability: true } },
          },
          orderBy: { number: 'asc' },
        },
      },
    })
    if (!model) return reply.status(404).send({ error: 'Модель не найдена' })

    const { diagramParts, ...rest } = model
    return {
      data: {
        ...rest,
        parts: diagramParts.map((dp) => ({ number: dp.number, ...dp.part })),
      },
    }
  })

  // PATCH /models/:id — SEO-поля и имя
  fastify.patch<{
    Params: { id: string }
    Body: { name?: string; seoTitle?: string | null; seoDescription?: string | null; h1?: string | null; content?: string | null; isIndexable?: boolean }
  }>('/models/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const b = req.body || {}

    const data: Prisma.ModelUpdateInput = {}
    if (b.name !== undefined) {
      if (!b.name.trim()) return reply.status(400).send({ error: 'Имя модели не может быть пустым' })
      data.name = b.name.trim()
    }
    for (const f of ['seoTitle', 'seoDescription', 'h1', 'content'] as const) {
      if (b[f] !== undefined) data[f] = b[f] === '' ? null : b[f]
    }
    if (b.isIndexable !== undefined) data.isIndexable = b.isIndexable
    if (!Object.keys(data).length) return reply.status(400).send({ error: 'Нет полей для обновления' })
    data.updatedAt = new Date()

    try {
      const model = await prisma.model.update({ where: { id }, data })
      return { data: model }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') return reply.status(404).send({ error: 'Модель не найдена' })
        if (e.code === 'P2002') return reply.status(409).send({ error: 'Модель с таким именем уже есть' })
      }
      throw e
    }
  })

  // GET /parts/:id — деталь + где используется
  fastify.get<{ Params: { id: string } }>('/parts/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const part = await prisma.part.findUnique({
      where: { id },
      select: {
        id: true,
        partNumber: true,
        name: true,
        price: true,
        availability: true,
        quantity: true,
        slug: true,
        updatedAt: true,
        diagramParts: {
          select: {
            number: true,
            model: { select: { id: true, name: true, category: { select: { name: true } } } },
          },
          orderBy: { model: { name: 'asc' } },
        },
      },
    })
    if (!part) return reply.status(404).send({ error: 'Деталь не найдена' })

    const { diagramParts, ...rest } = part
    const seen = new Set<number>()
    const usedIn: { modelId: number; modelName: string; category: string; number: number }[] = []
    for (const dp of diagramParts) {
      if (seen.has(dp.model.id)) continue
      seen.add(dp.model.id)
      usedIn.push({ modelId: dp.model.id, modelName: dp.model.name, category: dp.model.category.name, number: dp.number })
    }
    return { data: { ...rest, usedIn } }
  })

  // PATCH /parts/:id — цена/наличие/количество/название/артикул
  fastify.patch<{
    Params: { id: string }
    Body: { partNumber?: string; name?: string | null; price?: number; availability?: boolean; quantity?: number }
  }>('/parts/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const b = req.body || {}

    const data: Prisma.PartUpdateInput = {}
    if (b.partNumber !== undefined) {
      const pn = b.partNumber.trim()
      if (!pn) return reply.status(400).send({ error: 'Артикул не может быть пустым' })
      data.partNumber = pn
    }
    if (b.name !== undefined) data.name = b.name === '' ? null : b.name
    if (b.price !== undefined) {
      if (!Number.isFinite(b.price) || b.price < 0) return reply.status(400).send({ error: 'Некорректная цена' })
      data.price = Math.round(b.price)
    }
    if (b.availability !== undefined) data.availability = b.availability
    if (b.quantity !== undefined) {
      if (!Number.isInteger(b.quantity) || b.quantity < 0) return reply.status(400).send({ error: 'Некорректное количество' })
      data.quantity = b.quantity
    }
    if (!Object.keys(data).length) return reply.status(400).send({ error: 'Нет полей для обновления' })
    data.updatedAt = new Date()

    try {
      const part = await prisma.part.update({
        where: { id },
        data,
        select: { id: true, partNumber: true, name: true, price: true, availability: true, quantity: true },
      })
      return { data: part }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') return reply.status(404).send({ error: 'Деталь не найдена' })
        if (e.code === 'P2002') return reply.status(409).send({ error: 'Деталь с таким артикулом уже существует' })
      }
      throw e
    }
  })
}
