import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPartsByModel } from "../utils/api";

type Part = {
  id: string;
  model_id: string;
  number: number;
  name: string | null;
  part_number: string;
  x_coord: number | null;
  y_coord: number | null;
  price: number;
  availability: boolean;
  quantity: number;
  width: number | null;
  height: number | null;
};

export default function ModelPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const modelImage = `/images/models/${modelId}.webp`;
  const modelBackground = `/images/models/${modelId}_bg.webp`;
  const svgOverlay = `/images/models/${modelId}.svg`;

  useEffect(() => {
    const loadParts = async () => {
      if (!modelId) return;
      try {
        const data = await fetchPartsByModel(modelId);
        setParts(data);
      } catch (error) {
        console.error("Ошибка загрузки деталей:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, [modelId]);

  if (loading) return <div className="text-center py-6">Загрузка...</div>;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold text-center mb-6">Модель {modelId}</h1>

      <div className="flex gap-6">
        {/* Левая часть — схема */}
        <div className="relative w-2/3 border p-4">
          <img src={modelBackground} alt="Фон схемы" className="w-full" />
          <div className="absolute top-0 left-0 w-full h-full">
            {parts.map((part) =>
              part.x_coord && part.y_coord ? (
                <div
                  key={part.id}
                  className="absolute bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full cursor-pointer"
                  style={{
                    top: `${part.y_coord}px`,
                    left: `${part.x_coord}px`,
                    width: `${part.width}px`,
                    height: `${part.height}px`,
                  }}
                  title={part.name || "Деталь"}
                >
                  {part.number}
                </div>
              ) : null
            )}
          </div>
          <img
            src={svgOverlay}
            alt="Схема"
            className="absolute top-0 left-0 w-full h-full opacity-60"
          />
        </div>

        {/* Правая часть — таблица */}
        <div className="w-1/3 border p-4">
          <h2 className="text-lg font-bold mb-4">Детали модели</h2>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">№</th>
                <th className="border p-2">Артикул</th>
                <th className="border p-2">Название</th>
                <th className="border p-2">Цена</th>
                <th className="border p-2">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.id} className="border">
                  <td className="border p-2 text-center">{part.number}</td>
                  <td className="border p-2">{part.part_number}</td>
                  <td className="border p-2">{part.name || "—"}</td>
                  <td className="border p-2 text-right">{part.price} ₽</td>
                  <td className="border p-2 text-center">{part.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
