import { SearchBar } from './Header'

export default function TopBar({ currentPath }: { currentPath: string }) {
  const isAtRoot = currentPath === '/'

  return (
    <div className="bg-cyan-800 text-white flex flex-col md:flex-row md:items-center gap-4 md:gap-0">
      {/* Поиск */}
      <div className="flex-1 relative p-4 flex items-center">
        <div className="w-full md:w-2/3">
          <SearchBar />
        </div>
      </div>

      {/* Назад к каталогу */}
      <div className="md:ml-auto">
        {isAtRoot ? (
          <button
            className="px-4 py-2 mx-4 rounded-sm bg-gray-500 text-gray-300 cursor-not-allowed"
            disabled
          >
            Назад к каталогу
          </button>
        ) : (
          <a
            href="/"
            className="inline-block px-4 py-2 mx-4 rounded-sm bg-cyan-900 text-white border border-white hover:bg-cyan-600 transition-all duration-100"
          >
            Назад к каталогу
          </a>
        )}
      </div>

      {/* Разделитель */}
      <div className="hidden md:block h-6 w-px bg-white opacity-50" />

      {/* Контакты */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span>✉️</span>
            <span>makita-snab@mail.ru</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-white opacity-50" />
          <div className="flex items-center space-x-1">
            <span>📞</span>
            <span>+7 (495) 215-02-99</span>
          </div>
        </div>
      </div>
    </div>
  )
}
