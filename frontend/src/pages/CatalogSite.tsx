import { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import Button from "../components/Button";
import BackButton from "../components/BackButton";
import { fetchCategories } from "../utils/api";
import SearchBar from "../components/SearchBar";

interface Category {
  id: string;
  name: string;
  img: string;
}

export default function CatalogSite() {
  const [isCatalogVisible, setCatalogVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header внутри App.tsx */}

      {/* Search Bar */}
      <div className="p-4 bg-gray-100 flex items-center">
        {isCatalogVisible && <SearchBar />}
        <Button className="ml-2" onClick={toggleCatalog}>
          {isCatalogVisible ? "Скрыть каталог" : "Каталог"}
        </Button>
        <BackButton rootPath="/" className="ml-2" />
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        {isCatalogVisible && (
          <aside className="w-64 bg-gray-200 p-4 overflow-y-auto">
            <h2 className="font-bold mb-2">Категории</h2>
            <ul>
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="mb-1 cursor-pointer hover:underline flex items-center"
                  onClick={() => navigate(`/categories/${category.id}`)}
                >
                  - {category.name}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Main Content */}
        <main className={`p-4 ${isCatalogVisible ? "w-3/4" : "w-full"}`}>
          {isCatalogVisible ? (
            <Outlet /> // Здесь отрендерятся вложенные маршруты
          ) : (
            <div className="flex items-start gap-8">
              {/* Левая часть с заголовком и текстом */}
              <div className="w-2/3">
                <h1 className="text-3xl font-bold mb-4">
                  Запчасти для инструментов Makita
                </h1>
                <p className="text-gray-700 mb-4">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla
                  convallis eros id lorem ultricies, in sodales risus auctor.
                  Donec malesuada ligula nec erat elementum, at scelerisque elit
                  sodales.
                </p>
                <p className="text-gray-700">
                  Pellentesque habitant morbi tristique senectus et netus et
                  malesuada fames ac turpis egestas. Sed euismod erat nec libero
                  vulputate, ut venenatis lectus ultrices.
                </p>
              </div>

              {/* Правая часть - слайды сертификатов */}
              <div className="w-1/3 flex flex-col items-center">
                <div className="relative w-[250px] h-[350px] border rounded overflow-hidden">
                  <img
                    src="/images/certificate-placeholder.webp"
                    alt="Сертификат"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="p-2 border rounded">&lt;</button>
                  <button className="p-2 border rounded">&gt;</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        © 2025 My Catalog. Все права защищены.
      </footer>
    </div>
  );
}
