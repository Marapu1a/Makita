import { useState, useEffect, useRef } from 'react'
import { useCart } from '../lib/cart'

interface ModelHit {
  id: number
  name: string
  slug: string | null
  category: { name: string; slug: string | null }
}

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Record<string, ModelHit[]>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSuggestions({})
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v2/models/search?q=${encodeURIComponent(searchTerm.trim())}`)
        const { data } = await res.json()
        const grouped = (data as ModelHit[]).reduce<Record<string, ModelHit[]>>((acc, m) => {
          if (!acc[m.category.name]) acc[m.category.name] = []
          if (acc[m.category.name].length < 10) acc[m.category.name].push(m)
          return acc
        }, {})
        setSuggestions(grouped)
      } catch {
        setSuggestions({})
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [searchTerm])

  const goTo = (m: ModelHit) => {
    window.location.href = `/${m.category.slug}/${m.slug}`
  }

  const handleSearch = () => {
    const all = Object.values(suggestions).flat()
    const exact = all.find((m) => m.name.toLowerCase() === searchTerm.trim().toLowerCase())
    if (exact) goTo(exact)
    else if (all.length === 1) goTo(all[0])
  }

  return (
    <div className="relative w-full lg:w-80">
      <div className="flex">
        <input
          type="text"
          placeholder="Поиск по моделям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions({}), 200)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="p-2 w-full bg-cyan-900 text-white placeholder-cyan-300 border border-white rounded-l"
        />
        <button
          onClick={handleSearch}
          className="px-4 bg-cyan-600 text-white rounded-r hover:bg-cyan-500 transition"
        >
          Найти
        </button>
      </div>
      {Object.keys(suggestions).length > 0 && (
        <ul className="absolute top-full left-0 w-full bg-[#1e2a30] border border-cyan-700 shadow-xl max-h-60 overflow-auto rounded-md z-50">
          {Object.entries(suggestions).map(([categoryName, models]) => (
            <li key={categoryName}>
              <div className="px-3 py-1 text-xs text-cyan-400 uppercase bg-[#2b3b42] border-b border-cyan-700">
                {categoryName}
              </div>
              {models.map((m) => (
                <div
                  key={m.id}
                  className="p-2 hover:bg-gray-600 hover:text-white cursor-pointer text-sm text-gray-200"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goTo(m)}
                >
                  {m.name}
                </div>
              ))}
            </li>
          ))}
        </ul>
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
    <header className="border-b shadow-lg z-10">
      <div
        className="relative px-4 py-4 bg-cyan-800 text-white min-h-[100px]"
        style={{
          backgroundImage: "url('/images/header2.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 24%',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Лого + бургер */}
          <div className="flex items-center justify-between lg:justify-start lg:space-x-6 w-full lg:w-auto">
            <a href="/" className="flex items-center">
              <img src="/images/logo.webp" alt="Makita Logo" className="h-12 object-contain mr-4" />
            </a>
            <button className="lg:hidden text-white text-3xl leading-none" onClick={() => setMenuOpen((p) => !p)}>
              ≡
            </button>
          </div>

          {/* Навигация */}
          <nav
            className={`${menuOpen ? 'flex' : 'hidden'} flex-col lg:flex lg:flex-row lg:items-center lg:space-x-4
              text-base text-white text-center mt-2 lg:mt-0
              lg:bg-transparent bg-cyan-900/90 p-4 lg:p-0 rounded-lg shadow-lg lg:shadow-none`}
          >
            {[
              { to: '/info', label: 'Информация' },
              { to: '/', label: 'Каталог' },
              { to: '/contacts', label: 'Контакты' },
            ].map(({ to, label }) => (
              <a key={to} href={to} className="py-2 px-4 hover:bg-cyan-700 rounded-lg transition-all" onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            <a
              href="https://makita-snab.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="group py-2 px-4 hover:bg-cyan-700 rounded-lg transition-all"
            >
              <span className="group-hover:hidden">Инструменты</span>
              <span className="hidden group-hover:inline">makita-snab.ru</span>
            </a>
          </nav>

          {/* Поиск */}
          <SearchBar />

          {/* Корзина */}
          <div className="mt-2 lg:mt-0">
            <a
              href="/cart"
              className="flex items-center space-x-2 border border-white bg-black/20 px-3 py-2 rounded hover:bg-black/30 transition w-fit"
            >
              <span>🛒</span>
              <span>В корзине {totalItems} т.</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
