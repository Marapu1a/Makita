import { useState, useEffect } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import BackButton from "../components/BackButton";
import SearchBar from "../components/SearchBar";
import { fetchCategories } from "../utils/api";

interface Category {
  id: string;
  name: string;
  img: string;
}

export default function CatalogSite() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCategories = async () => {
      const data = await fetchCategories();
      setCategories(data);
    };
    loadCategories();
  }, []);

  console.log("API URL:", import.meta.env.VITE_API_URL);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header внутри App.tsx */}

      {/* 🧠 Top Bar */}
      <div className="bg-cyan-800 text-white flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
        {/* Поиск */}
        <div className="flex-1">
          <SearchBar />
        </div>

        {/* Назад */}
        <div className="sm:ml-auto">
          <BackButton rootPath="/" />
        </div>

        {/* Разделитель */}
        <div className="hidden sm:block h-6 w-px bg-white opacity-50" />

        {/* Контакты */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Mail size={16} />
              <span>makita-snab@mail.ru</span>
            </div>

            <div className="hidden sm:block h-6 w-px bg-white opacity-50" />

            <div className="flex items-center space-x-1">
              <Phone size={16} />
              <span>+7 (495) 215-02-99</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🧱 Контент + сайдбар */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:block lg:w-64 bg-gradient-to-b from-cyan-700 to-cyan-800 text-white p-4 overflow-y-auto">
          <h2 className="font-bold mb-2 text-lg">Категории</h2>
          <ul>
            {categories.map((category) => (
              <li
                key={category.id}
                className={`mb-1 cursor-pointer px-4 py-2 transition-all rounded-sm duration-100 ease-in-out
              ${
                selectedCategory === category.id
                  ? "bg-cyan-900 border-l-4 border-red-500"
                  : "hover:bg-cyan-900 hover:border-l-4 hover:border-red-500"
              }`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  navigate(`/categories/${category.id}`);
                }}
              >
                {category.name}
              </li>
            ))}
          </ul>
        </aside>

        {/* Основной контент */}
        <main className="p-4 w-full overflow-x-auto max-w-full">
          <Outlet />
        </main>
      </div>

      {/* ⚓ Footer */}
      <footer className="bg-gray-800 text-white p-4 text-sm text-center max-w-screen-sm mx-auto">
        <p className="underline">
          <Link to="/privacy-policy">Политика конфиденциальности</Link>
        </p>
        © При использовании материалов с сайта makita-remont.ru активная ссылка
        на источник обязательна. Интернет-сайт makita-remont.ru носит
        исключительно информационный характер и не является публичной офертой,
        определяемой положениями Статьи 437 (2) Гк РФ. Присланное по e-mail
        сообщение, содержащее копию заполненной формы заявки на сайте, не
        является ответом на сообщение потребителя или подтверждением заказа со
        стороны владельцев сайта.
      </footer>
    </div>
  );
}
