import { create } from 'zustand'

export type CartItem = {
  id: number
  part_number: string
  name: string
  price: number
  quantity: number
}

type CartState = {
  cartItems: CartItem[]
  addToCart: (item: CartItem) => void
  updateQuantity: (id: number, quantity: number) => void
  removeFromCart: (id: number) => void
  clearCart: () => void
}

// SSR-защита: на сервере localStorage нет
const readStored = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]')
  } catch {
    return []
  }
}

const persist = (cart: CartItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify(cart))
  }
}

export const useCart = create<CartState>((set) => ({
  cartItems: readStored(),

  addToCart: (item) =>
    set((state) => {
      const existing = state.cartItems.find((i) => i.id === item.id)
      const updated = existing
        ? state.cartItems.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...state.cartItems, item]
      persist(updated)
      return { cartItems: updated }
    }),

  updateQuantity: (id, quantity) =>
    set((state) => {
      const updated = state.cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
      persist(updated)
      return { cartItems: updated }
    }),

  removeFromCart: (id) =>
    set((state) => {
      const updated = state.cartItems.filter((item) => item.id !== id)
      persist(updated)
      return { cartItems: updated }
    }),

  clearCart: () =>
    set(() => {
      persist([])
      return { cartItems: [] }
    }),
}))
