import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v2/categories/sitemap — все слаги для sitemap.xml
  fastify.get('/sitemap', async () => {
    const [categories, models] = await Promise.all([
      prisma.category.findMany({
        where: { slug: { not: null } },
        select: { slug: true },
        orderBy: { name: 'asc' },
      }),
      prisma.model.findMany({
        where: { slug: { not: null } },
        select: { slug: true, category: { select: { slug: true } } },
        orderBy: { name: 'asc' },
      }),
    ])
    return {
      categories: categories.map((c) => c.slug),
      models: models.map((m) => ({ slug: m.slug, categorySlug: m.category.slug })),
    }
  })

  // GET /api/v2/categories — дерево категорий (root + children)
  fastify.get('/', async () => {
    const roots = await prisma.category.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    return { data: roots }
  })

  // GET /api/v2/categories/:slug — категория + список моделей (с пагинацией)
  fastify.get<{ Params: { slug: string }; Querystring: { page?: string; limit?: string } }>(
    '/:slug',
    async (req, reply) => {
      const { slug } = req.params
      const page  = Math.max(1, parseInt(req.query.page  || '1'))
      const limit = Math.min(100, parseInt(req.query.limit || '60'))
      const skip  = (page - 1) * limit

      const category = await prisma.category.findFirst({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          seoTitle: true,
          seoDescription: true,
          parentId: true,
          parent: { select: { id: true, name: true, slug: true } },
          children: {
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
          },
        },
      })
      if (!category) return reply.status(404).send({ error: 'Категория не найдена' })

      // Только собственные модели категории: у родительских категорий моделей нет,
      // их модели живут в подкатегориях и показываются на страницах подкатегорий
      const [total, models] = await Promise.all([
        prisma.model.count({ where: { categoryId: category.id } }),
        prisma.model.findMany({
          where: { categoryId: category.id },
          select: { id: true, name: true, slug: true, imagePath: true },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
      ])

      return { data: category, models, total, page, limit }
    }
  )
}
