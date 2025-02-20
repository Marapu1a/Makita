import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  fetchSlidesByModel,
  fetchModelById,
  fetchPartsByModel,
} from "../utils/api";
import PartsTable from "../components/PartsTable";

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
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const slidesData = await fetchSlidesByModel(modelId!);
      const modelData = await fetchModelById(modelId!);
      const partsData = await fetchPartsByModel(modelId!);

      setSlides(slidesData);
      setModel(modelData);
      setParts(partsData);
      setActiveSlideIndex(0);
    };

    loadData();
  }, [modelId]);

  const activeSlide = slides[activeSlideIndex] || null;

  const partsToRender = activeSlide?.Parts?.length
    ? activeSlide.Parts
    : parts.filter((part) => part.slide_id === activeSlide?.id);

  const handleMouseEnter = (part: Part) => {
    setHoveredPart(part);
  };

  const handleMouseLeave = () => {
    setHoveredPart(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltipRef.current && hoveredPart) {
      const tooltip = tooltipRef.current;

      let x = event.clientX + 10;
      let y = event.clientY - 40; // Смещаем вверх

      // Чтобы тултип не выходил за границы справа
      if (x + tooltip.clientWidth > window.innerWidth) {
        x = window.innerWidth - tooltip.clientWidth - 10;
      }

      // Чтобы тултип не выходил за границы сверху
      if (y < 0) {
        y = event.clientY + 20; // Если упирается в верх экрана, показываем снизу
      }

      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    }
  };

  return (
    <div className="container mx-auto py-6 flex">
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

        <div
          className="absolute top-0 left-0 w-full h-full"
          onMouseMove={handleMouseMove}
        >
          {partsToRender.map((part) => (
            <div
              key={part.id}
              className="absolute bg-red-500 bg-opacity-30 hover:bg-opacity-60 cursor-pointer"
              style={{
                left: `${part.x_coord}px`,
                top: `${part.y_coord}px`,
                width: `${part.width}px`,
                height: `${part.height}px`,
                zIndex: Math.max(
                  1,
                  1000 - (part.width || 0) * (part.height || 0)
                ), // Чем меньше деталь, тем выше z-index
                minWidth: part.width && part.width < 10 ? "12px" : undefined, // Минимальный размер для удобства
                minHeight: part.height && part.height < 10 ? "12px" : undefined,
              }}
              onMouseEnter={() => handleMouseEnter(part)}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </div>

        {hoveredPart && (
          <div
            ref={tooltipRef}
            className="fixed bg-black text-white p-2 rounded text-sm pointer-events-none"
            style={{ transform: "translate(-50%, -50%)" }}
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

      <div className="w-1/3 p-4">
        <PartsTable
          parts={parts}
          onPartHover={(part) => setHoveredPart(part)}
        />
      </div>
    </div>
  );
};

export default ModelDetails;
