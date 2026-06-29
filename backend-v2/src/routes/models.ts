import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

export const modelsRoutes: FastifyPluginAsync = async (fastify) => {
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
