export const MOSCOW_DELIVERY_COST = 350
export const PREPAYMENT_THRESHOLD = 2000

export type DeliveryZone = 'WITHIN_MKAD' | 'OUTSIDE_MKAD'

export interface OrderPricing {
  itemsTotal: number
  deliveryCost: number | null
  knownTotal: number
  finalTotalKnown: boolean
}

export function getDeliveryZoneLabel(zone: string | null | undefined): string | null {
  if (zone === 'WITHIN_MKAD') return 'В пределах МКАД'
  if (zone === 'OUTSIDE_MKAD') return 'За МКАД'
  return null
}

export function getOrderPricing(
  itemsTotal: number,
  deliveryMethod: string,
  deliveryZone: string | null | undefined,
  deliveryCost: number | null | undefined
): OrderPricing {
  const normalizedCost = deliveryCost ?? null
  const knownTotal = itemsTotal + (normalizedCost ?? 0)
  const finalTotalKnown =
    deliveryMethod === 'PICKUP' ||
    deliveryMethod === 'Самовывоз' ||
    ((deliveryMethod === 'DELIVERY' ||
      deliveryMethod === 'Доставка' ||
      deliveryMethod === 'Доставка по Москве') &&
      deliveryZone === 'WITHIN_MKAD' &&
      normalizedCost !== null)

  return { itemsTotal, deliveryCost: normalizedCost, knownTotal, finalTotalKnown }
}
