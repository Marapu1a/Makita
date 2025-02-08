import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCategories, fetchModelsByCategory } from "../utils/api"; // API-функции

type Category = {
  id: string;
  name: string;
  img?: string;
  children?: Category[];
};

type Model = {
  id: string;
  name: string;
  img: string;
};

// Функция для приведения названий файлов в порядок
const sanitizeFileName = (name: string) =>
  name.replace(/\s+/g, "_").replace(/[\/\\]/g, "_");

// Добавление `img` во все категории
const addImagesToCategories = (categories: Category[]): Category[] => {
  return categories.map((category) => ({
    ...category,
    img: `/images/categories/${sanitizeFileName(category.name)}.jpg`,
    children: category.children ? addImagesToCategories(category.children) : [],
  }));
};

export default function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategories, setCurrentCategories] = useState<Category[] | null>(
    null
  );
  const [models, setModels] = useState<Model[] | null>(null);
  const [history, setHistory] = useState<Category[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      const data = await fetchCategories();
      setCategories(addImagesToCategories(data));
      setLoading(false);
    };
    loadCategories();
  }, []);

  const handleCategoryClick = (category: Category) => {
    if (category.children && category.children.length > 0) {
      setHistory([...history, currentCategories || categories]); // Запоминаем текущий уровень
      setCurrentCategories(category.children);
      setModels(null);
    } else {
      loadModels(category.id);
    }
  };

  const loadModels = async (categoryId: string) => {
    setHistory([...history, currentCategories || categories]);
    setCurrentCategories(null);
    setModels(null);
    const data = await fetchModelsByCategory(categoryId);
    setModels(data);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const previousCategories = history.pop();
      setHistory([...history]);
      setCurrentCategories(previousCategories || null);
      setModels(null);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="flex flex-col items-center">
      {(currentCategories || models) && (
        <button
          onClick={handleBack}
          className={`mb-4 text-blue-600 hover:underline ${
            history.length === 0 ? "hidden" : ""
          }`}
        >
          ⬅ Назад
        </button>
      )}

      {currentCategories ? (
        <div className="grid grid-cols-4 gap-6 flex-1">
          {currentCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white p-4 rounded-md shadow-md cursor-pointer hover:bg-gray-100"
              onClick={() => handleCategoryClick(category)}
            >
              <img
                src={category.img}
                alt={category.name}
                className="w-full h-32 object-contain mb-2"
              />
              <p className="text-center font-semibold">{category.name}</p>
            </div>
          ))}
        </div>
      ) : models ? (
        <div className="grid grid-cols-4 gap-6">
          {models.map((model) => (
            <Link to={`/model/${model.id}`}>
              <div key={model.id} className="bg-white p-4 rounded-md shadow-md">
                <p className="text-center font-semibold">{model.name}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6 flex-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white p-4 rounded-md shadow-md cursor-pointer hover:bg-gray-100"
              onClick={() => handleCategoryClick(category)}
            >
              <img
                src={category.img}
                alt={category.name}
                className="w-full h-32 object-contain mb-2"
              />
              <p className="text-center font-semibold">{category.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
