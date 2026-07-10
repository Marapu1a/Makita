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
        className={`px-6 py-2 rounded text-white font-semibold ${
          available ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
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
