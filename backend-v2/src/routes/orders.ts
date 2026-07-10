import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db.js'

const DELIVERY_MAP: Record<string, 'PICKUP' | 'DELIVERY' | 'REGION_SHIPPING'> = {
  'Самовывоз': 'PICKUP',
  'Доставка': 'DELIVERY',
  'Отправка в регион': 'REGION_SHIPPING',
}

interface CartItem {
  id?: number
  product_id?: number
  quantity: number
  price: number
}

interface OrderBody {
  name: string
  phone: string
  email: string
  delivery_method: string
  transport_company?: string
  city?: string
  street?: string
  house?: string
  apartment?: string
  comment?: string
  total_price: number
  cart: CartItem[]
}

export const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v2/orders — оформить заказ
  fastify.post<{ Body: OrderBody }>('/', async (req, reply) => {
    const b = req.body

    if (!b.cart || b.cart.length === 0) {
      return reply.status(400).send({ success: false, message: 'Корзина пуста' })
    }
    if (!b.name?.trim() || !b.phone?.trim() || !b.email?.trim()) {
      return reply.status(400).send({ success: false, message: 'Заполните обязательные поля' })
    }
    const deliveryMethod = DELIVERY_MAP[b.delivery_method]
    if (!deliveryMethod) {
      return reply.status(400).send({ success: false, message: 'Неверный способ доставки' })
    }

    const order = await prisma.order.create({
      data: {
        name: b.name.trim(),
        phone: b.phone.trim(),
        email: b.email.trim(),
        deliveryMethod,
        transportCompany: b.transport_company || null,
        city: b.city || null,
        street: b.street || null,
        house: b.house || null,
        apartment: b.apartment || null,
        comment: b.comment || null,
        totalPrice: b.total_price || 0,
        status: 'NEW',
        items: {
          create: b.cart.map((item) => ({
            productId: item.product_id ?? item.id ?? null,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })

    return reply.status(201).send({ success: true, orderId: order.id })
  })
}
