import { useState, useEffect, useRef } from 'react'
import { useCart } from '../lib/cart'

interface ModelHit {
  id: number
  name: string
  slug: string | null
  category: { name: string; slug: string | null }
}

interface PartHit {
  part_number: string
  name: string | null
  price: number
  availability: boolean
  slug: string | null
}

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('')
  const [models, setModels] = useState<ModelHit[]>([])
  const [parts, setParts] = useState<PartHit[]>([])
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = searchTerm.trim()
    if (q.length < 2) {
      setModels([])
      setParts([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const [mRes, pRes] = await Promise.all([
          fetch(`/api/v2/models/search?q=${encodeURIComponent(q)}`),
          fetch(`/api/v2/parts/search?q=${encodeURIComponent(q)}&limit=6`),
        ])
        const mData = mRes.ok ? (await mRes.json()).data : []
        const pData = pRes.ok ? (await pRes.json()).data : []
        setModels((mData as ModelHit[]).slice(0, 8))
        setParts(pData as PartHit[])
        setSearched(true)
      } catch {
        setModels([])
        setParts([])
        setSearched(true)
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [searchTerm])

  const goToModel = (m: ModelHit) => {
    window.location.href = `/${m.category.slug}/${m.slug}`
  }
  const goToPart = (p: PartHit) => {
    if (p.slug) window.location.href = `/parts/${p.slug}`
  }

  const handleSearch = () => {
    const q = searchTerm.trim().toLowerCase()
    const exactModel = models.find((m) => m.name.toLowerCase() === q)
    if (exactModel) return goToModel(exactModel)
    const exactPart = parts.find((p) => p.part_number.toLowerCase() === q)
    if (exactPart) return goToPart(exactPart)
    if (models.length === 1 && parts.length === 0) return goToModel(models[0])
    if (parts.length === 1 && models.length === 0) return goToPart(parts[0])
  }

  const open = searched
  const empty = searched && models.length === 0 && parts.length === 0

  const sectionLabel = 'px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500 border-b border-gray-200'
  const row = 'px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-ink flex justify-between gap-3'

  return (
    <div className="relative w-full lg:w-96">
      <div className="flex border border-ink">
        <input
          type="text"
          placeholder="Модель или артикул…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onBlur={() => setTimeout(() => setSearched(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="px-3 py-2 w-full bg-white text-ink placeholder-gray-400 outline-none focus:bg-gray-50"
        />
        <button
          onClick={handleSearch}
          className="px-5 bg-ink text-white text-sm font-medium uppercase tracking-wider hover:bg-makita transition-colors"
        >
          Найти
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 w-full mt-px bg-white border border-ink max-h-80 overflow-auto z-50">
          {empty && (
            <div className="px-3 py-4 text-sm text-gray-500">
              Ничего не найдено по запросу «{searchTerm.trim()}»
            </div>
          )}
          {models.length > 0 && (
            <div>
              <div className={sectionLabel}>Модели</div>
              {models.map((m) => (
                <div key={m.id} className={row} onMouseDown={(e) => e.preventDefault()} onClick={() => goToModel(m)}>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-400 truncate">{m.category.name}</span>
                </div>
              ))}
            </div>
          )}
          {parts.length > 0 && (
            <div>
              <div className={sectionLabel}>Детали</div>
              {parts.map((p) => (
                <div key={p.part_number} className={row} onMouseDown={(e) => e.preventDefault()} onClick={() => goToPart(p)}>
                  <span>
                    <span className="font-mono font-medium">{p.part_number}</span>
                    {p.name && <span className="text-gray-500"> — {p.name}</span>}
                  </span>
                  {p.price > 0 && <span className="whitespace-nowrap text-gray-500">{Math.round(p.price).toLocaleString('ru-RU')} ₽</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { cartItems } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Счётчик рендерим после гидрации — на сервере localStorage нет
  useEffect(() => setMounted(true), [])
  const totalItems = mounted ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0

  return (
    <header className="z-10">
      <div className="bg-paper text-ink border-b border-ink">
        <div className="px-5 py-4 w-full flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Лого + бургер */}
          <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto lg:mr-10">
            <a href="/" className="flex items-baseline gap-2 group">
              <span className="font-medium tracking-tight select-none" aria-hidden="true">/////</span>
              <span className="text-xl font-medium uppercase tracking-wide">Снабтулс</span>
              <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-gray-500">
                запчасти Makita
              </span>
            </a>
            <button
              className="lg:hidden p-1"
              aria-label="Меню"
              onClick={() => setMenuOpen((p) => !p)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>

          {/* Навигация */}
          <nav
            className={`${menuOpen ? 'flex' : 'hidden'} flex-col lg:flex lg:flex-row lg:items-center
              gap-1 lg:gap-8 text-sm font-medium uppercase tracking-wider`}
          >
            {[
              { to: '/info', label: 'Информация' },
              { to: '/', label: 'Каталог' },
              { to: '/contacts', label: 'Контакты' },
            ].map(({ to, label }) => (
              <a
                key={to}
                href={to}
                className="py-2 lg:py-0 border-b border-transparent hover:border-ink transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <a
              href="https://makita-snab.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 lg:py-0 border-b border-transparent hover:border-ink transition-colors"
            >
              Инструменты&nbsp;→
            </a>
          </nav>

          {/* Корзина */}
          <div className="lg:ml-auto">
            <a
              href="/cart"
              className="inline-flex items-center gap-2 border border-ink px-4 py-2 text-sm font-medium uppercase tracking-wider hover:bg-ink hover:text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 7H6" />
                <circle cx="9.5" cy="20" r="1.2" />
                <circle cx="17.5" cy="20" r="1.2" />
              </svg>
              <span>Корзина</span>
              {totalItems > 0 && (
                <span className="min-w-5 h-5 px-1 inline-flex items-center justify-center bg-makita text-white text-xs font-semibold">
                  {totalItems}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
