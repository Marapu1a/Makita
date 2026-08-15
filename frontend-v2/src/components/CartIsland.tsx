import { useState, useEffect } from 'react'
import { useCart, type CartItem } from '../lib/cart'
import { fmtPrice } from '../lib/format'

const TRANSPORT_COMPANIES = ['СДЭК', 'Почта России', 'DPD', 'Boxberry', 'ПЭК', 'Деловые Линии']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PREPAYMENT_THRESHOLD = 2000
const FREE_DELIVERY_THRESHOLD = 50_000
const TRANSPORT_COMPANY_DELIVERY_COST = 500
const OUTSIDE_MKAD_RATE_PER_KM = 75

type DeliveryZone = 'MKAD_TO_TTK' | 'TTK_TO_GARDEN' | 'INSIDE_GARDEN' | 'OUTSIDE_MKAD'

const MOSCOW_ZONE_COSTS: Record<DeliveryZone, number> = {
  MKAD_TO_TTK: 500,
  TTK_TO_GARDEN: 600,
  INSIDE_GARDEN: 700,
  OUTSIDE_MKAD: 500,
}

interface OrderResult {
  success: boolean
  message?: string
  orderId?: number
  itemsTotal?: number
  deliveryCost?: number | null
  deliveryRatePerKm?: number | null
  deliveryIsFree?: boolean
  knownTotal?: number
  finalTotalKnown?: boolean
  deliveryMethod?: string
  deliveryZone?: DeliveryZone | null
}

