import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  const { categoryId } = useParams(); // Получаем categoryId из URL
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<Model[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Загружаем вложенные категории
      const subCategories = await fetchCategories(categoryId || null);

      if (subCategories.length > 0) {
        setCategories(subCategories);
        setModels(null); // Есть вложенные категории — не грузим модели
      } else {
        // Если вложенных нет — загружаем модели
        const modelsData = await fetchModelsByCategory(categoryId || "");
        setModels(modelsData);
        setCategories([]);
      }

      setLoading(false);
    };

    loadData();
  }, [categoryId]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="flex flex-col items-center">
      {models ? (
        <div className="grid grid-cols-4 gap-6">
          {models.map((model) => (
            <Link key={model.id} to={`/model/${model.id}`}>
              <div className="bg-white p-4 rounded-md shadow-md">
                <p className="text-center font-semibold">{model.name}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6 flex-1">
          {categories.map((category) => (
            <Link key={category.id} to={`/categories/${category.id}`}>
              <div className="bg-white p-4 rounded-md shadow-md cursor-pointer hover:bg-gray-100">
                <img
                  src={category.img}
                  alt={category.name}
                  className="w-full h-32 object-contain mb-2"
                />
                <p className="text-center font-semibold">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
