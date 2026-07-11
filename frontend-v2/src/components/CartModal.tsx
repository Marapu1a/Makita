import { useState } from 'react'
import { useCart } from '../lib/cart'
import { fmtPrice } from '../lib/format'

type CartModalProps = {
  part: {
    id: number
    part_number: string
    name: string
    price: number
  } | null
  onClose: () => void
}

export default function CartModal({ part, onClose }: CartModalProps) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)

  const totalPrice = (part?.price ?? 0) * quantity

  if (!part) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999] p-4">
      <div className="bg-white border border-ink p-6 w-full max-w-sm">
        <h2 className="text-base font-medium mb-1">{part.name || 'Без названия'}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Артикул: <span className="font-mono text-ink">{part.part_number}</span>
        </p>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center">
            <button
              className="w-9 h-9 border border-gray-300 hover:border-ink transition-colors text-lg"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Меньше"
            >
              −
            </button>
            <span className="w-12 h-9 border-y border-gray-300 inline-flex items-center justify-center">
              {quantity}
            </span>
            <button
              className="w-9 h-9 border border-gray-300 hover:border-ink transition-colors text-lg"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Больше"
            >
              +
            </button>
          </div>
          <p className="text-xl font-medium">{fmtPrice(totalPrice)}</p>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-3 text-sm font-medium uppercase tracking-wider bg-makita text-white hover:bg-makita-dark transition-colors"
            onClick={() => {
              addToCart({ ...part, quantity })
              onClose()
            }}
          >
            В корзину
          </button>
          <button
            className="px-5 py-3 text-sm font-medium uppercase tracking-wider border border-ink hover:bg-ink hover:text-white transition-colors"
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
