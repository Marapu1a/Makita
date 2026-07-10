import { useState, useEffect, useCallback } from 'react'
import { useCart, type CartItem } from '../lib/cart'

const TRANSPORT_COMPANIES = ['СДЭК', 'Почта России', 'DPD', 'Boxberry', 'ПЭК', 'Деловые Линии']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function createOrder(orderData: Record<string, unknown>) {
  const res = await fetch('/api/v2/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  })
  return res.json()
}

// ─── Форма заказа ───────────────────────────────────────────

function OrderModal({
  onClose,
  onSubmit,
  totalPrice,
  cartItems,
}: {
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<{ success: boolean; message?: string }>
  totalPrice: number
  cartItems: CartItem[]
}) {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    phone: '',
    email: '',
    delivery_method: 'Самовывоз',
    transport_company: '',
    city: '',
    street: '',
    house: '',
    apartment: '',
    comment: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    },
    []
  )

  // Простая маска телефона: +7 (XXX) XXX-XX-XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.startsWith('8')) digits = '7' + digits.slice(1)
    if (!digits.startsWith('7')) digits = '7' + digits
    digits = digits.slice(0, 11)
    let formatted = '+7'
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4)
    if (digits.length >= 4) formatted += ') ' + digits.slice(4, 7)
    if (digits.length >= 7) formatted += '-' + digits.slice(7, 9)
    if (digits.length >= 9) formatted += '-' + digits.slice(9, 11)
    setFormData((prev) => ({ ...prev, phone: formatted }))
  }

  const validateForm = () => {
    const { lastName, firstName, phone, email, delivery_method, city, street, house, transport_company } = formData
    if (!lastName.trim() || !firstName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage('Заполните все обязательные поля!')
      return false
    }
    if (phone.replace(/\D/g, '').length !== 11) {
      setErrorMessage('Некорректный формат телефона!')
      return false
    }
    if (!EMAIL_RE.test(email)) {
      setErrorMessage('Некорректный формат email!')
      return false
    }
    if (delivery_method === 'Отправка в регион' && !transport_company) {
      setErrorMessage('Выберите транспортную компанию!')
      return false
    }
    if (delivery_method !== 'Самовывоз' && (!city.trim() || !street.trim() || !house.trim())) {
      setErrorMessage('Заполните все адресные данные!')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    const fullName =
      `${formData.lastName.trim()} ${formData.firstName.trim()} ${formData.middleName.trim()}`.trim()

    try {
      const result = await onSubmit({
        ...formData,
        name: fullName,
        total_price: totalPrice,
        cart: cartItems,
      })
      if (result.success) {
        setSuccessMessage('Заказ успешно оформлен!')
        setTimeout(() => {
          setIsLoading(false)
          onClose()
        }, 1500)
      } else {
        setErrorMessage(result.message || 'Ошибка при оформлении заказа')
        setIsLoading(false)
      }
    } catch {
      setErrorMessage('Ошибка сервера. Попробуйте снова позже.')
      setIsLoading(false)
    }
  }

  const inputCls = 'w-full mb-2 p-2 border rounded'

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Оформление заказа</h2>

        <input type="text" name="lastName" placeholder="Фамилия" value={formData.lastName} onChange={handleChange} className={inputCls} required />
        <input type="text" name="firstName" placeholder="Имя" value={formData.firstName} onChange={handleChange} className={inputCls} required />
        <input type="text" name="middleName" placeholder="Отчество" value={formData.middleName} onChange={handleChange} className={inputCls} />
        <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" value={formData.phone} onChange={handlePhoneChange} className={inputCls} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className={inputCls} required />

        <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} className={inputCls}>
          <option value="Самовывоз">Самовывоз</option>
          <option value="Доставка">Доставка</option>
          <option value="Отправка в регион">Отправка в регион</option>
        </select>

        {formData.delivery_method === 'Отправка в регион' && (
          <select name="transport_company" value={formData.transport_company} onChange={handleChange} className={inputCls}>
            <option value="">Выберите ТК</option>
            {TRANSPORT_COMPANIES.map((company) => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        )}

        {formData.delivery_method !== 'Самовывоз' && (
          <>
            <input type="text" name="city" placeholder="Город" value={formData.city} onChange={handleChange} className={inputCls} required />
            <input type="text" name="street" placeholder="Улица" value={formData.street} onChange={handleChange} className={inputCls} required />
            <input type="text" name="house" placeholder="Дом" value={formData.house} onChange={handleChange} className={inputCls} required />
            <input type="text" name="apartment" placeholder="Квартира (необязательно)" value={formData.apartment} onChange={handleChange} className={inputCls} />
          </>
        )}

        <textarea name="comment" placeholder="Комментарий к заказу (необязательно)" value={formData.comment} onChange={handleChange} className={inputCls} />

        {errorMessage && <p className="text-red-600 text-sm mb-2">{errorMessage}</p>}
        {successMessage && <p className="text-green-600 text-sm mb-2">{successMessage}</p>}

        <div className="flex justify-between mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`bg-green-600 text-white px-4 py-2 rounded ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
            }`}
          >
            Оформить
          </button>
          <button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-800">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Подтверждение заказа ───────────────────────────────────

function OrderConfirmationModal({ cart, onClose }: { cart: CartItem[]; onClose: () => void }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Спасибо! Ваш заказ принят 🎉</h2>
        <p className="mb-4">Наш менеджер свяжется с вами в ближайшее время.</p>

        <table className="w-full border text-sm mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Артикул</th>
              <th className="p-2 border">Название</th>
              <th className="p-2 border">Кол-во</th>
              <th className="p-2 border">Цена</th>
              <th className="p-2 border">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, i) => (
              <tr key={i}>
                <td className="p-2 border">{item.part_number}</td>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">{item.price} ₽</td>
                <td className="p-2 border">{item.price * item.quantity} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold">Итого: {total} ₽</div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Страница корзины ───────────────────────────────────────

export default function CartIsland() {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart()
  const [isOrderModalOpen, setOrderModalOpen] = useState(false)
  const [confirmedCart, setConfirmedCart] = useState<CartItem[] | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ждём гидрацию — на сервере корзина пустая, иначе mismatch
  useEffect(() => setMounted(true), [])

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleOrderSubmit = async (
    orderData: Record<string, unknown>
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await createOrder({
        ...orderData,
        cart: cartItems,
        total_price: totalPrice,
      })

      if (result.success) {
        setConfirmedCart([...cartItems])
        clearCart()
        setOrderModalOpen(false)
        return { success: true }
      }
      return { success: false, message: result.message || 'Ошибка при оформлении заказа' }
    } catch {
      return { success: false, message: 'Ошибка сервера. Попробуйте снова позже.' }
    }
  }

  if (!mounted) return null

  return (
    <div>
      {cartItems.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          <p className="mb-2">Корзина пуста</p>
          <a href="/" className="text-red-600 hover:underline">На главную</a>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1">Артикул</th>
                  <th className="border px-2 py-1">Название</th>
                  <th className="border px-2 py-1 text-center">Цена</th>
                  <th className="border px-2 py-1 text-center">Кол-во</th>
                  <th className="border px-2 py-1 text-center">Сумма</th>
                  <th className="border px-2 py-1 text-center">Удалить</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id} className="odd:bg-gray-50 hover:bg-gray-100">
                    <td className="border px-2 py-1">{item.part_number}</td>
                    <td className="border px-2 py-1">{item.name}</td>
                    <td className="border px-2 py-1 text-center">{item.price} ₽</td>
                    <td className="border px-2 py-1 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button className="px-2 border" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button className="px-2 border" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button className="text-red-600 hover:underline" onClick={() => removeFromCart(item.id)}>
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-lg font-semibold">
            Итого: {totalPrice.toLocaleString('ru-RU')} ₽
          </div>

          <button
            onClick={() => setOrderModalOpen(true)}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Оформить заказ
          </button>

          {isOrderModalOpen && (
            <OrderModal
              onClose={() => setOrderModalOpen(false)}
              onSubmit={handleOrderSubmit}
              totalPrice={totalPrice}
              cartItems={cartItems}
            />
          )}
        </>
      )}

      {confirmedCart && confirmedCart.length > 0 && (
        <OrderConfirmationModal cart={confirmedCart} onClose={() => setConfirmedCart(null)} />
      )}
    </div>
  )
}
