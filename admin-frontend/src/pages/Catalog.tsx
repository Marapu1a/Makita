import { useState, useEffect } from "react";
import {
  fetchCategories,
  fetchModelsByCategory,
  fetchPartsByModel,
} from "../api/api";
import PartEditor from "../components/PartEditor";

interface Category {
  id: number;
  name: string;
}

interface Model {
  id: number;
  name: string;
}

interface Part {
  id: number;
  name: string;
  part_number: string;
  price: number;
  availability: boolean;
}

const Catalog = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    // Загружаем категории при открытии каталога
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Ошибка при загрузке категорий:", error);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = async (categoryId: number) => {
    setSelectedCategory(categoryId);
    try {
      const data = await fetchModelsByCategory(categoryId);
      setModels(data);
    } catch (error) {
      console.error("Ошибка при загрузке моделей:", error);
    }
  };

  const handleModelClick = async (modelId: number) => {
    setSelectedModel(modelId);
    try {
      const data = await fetchPartsByModel(modelId);
      setParts(data);
    } catch (error) {
      console.error("Ошибка при загрузке деталей:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Каталог</h2>

      {/* Список категорий */}
      <div className="flex gap-2 mb-4">
        {categories.map((category: Category) => (
          <button
            key={category.id}
            className={`px-4 py-2 border rounded ${
              selectedCategory === category.id
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Список моделей */}
      {selectedCategory && models.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Модели</h3>
          <div className="flex gap-2">
            {models.map((model) => (
              <button
                key={model.id}
                className={`px-4 py-2 border rounded ${
                  selectedModel === model.id
                    ? "bg-green-500 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => handleModelClick(model.id)}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Список деталей */}
      {selectedModel && parts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Детали</h3>
          <ul>
            {parts.map((part) => (
              <li
                key={part.id}
                className="p-2 border rounded cursor-pointer hover:bg-gray-200"
                onClick={() => setSelectedPart(part)}
              >
                {part.name} (Артикул: {part.part_number}, Цена: {part.price}₽)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Окно редактирования детали */}
      {selectedPart && (
        <PartEditor part={selectedPart} onClose={() => setSelectedPart(null)} />
      )}
    </div>
  );
};

export default Catalog;
