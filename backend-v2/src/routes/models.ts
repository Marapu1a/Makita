import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

export const modelsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v2/models/search?q= — поиск моделей по имени (для строки поиска)
  fastify.get<{ Querystring: { q?: string } }>('/search', async (req, reply) => {
    const q = (req.query.q || '').trim()
    if (q.length < 2) return { data: [] }

    const models = await prisma.model.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        slug: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    })
    return { data: models }
  })

  // GET /api/v2/models/by-id/:id — slug по старому ID (для 301-редиректов)
  fastify.get<{ Params: { id: string } }>('/by-id/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.status(400).send({ error: 'Неверный ID' })

    const model = await prisma.model.findUnique({
      where: { id },
      select: { slug: true, category: { select: { slug: true } } },
    })
    if (!model?.slug) return reply.status(404).send({ error: 'Модель не найдена' })
    return { data: { slug: model.slug, categorySlug: model.category.slug } }
  })

  // GET /api/v2/models/:slug — модель + категория + слайды с деталями
  fastify.get<{ Params: { slug: string } }>('/:slug', async (req, reply) => {
    const { slug } = req.params

    const model = await prisma.model.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        imagePath: true,
        seoTitle: true,
        seoDescription: true,
        h1: true,
        content: true,
        isIndexable: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        slides: {
          orderBy: { slideNumber: 'asc' },
          select: {
            id: true,
            slideNumber: true,
            imagePath: true,
            imageWidth: true,
            imageHeight: true,
            hasSvg: true,
          },
        },
        // Все детали плоским списком — клиент фильтрует по slideId сам (как старый фронт)
        parts: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            slideId: true,
            number: true,
            partNumber: true,
            name: true,
            price: true,
            availability: true,
            quantity: true,
            slug: true,
            xCoord: true,
            yCoord: true,
            width: true,
            height: true,
          },
        },
      },
    })

    if (!model) return reply.status(404).send({ error: 'Модель не найдена' })
    return { data: model }
  })

  // GET /api/v2/models — список моделей по category_id (legacy-совместимость)
  fastify.get<{ Querystring: { category_id?: string } }>('/', async (req, reply) => {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null
    if (!categoryId) return reply.status(400).send({ error: 'Нужен параметр category_id' })

    const models = await prisma.model.findMany({
      where: { categoryId },
      select: { id: true, name: true, slug: true, imagePath: true },
      orderBy: { name: 'asc' },
    })
    return { data: models }
  })
}
