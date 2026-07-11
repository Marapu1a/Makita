import { SearchBar } from './Header'

export default function TopBar({ currentPath }: { currentPath: string }) {
  const isAtRoot = currentPath === '/'

  return (
    <div className="bg-paper text-ink border-b border-ink">
      <div className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        {/* Поиск */}
        <div className="flex-1 max-w-xl">
          <SearchBar />
        </div>

        {/* Назад к каталогу */}
        {!isAtRoot && (
          <a
            href="/"
            className="text-sm font-medium uppercase tracking-wider border-b border-transparent hover:border-ink transition-colors whitespace-nowrap"
          >
            ← Каталог
          </a>
        )}

        {/* Контакты */}
        <div className="md:ml-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
          <a href="mailto:makita-snab@mail.ru" className="inline-flex items-center gap-2 hover:text-makita transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            makita-snab@mail.ru
          </a>
          <a href="tel:+74952150299" className="inline-flex items-center gap-2 font-medium hover:text-makita transition-colors whitespace-nowrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
            +7 (495) 215-02-99
          </a>
        </div>
      </div>
    </div>
  )
}