async function createOrder(orderData: Record<string, unknown>): Promise<OrderResult> {
  const res = await fetch('/api/v2/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  })
  return res.json()
}

function OrderTerms({ itemsTotal }: { itemsTotal: number }) {
  return (
    <div className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm">
      <p className="font-medium">Срок поставки запчастей — 2–5 рабочих дней.</p>
      <p className="mt-1">
        При сумме товаров от 50 000 ₽ доставка в пределах МКАД и до транспортной
        компании бесплатная.
      </p>
      {itemsTotal >= PREPAYMENT_THRESHOLD && (
        <p className="mt-1">
          При сумме заказа от 2 000 ₽ может потребоваться предоплата. Необходимость и
          размер предоплаты сообщит менеджер при подтверждении заказа.
        </p>
      )}
    </div>
  )
}

function PricingSummary({
  itemsTotal,
  deliveryCost,
  deliveryRatePerKm,
  deliveryIsFree,
  deliveryZone,
  isRegion,
  finalTotalKnown,
}: {
  itemsTotal: number
  deliveryCost: number | null
  deliveryRatePerKm?: number | null
  deliveryIsFree?: boolean
  deliveryZone?: DeliveryZone | null
  isRegion?: boolean
  finalTotalKnown: boolean
}) {
  const knownTotal = itemsTotal + (deliveryCost ?? 0)
  return (
    <div className="border-t border-ink pt-3 text-sm">
      <div className="flex justify-between gap-4">
        <span>Товары</span>
        <span>{fmtPrice(itemsTotal)}</span>
      </div>
      {deliveryCost !== null && deliveryCost > 0 && (
        <div className="mt-1 flex justify-between gap-4">
          <span>{isRegion ? 'Доставка до ТК' : 'Доставка'}</span>
          <span>{fmtPrice(deliveryCost)}</span>
        </div>
      )}
      {deliveryIsFree && (
        <div className="mt-1 flex justify-between gap-4">
          <span>{isRegion ? 'Доставка до ТК' : 'Доставка'}</span>
          <span className="font-medium text-green-700">Бесплатно</span>
        </div>
      )}
      {deliveryZone === 'OUTSIDE_MKAD' && (
        <div className="mt-1 flex justify-between gap-4">
          <span>Доплата за МКАД</span>
          <span className="text-right">
            рассчитает менеджер ({fmtPrice(deliveryRatePerKm ?? OUTSIDE_MKAD_RATE_PER_KM)}/км)
          </span>
        </div>
      )}
      {isRegion && (
        <div className="mt-1 flex justify-between gap-4">
          <span>Перевозка транспортной компанией</span>
          <span className="text-right">рассчитывается отдельно по тарифу ТК</span>
        </div>
      )}
      <div className="mt-2 flex items-baseline justify-between gap-4 font-medium">
        <span className="uppercase tracking-wider text-gray-500">
          {finalTotalKnown ? 'Итого' : 'Известная сумма'}
        </span>
        <span className="text-xl">{fmtPrice(knownTotal)}</span>
      </div>
    </div>
  )
}

// ─── Поле формы с лейблом, звёздочкой и ошибкой ─────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block mb-3">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}

const inputCls = (hasError?: string) =>
  `w-full px-3 py-2 border bg-white outline-none transition-colors ${
    hasError ? 'border-red-500' : 'border-gray-300 focus:border-ink'
  }`

// ─── Форма заказа ───────────────────────────────────────────

type Errors = Partial<Record<string, string>>

function OrderModal({
  onClose,
  onSubmit,
  totalPrice,
}: {
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<OrderResult>
  totalPrice: number
}) {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    phone: '',
    email: '',
    delivery_method: 'Самовывоз',
    delivery_zone: 'MKAD_TO_TTK' as DeliveryZone,
    transport_company: '',
    city: '',
    street: '',
    house: '',
    apartment: '',
    comment: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const set = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => set(e.target.name, e.target.value)

  // Маска телефона: +7 (XXX) XXX-XX-XX
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
    set('phone', formatted)
  }

  const validate = (): boolean => {
    const e: Errors = {}
    if (!formData.lastName.trim()) e.lastName = 'Укажите фамилию'
    if (!formData.firstName.trim()) e.firstName = 'Укажите имя'
    if (!formData.phone.trim()) e.phone = 'Укажите телефон'
    else if (formData.phone.replace(/\D/g, '').length !== 11) e.phone = 'Введите номер полностью'
    if (!formData.email.trim()) e.email = 'Укажите email'
    else if (!EMAIL_RE.test(formData.email)) e.email = 'Некорректный email'
    if (formData.delivery_method === 'Отправка в регион') {
      if (!formData.city.trim()) e.city = 'Укажите город'
    }
    if (formData.delivery_method === 'Доставка') {
      if (!formData.street.trim()) e.street = 'Укажите улицу'
      if (!formData.house.trim()) e.house = 'Укажите дом'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return
    setIsLoading(true)
    const fullName =
      `${formData.lastName.trim()} ${formData.firstName.trim()} ${formData.middleName.trim()}`.trim()

    try {
      const result = await onSubmit({
        ...formData,
        name: fullName,
      })
      if (result.success) {
        setSuccessMessage('Заказ успешно оформлен!')
        setTimeout(() => {
          setIsLoading(false)
          onClose()
        }, 1200)
      } else {
        setServerError(result.message || 'Ошибка при оформлении заказа')
        setIsLoading(false)
      }
    } catch {
      setServerError('Ошибка сервера. Попробуйте снова позже.')
      setIsLoading(false)
    }
  }

  const isMoscowDelivery = formData.delivery_method === 'Доставка'
  const isRegion = formData.delivery_method === 'Отправка в регион'
  const freeByOrderTotal = totalPrice >= FREE_DELIVERY_THRESHOLD
  const selectedDeliveryCost = formData.delivery_method === 'Самовывоз'
    ? 0
    : isRegion
      ? freeByOrderTotal ? 0 : TRANSPORT_COMPANY_DELIVERY_COST
      : isMoscowDelivery
        ? formData.delivery_zone !== 'OUTSIDE_MKAD' && freeByOrderTotal
          ? 0
          : MOSCOW_ZONE_COSTS[formData.delivery_zone]
        : null
  const selectedDeliveryRatePerKm =
    isMoscowDelivery && formData.delivery_zone === 'OUTSIDE_MKAD'
      ? OUTSIDE_MKAD_RATE_PER_KM
      : null
  const selectedDeliveryIsFree = freeByOrderTotal &&
    (isRegion || (isMoscowDelivery && formData.delivery_zone !== 'OUTSIDE_MKAD'))
  const finalTotalKnown =
    formData.delivery_method === 'Самовывоз' ||
    (isMoscowDelivery && formData.delivery_zone !== 'OUTSIDE_MKAD')

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 overflow-y-auto p-4">
      <div className="bg-white border border-ink p-6 w-full max-w-md max-h-[95vh] overflow-y-auto">
        <h2 className="text-lg font-medium uppercase tracking-wider mb-1">Оформление заказа</h2>
        <p className="text-xs text-gray-500 mb-5">
          Поля со звёздочкой <span className="text-red-500">*</span> обязательны
        </p>

        <Field label="Фамилия" required error={errors.lastName}>
          <input type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} className={inputCls(errors.lastName)} />
        </Field>
        <Field label="Имя" required error={errors.firstName}>
          <input type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} className={inputCls(errors.firstName)} />
        </Field>
        <Field label="Отчество">
          <input type="text" name="middleName" autoComplete="additional-name" value={formData.middleName} onChange={handleChange} className={inputCls()} />
        </Field>
        <Field label="Телефон" required error={errors.phone}>
          <input type="tel" name="phone" autoComplete="tel" placeholder="+7 (___) ___-__-__" value={formData.phone} onChange={handlePhoneChange} className={inputCls(errors.phone)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" name="email" autoComplete="email" placeholder="you@example.ru" value={formData.email} onChange={handleChange} className={inputCls(errors.email)} />
        </Field>

        <Field label="Способ получения" required>
          <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} className={inputCls()}>
            <option value="Самовывоз">Самовывоз</option>
            <option value="Доставка">Доставка по Москве</option>
            <option value="Отправка в регион">Отправка в другой город</option>
          </select>
        </Field>

        {isMoscowDelivery && (
          <>
            <Field label="Зона доставки" required>
              <select name="delivery_zone" value={formData.delivery_zone} onChange={handleChange} className={inputCls()}>
                <option value="MKAD_TO_TTK">От МКАД до ТТК — {freeByOrderTotal ? 'бесплатно' : '500 ₽'}</option>
                <option value="TTK_TO_GARDEN">От ТТК до Садового кольца — {freeByOrderTotal ? 'бесплатно' : '600 ₽'}</option>
                <option value="INSIDE_GARDEN">Внутри Садового кольца — {freeByOrderTotal ? 'бесплатно' : '700 ₽'}</option>
                <option value="OUTSIDE_MKAD">За МКАД — 500 ₽ + 75 ₽/км</option>
              </select>
            </Field>
            {formData.delivery_zone === 'OUTSIDE_MKAD' && (
              <p className="mb-3 text-xs text-gray-500">
                Расстояние за МКАД и доплату 75 ₽/км рассчитает менеджер.
              </p>
            )}
          </>
        )}

        {isRegion && (
          <>
            <Field label="Город" required error={errors.city}>
              <input type="text" name="city" autoComplete="address-level2" value={formData.city} onChange={handleChange} className={inputCls(errors.city)} />
            </Field>
            <Field label="Транспортная компания">
              <select name="transport_company" value={formData.transport_company} onChange={handleChange} className={inputCls()}>
                <option value="">— выберите —</option>
                {TRANSPORT_COMPANIES.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </Field>
            <p className="mb-3 text-xs text-gray-500">
              Доставка до терминала ТК — {freeByOrderTotal ? 'бесплатно' : '500 ₽'}.
              Перевозка до города рассчитывается отдельно по тарифу транспортной компании.
            </p>
          </>
        )}

        {isMoscowDelivery && (
          <>
            <Field label="Город">
              <input type="text" value="Москва" readOnly className={`${inputCls()} bg-gray-50`} />
            </Field>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <Field label="Улица" required error={errors.street}>
                  <input type="text" name="street" value={formData.street} onChange={handleChange} className={inputCls(errors.street)} />
                </Field>
              </div>
              <Field label="Дом" required error={errors.house}>
                <input type="text" name="house" value={formData.house} onChange={handleChange} className={inputCls(errors.house)} />
              </Field>
              <Field label="Квартира">
                <input type="text" name="apartment" value={formData.apartment} onChange={handleChange} className={inputCls()} />
              </Field>
            </div>
          </>
        )}

        <Field label="Комментарий к заказу">
          <textarea name="comment" rows={2} value={formData.comment} onChange={handleChange} className={inputCls()} />
        </Field>

        <div className="mt-2 mb-4">
          <PricingSummary
            itemsTotal={totalPrice}
            deliveryCost={selectedDeliveryCost}
            deliveryRatePerKm={selectedDeliveryRatePerKm}
            deliveryIsFree={selectedDeliveryIsFree}
            deliveryZone={isMoscowDelivery ? formData.delivery_zone : null}
            isRegion={isRegion}
            finalTotalKnown={finalTotalKnown}
          />
          <div className="mt-3"><OrderTerms itemsTotal={totalPrice} /></div>
        </div>

        {serverError && <p className="text-sm text-red-600 mb-3">{serverError}</p>}
        {successMessage && <p className="text-sm text-green-700 mb-3">{successMessage}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-makita hover:bg-makita-dark'
            }`}
          >
            {isLoading ? 'Отправка…' : 'Оформить заказ'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium uppercase tracking-wider border border-ink hover:bg-ink hover:text-white transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Подтверждение заказа ───────────────────────────────────

function OrderConfirmationModal({
  cart,
  order,
  onClose,
}: {
  cart: CartItem[]
  order: OrderResult
  onClose: () => void
}) {
  const itemsTotal =
    order.itemsTotal ?? cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isRegion = order.deliveryMethod === 'Отправка в регион' || order.deliveryMethod === 'Отправка в другой город'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-ink p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <h2 className="text-lg font-medium uppercase tracking-wider mb-2">Заказ принят</h2>
        <p className="mb-5 text-sm text-gray-600">
          Заказ #{order.orderId} принят. Наш менеджер свяжется с вами в ближайшее время.
        </p>
        {order.deliveryMethod && (
          <p className="mb-4 text-sm"><strong>Способ получения:</strong> {order.deliveryMethod}</p>
        )}

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
              <th className="border-b border-ink py-2 font-medium">Артикул</th>
              <th className="border-b border-ink py-2 font-medium">Название</th>
              <th className="border-b border-ink py-2 font-medium text-center">Кол-во</th>
              <th className="border-b border-ink py-2 font-medium text-right">Цена</th>
              <th className="border-b border-ink py-2 font-medium text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-2 font-mono">{item.part_number}</td>
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{fmtPrice(item.price)}</td>
                <td className="py-2 text-right">{fmtPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PricingSummary
          itemsTotal={itemsTotal}
          deliveryCost={order.deliveryCost ?? null}
          deliveryRatePerKm={order.deliveryRatePerKm}
          deliveryIsFree={order.deliveryIsFree}
          deliveryZone={order.deliveryZone}
          isRegion={isRegion}
          finalTotalKnown={order.finalTotalKnown ?? false}
        />
        <div className="my-4"><OrderTerms itemsTotal={itemsTotal} /></div>

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium uppercase tracking-wider bg-ink text-white hover:bg-makita transition-colors"
          >
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
  const [confirmation, setConfirmation] = useState<{ cart: CartItem[]; order: OrderResult } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ждём гидрацию — на сервере корзина пустая, иначе mismatch
  useEffect(() => setMounted(true), [])

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleOrderSubmit = async (
    orderData: Record<string, unknown>
  ): Promise<OrderResult> => {
    try {
      // цены не отправляем: сервер берёт их из БД и сам считает сумму
      const result = await createOrder({
        ...orderData,
        items: cartItems.map((i) => ({ partId: i.id, quantity: i.quantity })),
      })

      if (result.success) {
        setConfirmation({ cart: [...cartItems], order: result })
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
        <div className="border border-ink px-6 py-16 text-center">
          <p className="text-lg mb-1">Корзина пуста</p>
          <p className="text-sm text-gray-500 mb-6">
            Найдите нужную деталь на взрыв-схеме вашего инструмента
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 text-sm font-medium uppercase tracking-wider bg-ink text-white hover:bg-makita transition-colors"
          >
            В каталог
          </a>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-ink">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="border-b border-ink px-3 py-2 font-medium">Артикул</th>
                  <th className="border-b border-ink px-3 py-2 font-medium">Название</th>
                  <th className="border-b border-ink px-3 py-2 font-medium text-right">Цена</th>
                  <th className="border-b border-ink px-3 py-2 font-medium text-center">Кол-во</th>
                  <th className="border-b border-ink px-3 py-2 font-medium text-right">Сумма</th>
                  <th className="border-b border-ink px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{item.part_number}</td>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{fmtPrice(item.price)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center">
                        <button
                          className="w-7 h-7 border border-gray-300 hover:border-ink transition-colors"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Меньше"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v)) updateQuantity(item.id, v)
                          }}
                          className="w-12 h-7 border-y border-gray-300 text-center outline-none focus:border-ink [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          className="w-7 h-7 border border-gray-300 hover:border-ink transition-colors"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Больше"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {fmtPrice(item.price * item.quantity)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="w-7 h-7 text-gray-400 hover:text-red-600 transition-colors"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Удалить"
                        title="Удалить из корзины"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                          <path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <OrderTerms itemsTotal={totalPrice} />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
              <div className="text-lg">
                <span className="text-sm uppercase tracking-wider text-gray-500 mr-3">Товары</span>
                <span className="font-medium text-2xl">{fmtPrice(totalPrice)}</span>
              </div>
              <button
                onClick={() => setOrderModalOpen(true)}
                className="px-10 py-3 text-sm font-medium uppercase tracking-wider bg-makita text-white hover:bg-makita-dark transition-colors"
              >
                Оформить заказ
              </button>
            </div>
          </div>

          {isOrderModalOpen && (
            <OrderModal
              onClose={() => setOrderModalOpen(false)}
              onSubmit={handleOrderSubmit}
              totalPrice={totalPrice}
            />
          )}
        </>
      )}

      {confirmation && confirmation.cart.length > 0 && (
        <OrderConfirmationModal
          cart={confirmation.cart}
          order={confirmation.order}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}
