export const PREPAYMENT_THRESHOLD = 2000
export const FREE_DELIVERY_THRESHOLD = 50_000
export const TRANSPORT_COMPANY_DELIVERY_COST = 500
export const OUTSIDE_MKAD_BASE_COST = 500
export const OUTSIDE_MKAD_RATE_PER_KM = 75

export type DeliveryZone =
  | 'WITHIN_MKAD' // legacy: старые заказы до разделения внутренних зон
  | 'MKAD_TO_TTK'
  | 'TTK_TO_GARDEN'
  | 'INSIDE_GARDEN'
  | 'OUTSIDE_MKAD'

const MOSCOW_ZONE_COSTS: Partial<Record<DeliveryZone, number>> = {
  WITHIN_MKAD: 500,
  MKAD_TO_TTK: 500,
  TTK_TO_GARDEN: 600,
  INSIDE_GARDEN: 700,
}

export interface OrderPricing {
  itemsTotal: number
  deliveryCost: number | null
  deliveryRatePerKm: number | null
  deliveryIsFree: boolean
  knownTotal: number
  finalTotalKnown: boolean
}

export function getDeliveryZoneLabel(zone: string | null | undefined): string | null {
  if (zone === 'WITHIN_MKAD') return 'В пределах МКАД'
  if (zone === 'MKAD_TO_TTK') return 'От МКАД до ТТК'
  if (zone === 'TTK_TO_GARDEN') return 'От ТТК до Садового кольца'
  if (zone === 'INSIDE_GARDEN') return 'Внутри Садового кольца'
  if (zone === 'OUTSIDE_MKAD') return 'За МКАД'
  return null
}

export function isInsideMkadZone(zone: string | null | undefined): boolean {
  return zone === 'WITHIN_MKAD' ||
    zone === 'MKAD_TO_TTK' ||
    zone === 'TTK_TO_GARDEN' ||
    zone === 'INSIDE_GARDEN'
}

export function calculateDeliveryPricing(
  itemsTotal: number,
  deliveryMethod: 'PICKUP' | 'DELIVERY' | 'REGION_SHIPPING',
  deliveryZone: DeliveryZone | null
): OrderPricing {
  if (deliveryMethod === 'PICKUP') {
    return getOrderPricing(itemsTotal, deliveryMethod, null, 0, null)
  }

  const freeByOrderTotal = itemsTotal >= FREE_DELIVERY_THRESHOLD
  if (deliveryMethod === 'REGION_SHIPPING') {
    return getOrderPricing(
      itemsTotal,
      deliveryMethod,
      null,
      freeByOrderTotal ? 0 : TRANSPORT_COMPANY_DELIVERY_COST,
      null
    )
  }

  if (deliveryZone === 'OUTSIDE_MKAD') {
    return getOrderPricing(
      itemsTotal,
      deliveryMethod,
      deliveryZone,
      OUTSIDE_MKAD_BASE_COST,
      OUTSIDE_MKAD_RATE_PER_KM
    )
  }

  const zoneCost = deliveryZone ? MOSCOW_ZONE_COSTS[deliveryZone] : undefined
  return getOrderPricing(
    itemsTotal,
    deliveryMethod,
    deliveryZone,
    freeByOrderTotal ? 0 : (zoneCost ?? null),
    null
  )
}

export function getOrderPricing(
  itemsTotal: number,
  deliveryMethod: string,
  deliveryZone: string | null | undefined,
  deliveryCost: number | null | undefined,
  deliveryRatePerKm: number | null | undefined = null
): OrderPricing {
  const normalizedCost = deliveryCost ?? null
  const normalizedRate = deliveryRatePerKm ?? null
  const isPickup = deliveryMethod === 'PICKUP' || deliveryMethod === 'Самовывоз'
  const isRegion = deliveryMethod === 'REGION_SHIPPING' ||
    deliveryMethod === 'Отправка в регион' ||
    deliveryMethod === 'Отправка в другой город'
  const isMoscowDelivery = deliveryMethod === 'DELIVERY' ||
    deliveryMethod === 'Доставка' ||
    deliveryMethod === 'Доставка по Москве'
  const deliveryIsFree = normalizedCost === 0 &&
    (isRegion || (isMoscowDelivery && isInsideMkadZone(deliveryZone)))
  const knownTotal = itemsTotal + (normalizedCost ?? 0)
  const finalTotalKnown = isPickup || (isMoscowDelivery && isInsideMkadZone(deliveryZone))

  return {
    itemsTotal,
    deliveryCost: normalizedCost,
    deliveryRatePerKm: normalizedRate,
    deliveryIsFree,
    knownTotal,
    finalTotalKnown,
  }
}
