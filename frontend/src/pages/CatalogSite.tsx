import { useState, useEffect } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import Button from "../components/Button";
import BackButton from "../components/BackButton";
import SearchBar from "../components/SearchBar";
import PartsIntro from "../components/PartsIntro";
import { fetchCategories } from "../utils/api";

interface Category {
  id: string;
  name: string;
  img: string;
}

export default function CatalogSite() {
  const [isCatalogVisible, setCatalogVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleCatalog = () => {
    setCatalogVisible(!isCatalogVisible);
  };

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

      {/* Search Bar */}
      <div className="p-4 bg-cyan-800 flex items-center text-white">
        {isCatalogVisible && <SearchBar />}

        <Button className="ml-2" onClick={toggleCatalog}>
          {isCatalogVisible ? "Скрыть каталог" : "Каталог"}
        </Button>

        {isCatalogVisible && <BackButton rootPath="/" className="ml-auto" />}
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        {isCatalogVisible && (
          <aside className="w-64 bg-gradient-to-b from-cyan-700 to-cyan-800 text-white p-4 pr-0 overflow-y-auto">
            <h2 className="font-bold mb-2 text-lg">Категории</h2>
            <ul>
              {categories.map((category) => (
                <li
                  key={category.id}
                  className={`mb-1 cursor-pointer px-4 py-2 pr-2 transition-all rounded-sm duration-100 ease-in-out
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
        )}

        {/* Main Content */}
        <main className={`p-4 ${isCatalogVisible ? "w-full" : "w-full"}`}>
          {isCatalogVisible ? (
            <Outlet /> // Здесь отрендерятся вложенные маршруты
          ) : (
            <PartsIntro />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
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
