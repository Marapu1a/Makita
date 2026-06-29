import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
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
        select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, parentId: true },
      })
      if (!category) return reply.status(404).send({ error: 'Категория не найдена' })

      // Включаем подкатегории (children) в выборку моделей
      const categoryIds = [category.id]
      if (category.parentId === null) {
        const children = await prisma.category.findMany({
          where: { parentId: category.id },
          select: { id: true },
        })
        categoryIds.push(...children.map((c) => c.id))
      }

      const [total, models] = await Promise.all([
        prisma.model.count({ where: { categoryId: { in: categoryIds } } }),
        prisma.model.findMany({
          where: { categoryId: { in: categoryIds } },
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
