import { useState } from 'react'
import CartModal from './CartModal'

interface Props {
  part: {
    id: number
    part_number: string
    name: string
    price: number
  }
  available: boolean
}

export default function AddToCart({ part, available }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className={`px-8 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
          available
            ? 'bg-makita text-white hover:bg-makita-dark'
            : 'border border-gray-300 text-gray-400 cursor-not-allowed'
        }`}
        onClick={() => available && setOpen(true)}
        disabled={!available}
      >
        {available ? 'Добавить в корзину' : 'Нет в наличии'}
      </button>
      {open && <CartModal part={part} onClose={() => setOpen(false)} />}
    </>
  )
}
