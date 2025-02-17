import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchSlidesByModel,
  fetchModelById,
  fetchPartsByModel,
} from "../utils/api";

type Slide = {
  id: number;
  slide_number: number;
  image_width: number;
  image_height: number;
  Parts?: Part[]; // Если бэкенд уже возвращает детали внутри `Slide`
};

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  x_coord: number | null;
  y_coord: number | null;
  width: number | null;
  height: number | null;
  price: number;
  slide_id: number | null;
};

type Model = {
  id: string;
  name: string;
  category_name: string;
};

const ModelDetails = () => {
  const { modelId } = useParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const slidesData = await fetchSlidesByModel(modelId!);
      const modelData = await fetchModelById(modelId!);
      const partsData = await fetchPartsByModel(modelId!);

      setSlides(slidesData);
      setModel(modelData);
      setParts(partsData);
      setActiveSlideIndex(0);

      setLoading(false);
    };

    loadData();
  }, [modelId]);

  // Не рендерим, если `slides` еще не загружен
  if (loading || slides.length === 0) {
    return <div className="text-center py-6">Загрузка...</div>;
  }

  // Определяем активный слайд (сначала `null`, но потом он появится)
  const activeSlide = slides[activeSlideIndex] || null;

  // Если бэкенд уже возвращает детали внутри `activeSlide`
  const partsToRender = activeSlide?.Parts?.length
    ? activeSlide.Parts
    : parts.filter((part) => part.slide_id === activeSlide?.id);

  console.log("Активный слайд:", activeSlide);
  console.log("Детали из активного слайда:", partsToRender);

  return (
    <div className="container mx-auto py-6 flex">
      {/* Левая часть - Взрыв-схема */}
      <div
        className="relative flex flex-col items-center w-2/3"
        style={{
          width: activeSlide ? `${activeSlide.image_width}px` : "auto",
          height: activeSlide ? `${activeSlide.image_height}px` : "auto",
        }}
      >
        {activeSlide && (
          <img
            key={activeSlide.slide_number}
            src={`/images/${model?.category_name}/${model?.name}/${model?.name}_${activeSlide.slide_number}.webp`}
            alt="Взрыв-схема"
            className="w-full h-full object-contain mb-4"
          />
        )}

        {/* Слой с интерактивными зонами */}
        <div className="absolute top-0 left-0 w-full h-full">
          {partsToRender.map((part) => (
            <div
              key={part.id}
              className="absolute bg-red-500 bg-opacity-30 hover:bg-opacity-60 cursor-pointer"
              style={{
                left: `${part.x_coord}px`,
                top: `${part.y_coord}px`,
                width: `${part.width}px`,
                height: `${part.height}px`,
              }}
              onMouseEnter={() => setHoveredPart(part)}
              onMouseLeave={() => setHoveredPart(null)}
            />
          ))}
        </div>

        {/* Всплывающая информация о детали */}
        {hoveredPart && (
          <div
            className="absolute bg-black text-white p-2 rounded text-sm"
            style={{
              left: `${hoveredPart.x_coord! + hoveredPart.width! / 2}px`,
              top: `${hoveredPart.y_coord! - 30}px`,
              transform: "translateX(-50%)",
            }}
          >
            <p>
              <strong>Артикул:</strong> {hoveredPart.part_number}
            </p>
            {hoveredPart.name && (
              <p>
                <strong>Название:</strong> {hoveredPart.name}
              </p>
            )}
            <p>
              <strong>Цена:</strong> {hoveredPart.price} руб.
            </p>
          </div>
        )}

        {/* Превью слайдов */}
        <div className="flex gap-2 mt-4">
          {slides.map((slide, index) => (
            <img
              key={slide.slide_number}
              src={`/images/${model?.category_name}/${model?.name}/${model?.name}_${slide.slide_number}.webp`}
              alt={`Схема ${slide.slide_number}`}
              className={`cursor-pointer w-16 h-16 object-contain border-2 ${
                activeSlideIndex === index
                  ? "border-blue-500"
                  : "border-gray-300"
              }`}
              onClick={() => setActiveSlideIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* Правая часть - Заглушка под таблицу */}
      <div className="w-1/3 p-4">
        <h2 className="text-xl font-semibold">
          Таблица деталей (пока заглушка)
        </h2>
      </div>
    </div>
  );
};

export default ModelDetails;
