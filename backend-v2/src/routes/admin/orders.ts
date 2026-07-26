import type { FastifyPluginAsync } from 'fastify'
import { OrderStatus } from '@prisma/client'
import { prisma } from '../../db.js'
import { idParamsSchema } from '../../lib/schemas.js'
import { getOrderPricing } from '../../lib/orderPricing.js'

const DATE_RE = '^\\d{4}-\\d{2}-\\d{2}$'
const ordersListQuerySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', maxLength: 32 },
    phone: { type: 'string', maxLength: 32 },
    from: { type: 'string', pattern: DATE_RE },
    to: { type: 'string', pattern: DATE_RE },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  },
} as const

// В БД статусы хранятся русскими значениями (@map), Prisma оперирует ключами.
// Наружу отдаём и принимаем русские подписи — фронту не нужно знать про enum-ключи.
const STATUS_RU: Record<OrderStatus, string> = {
  NEW: 'Новый',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}
const RU_STATUS = Object.fromEntries(
  Object.entries(STATUS_RU).map(([k, v]) => [v, k as OrderStatus])
)

const DELIVERY_RU: Record<string, string> = {
  PICKUP: 'Самовывоз',
  DELIVERY: 'Доставка по Москве',
  REGION_SHIPPING: 'Отправка в другой город',
}

export const adminOrdersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /?status=&phone=&from=&to=&page=&limit= — список с фильтрами и пагинацией
  fastify.get<{
    Querystring: { status?: string; phone?: string; from?: string; to?: string; page?: string; limit?: string }
  }>('/', { schema: { querystring: ordersListQuerySchema } }, async (req, reply) => {
    const page = Math.max(1, parseInt(req.query.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25')))

    const where: Record<string, unknown> = {}

    if (req.query.status) {
      const key = RU_STATUS[req.query.status]
      if (!key) return reply.status(400).send({ error: `Неизвестный статус: ${req.query.status}` })
      where.status = key
    }
    if (req.query.phone) {
      // в БД телефоны форматированные («+7 (964) 164-64-64») — сравниваем по цифрам
      const digits = req.query.phone.replace(/\D/g, '')
      if (digits) {
        const ids = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM orders WHERE regexp_replace(phone, '\D', '', 'g') LIKE ${'%' + digits + '%'}
        `
        where.id = { in: ids.map((r) => r.id) }
      }
    }
    const createdAt: Record<string, Date> = {}
    if (req.query.from) createdAt.gte = new Date(`${req.query.from}T00:00:00`)
    if (req.query.to) createdAt.lt = new Date(new Date(`${req.query.to}T00:00:00`).getTime() + 86400_000) // включительно
    if (Object.keys(createdAt).length) where.createdAt = createdAt

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { items: true } } },
      }),
    ])

    return {
      data: rows.map((o) => {
        const pricing = getOrderPricing(
          o.totalPrice,
          o.deliveryMethod,
          o.deliveryZone,
          o.deliveryCost
        )
        return {
          id: o.id,
          name: o.name,
          phone: o.phone,
          status: STATUS_RU[o.status],
          ...pricing,
          itemsCount: o._count.items,
          createdAt: o.createdAt,
        }
      }),
      total,
      page,
      limit,
    }
  })

  // GET /:id — карточка заказа с позициями
  fastify.get<{ Params: { id: string } }>('/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            part: {
              select: {
                partNumber: true,
                name: true,
                slug: true,
                diagramParts: {
                  select: { model: { select: { name: true } } },
                  orderBy: { model: { name: 'asc' } },
                  distinct: ['modelId'],
                  take: 5,
                },
              },
            },
          },
        },
      },
    })
    if (!order) return reply.status(404).send({ error: 'Заказ не найден' })

    const pricing = getOrderPricing(
      order.totalPrice,
      order.deliveryMethod,
      order.deliveryZone,
      order.deliveryCost
    )

    return {
      data: {
        id: order.id,
        name: order.name,
        phone: order.phone,
        email: order.email,
        deliveryMethod: DELIVERY_RU[order.deliveryMethod] || order.deliveryMethod,
        deliveryZone: order.deliveryZone,
        transportCompany: order.transportCompany,
        city: order.city,
        street: order.street,
        house: order.house,
        apartment: order.apartment,
        comment: order.comment,
        status: STATUS_RU[order.status],
        ...pricing,
        createdAt: order.createdAt,
        items: order.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          price: it.price,
          partNumber: it.part?.partNumber ?? '—',
          partName: it.part?.name ?? 'Деталь удалена',
          partSlug: it.part?.slug ?? null,
          models: it.part?.diagramParts.map((dp) => dp.model.name) ?? [],
        })),
      },
    }
  })

  // PATCH /:id — смена статуса
  fastify.patch<{ Params: { id: string }; Body: { status?: string } }>('/:id', { schema: { params: idParamsSchema } }, async (req, reply) => {
    const id = parseInt(req.params.id)
    const key = req.body?.status ? RU_STATUS[req.body.status] : undefined
    if (!key) return reply.status(400).send({ error: 'Не передан корректный статус' })

    const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return reply.status(404).send({ error: 'Заказ не найден' })

    const order = await prisma.order.update({ where: { id }, data: { status: key } })
    return { data: { id: order.id, status: STATUS_RU[order.status] } }
  })
}
