import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'
import { sendCustomerOrderConfirmation, sendOrderNotification } from '../lib/mailer.js'
import { calculateDeliveryPricing, type DeliveryZone } from '../lib/orderPricing.js'

const DELIVERY_MAP: Record<string, 'PICKUP' | 'DELIVERY' | 'REGION_SHIPPING'> = {
  'Самовывоз': 'PICKUP',
  'Доставка': 'DELIVERY',
  'Отправка в регион': 'REGION_SHIPPING',
}

interface OrderItemInput {
  partId: number
  quantity: number
}

interface OrderBody {
  name: string
  phone: string
  email: string
  delivery_method: string
  delivery_zone?: DeliveryZone
  transport_company?: string
  city?: string
  street?: string
  house?: string
  apartment?: string
  comment?: string
  items: OrderItemInput[]
}

// Клиент присылает только partId+quantity: цены и сумма считаются
// исключительно по БД (клиентская цена — не источник истины).
const orderBodySchema = {
  type: 'object',
  required: ['name', 'phone', 'email', 'delivery_method', 'items'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    phone: { type: 'string', minLength: 5, maxLength: 32 },
    email: { type: 'string', minLength: 5, maxLength: 255, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$' },
    delivery_method: { type: 'string', enum: Object.keys(DELIVERY_MAP) },
    delivery_zone: {
      type: 'string',
      enum: ['WITHIN_MKAD', 'MKAD_TO_TTK', 'TTK_TO_GARDEN', 'INSIDE_GARDEN', 'OUTSIDE_MKAD'],
    },
    transport_company: { type: 'string', maxLength: 255 },
    city: { type: 'string', maxLength: 255 },
    street: { type: 'string', maxLength: 255 },
    house: { type: 'string', maxLength: 64 },
    apartment: { type: 'string', maxLength: 64 },
    comment: { type: 'string', maxLength: 2000 },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        required: ['partId', 'quantity'],
        properties: {
          partId: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', minimum: 1, maximum: 999 },
        },
      },
    },
  },
} as const

export const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v2/orders — оформить заказ
  fastify.post<{ Body: OrderBody }>(
    '/',
    {
      schema: { body: orderBodySchema },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      attachValidation: true,
    },
    async (req, reply) => {
      if (req.validationError) {
        return reply.status(400).send({ success: false, message: 'Некорректные данные заказа' })
      }
      const b = req.body

      if (b.delivery_method === 'Доставка') {
        if (!b.delivery_zone) {
          return reply.status(400).send({
            success: false,
            message: 'Укажите зону доставки по Москве',
          })
        }
        if (!b.street?.trim() || !b.house?.trim()) {
          return reply.status(400).send({
            success: false,
            message: 'Для доставки по Москве укажите улицу и дом',
          })
        }
      }
      if (b.delivery_method === 'Отправка в регион' && !b.city?.trim()) {
        return reply.status(400).send({
          success: false,
          message: 'Для отправки в другой город укажите город',
        })
      }

      const deliveryZone = b.delivery_method === 'Доставка' ? b.delivery_zone! : null
      const transportCompany =
        b.delivery_method === 'Отправка в регион' ? b.transport_company?.trim() || null : null
      const city =
        b.delivery_method === 'Доставка'
          ? 'Москва'
          : b.delivery_method === 'Отправка в регион'
            ? b.city!.trim()
            : null
      const street = b.delivery_method === 'Доставка' ? b.street!.trim() : null
      const house = b.delivery_method === 'Доставка' ? b.house!.trim() : null
      const apartment =
        b.delivery_method === 'Доставка' ? b.apartment?.trim() || null : null

      // схлопываем дубли одной детали в одну позицию
      const wanted = new Map<number, number>()
      for (const it of b.items) {
        wanted.set(it.partId, (wanted.get(it.partId) || 0) + it.quantity)
      }

      const parts = await prisma.part.findMany({
        where: { id: { in: [...wanted.keys()] } },
        select: { id: true, partNumber: true, name: true, price: true, availability: true },
      })
      const byId = new Map(parts.map((p) => [p.id, p]))

      const missing = [...wanted.keys()].filter((id) => !byId.has(id))
      if (missing.length) {
        return reply.status(400).send({
          success: false,
          message: 'Часть позиций корзины не найдена в каталоге — обновите страницу',
        })
      }
      const unavailable = parts.filter((p) => !p.availability || p.price <= 0)
      if (unavailable.length) {
        return reply.status(409).send({
          success: false,
          message: `Нет в наличии: ${unavailable.map((p) => p.partNumber).join(', ')} — уберите из корзины`,
        })
      }

      // цены только из БД; в БД они уже целые рубли, но округляем на всякий случай
      const items = [...wanted.entries()].map(([partId, quantity]) => ({
        productId: partId,
        quantity,
        price: Math.round(byId.get(partId)!.price),
      }))
      const itemsTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
      const deliveryMethod = DELIVERY_MAP[b.delivery_method]
      const pricing = calculateDeliveryPricing(itemsTotal, deliveryMethod, deliveryZone)

      // вложенный create — одна транзакция: заказ и позиции атомарны
      const order = await prisma.order.create({
        data: {
          name: b.name.trim(),
          phone: b.phone.trim(),
          email: b.email.trim(),
          deliveryMethod,
          deliveryZone,
          deliveryCost: pricing.deliveryCost,
          deliveryRatePerKm: pricing.deliveryRatePerKm,
          transportCompany,
          city,
          street,
          house,
          apartment,
          comment: b.comment?.trim() || null,
          totalPrice: itemsTotal,
          status: 'NEW',
          items: { create: items },
        },
      })

      const notificationData = {
        id: order.id,
        name: order.name,
        phone: order.phone,
        email: order.email,
        deliveryLabel:
          b.delivery_method === 'Доставка'
            ? 'Доставка по Москве'
            : b.delivery_method === 'Отправка в регион'
              ? 'Отправка в другой город'
              : b.delivery_method,
        deliveryZone: order.deliveryZone,
        deliveryCost: order.deliveryCost,
        deliveryRatePerKm: order.deliveryRatePerKm,
        transportCompany: order.transportCompany,
        city: order.city,
        street: order.street,
        house: order.house,
        apartment: order.apartment,
        comment: order.comment,
        itemsTotal: order.totalPrice,
        items: items.map((it) => {
          const p = byId.get(it.productId)!
          return { partNumber: p.partNumber, name: p.name, quantity: it.quantity, price: it.price }
        }),
      }

      // Письма не являются частью транзакции заказа: сбой SMTP не должен
      // отменять заказ. Отправки независимы — ошибка одной не мешает второй.
      const mailJobs = [
        { recipient: 'manager', promise: sendOrderNotification(notificationData) },
        { recipient: 'customer', promise: sendCustomerOrderConfirmation(notificationData) },
      ]
      void Promise.allSettled(mailJobs.map((job) => job.promise)).then((results) => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            fastify.log.error(
              { err: result.reason, orderId: order.id, recipient: mailJobs[index].recipient },
              'Не удалось отправить письмо о заказе'
            )
          }
        })
      })

      return reply.status(201).send({
        success: true,
        orderId: order.id,
        ...pricing,
        deliveryMethod:
          b.delivery_method === 'Доставка'
            ? 'Доставка по Москве'
            : b.delivery_method === 'Отправка в регион'
              ? 'Отправка в другой город'
              : b.delivery_method,
        deliveryZone,
      })
    }
  )
}
