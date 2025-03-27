import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  fetchCategories,
  fetchModelsByCategory,
  fetchPartsByModel,
} from "../api/api";
import PartEditor from "../components/PartEditor";
import BackButton from "../components/BackButton";

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
  number: number;
  name: string;
  part_number: string;
  price: number;
  availability: boolean;
}

const Catalog = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const modelsRef = useRef<HTMLDivElement | null>(null);
  const partsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setSelectedModel(null);
      setSelectedPart(null);
      setModels([]);
      setParts([]);

      try {
        const cats = await fetchCategories(categoryId ? +categoryId : null);
        if (cats.length > 0) {
          setCategories(cats);
        } else if (categoryId) {
          const models = await fetchModelsByCategory(+categoryId);
          setModels(models);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
      }
    };

    loadData();
  }, [categoryId]);

  const handleCategoryClick = (id: number) => {
    navigate(`/catalog/${id}`);
    setTimeout(() => {
      modelsRef.current?.scrollIntoView();
    }, 300);
  };

  const handleModelClick = async (modelId: number) => {
    setSelectedModel(modelId);
    try {
      const data = await fetchPartsByModel(modelId);
      setParts(data);
      setTimeout(() => {
        partsRef.current?.scrollIntoView();
      }, 300);
    } catch (error) {
      console.error("Ошибка при загрузке деталей:", error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800">Каталог</h2>
      <BackButton />

      {categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700">Категории</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="w-60 p-4 rounded-lg border shadow-sm hover:shadow-md transition cursor-pointer bg-white"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="text-lg font-semibold">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Категория</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div ref={modelsRef} className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700">Модели</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`w-40 p-4 rounded-lg border shadow-sm hover:shadow-md transition cursor-pointer
      ${
        selectedModel === model.id
          ? "bg-green-100 border-green-500"
          : "bg-white"
      }`}
                  onClick={() => handleModelClick(model.id)}
                >
                  <div className="text-lg font-semibold">{model.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Модель</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedModel && parts.length > 0 && (
        <div ref={partsRef} className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700">Детали</h3>
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Артикул</th>
                <th className="px-4 py-2 text-left">Название</th>
                <th className="px-4 py-2 text-left">Цена</th>
                <th className="px-4 py-2 text-left">Наличие</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr
                  key={part.id}
                  className="hover:bg-green-200 cursor-pointer"
                  onClick={() => setSelectedPart(part)}
                >
                  <td className="px-4 py-2">{part.number}</td>
                  <td className="px-4 py-2">{part.part_number}</td>
                  <td className="px-4 py-2">{part.name || "Без названия"}</td>
                  <td className="px-4 py-2">{part.price}₽</td>
                  <td className="px-4 py-2">{part.availability ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPart && (
        <PartEditor part={selectedPart} onClose={() => setSelectedPart(null)} />
      )}
    </div>
  );
};

export default Catalog;
