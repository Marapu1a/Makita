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
  hasSVG: boolean;
};

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  slide_id: number | null;
  x_coord?: number;
  y_coord?: number;
  width?: number;
  height?: number;
};

type Model = {
  id: string;
  name: string;
  category_name: string;
};

const UnifiedModelDetails = () => {
  const { modelId } = useParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSVGMap, setIsSVGMap] = useState<Record<number, boolean>>({});
  const [svgContent, setSvgContent] = useState<{
    [slideId: number]: string | null;
  }>({});

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const svgContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const [slidesData, modelData, partsData] = await Promise.all([
        fetchSlidesByModel(modelId!),
        fetchModelById(modelId!),
        fetchPartsByModel(modelId!),
      ]);

      setSlides(slidesData);
      setModel(modelData);
      setParts(partsData);

      // 🔥 Заполняем isSVGMap для каждого слайда
      const svgMap: Record<number, boolean> = {};

      slidesData.forEach((slide: Slide) => {
        console.log("Slide ID:", slide.id); // 🔍 Проверим, что slide.id корректный

        const slideParts = partsData.filter(
          (p: { slide_id: number }) => p.slide_id === slide.id
        );

        const hasNoCoords = slideParts.some(
          (part: { x_coord: null; y_coord: null }) =>
            part.x_coord == null || part.y_coord == null
        );

        // Если slide.id не определён, лог покажет ошибку
        if (slide.id === undefined) {
          console.error("Ошибка: slide.id undefined для слайда:", slide);
        }

        svgMap[slide.id] = hasNoCoords; // Здесь ключ должен быть slide.id
      });

      setIsSVGMap(svgMap);
      setActiveSlideIndex(0);
      setIsLoading(false);
    };

    loadData();
  }, [modelId]);

  const activeSlide = slides[activeSlideIndex] || null;
  const isSVG = isSVGMap[activeSlide?.id] ?? false;

  // Для деталей — фильтруем из всех загруженных
  const partsToRender = parts.filter(
    (part) => part.slide_id === activeSlide?.id
  );

  const handleMouseEnter = (part: Part) => {
    setHoveredPart(part);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setHoveredPart(null);
    setShowTooltip(false);
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

  // SVG логика
  // Загрузка SVG для активного слайда
  useEffect(() => {
    const loadSVG = async () => {
      if (!model || !slides.length) return;

      const slide = slides[activeSlideIndex];
      const svgPath = `/images/${model.category_name}/${model.name}/${model.name}_${slide.slide_number}.svg`;

      try {
        const response = await fetch(svgPath);
        if (!response.ok) throw new Error("SVG not found");
        const svgText = await response.text();
        setSvgContent((prev) => ({
          ...prev,
          [slide.id]: svgText,
        }));
      } catch (error) {
        console.error("Error loading SVG:", error);
        setSvgContent((prev) => ({
          ...prev,
          [slide.id]: null,
        }));
      }
    };

    loadSVG();
  }, [model, slides, activeSlideIndex]);

  // Работа с SVG и подсветка деталей
  useEffect(() => {
    const svgText = svgContent[slides[activeSlideIndex]?.id];
    if (!svgText || !svgContainerRef.current) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) return;

    svgContainerRef.current.innerHTML = "";
    svgContainerRef.current.appendChild(svgElement);

    const useElements = svgElement.querySelectorAll("use");
    const xlinkNS = "http://www.w3.org/1999/xlink";

    const handlers: Array<[Element, string, EventListener]> = [];

    useElements.forEach((useEl) => {
      const xlinkHref = useEl.getAttributeNS(xlinkNS, "href");

      if (xlinkHref && xlinkHref.startsWith("#ref")) {
        const match = xlinkHref.match(/#ref(\d+)/);
        if (!match) return;

        const partNumber = match[1];
        const part = parts.find((p) => p.number.toString() === partNumber);
        if (!part) return;

        const handleMouseEnter: EventListener = (e) => {
          const mouseEvent = e as MouseEvent;
          setHoveredPart(part);
          setShowTooltip(true);
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${mouseEvent.clientX + 10}px`;
            tooltipRef.current.style.top = `${mouseEvent.clientY - 40}px`;
          }
        };

        const handleMouseMove: EventListener = (e) => {
          const mouseEvent = e as MouseEvent;
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${mouseEvent.clientX + 10}px`;
            tooltipRef.current.style.top = `${mouseEvent.clientY - 40}px`;
          }
        };

        const handleMouseLeave: EventListener = () => {
          setHoveredPart(null);
          setShowTooltip(false);
        };

        useEl.addEventListener("mouseenter", handleMouseEnter);
        useEl.addEventListener("mousemove", handleMouseMove);
        useEl.addEventListener("mouseleave", handleMouseLeave);

        handlers.push([useEl, "mouseenter", handleMouseEnter]);
        handlers.push([useEl, "mousemove", handleMouseMove]);
        handlers.push([useEl, "mouseleave", handleMouseLeave]);
      }
    });

    // ✅ Чистим обработчики
    return () => {
      handlers.forEach(([el, event, handler]) => {
        el.removeEventListener(event, handler);
      });
    };
  }, [svgContent, slides, activeSlideIndex, parts]);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="container mx-auto py-6 flex">
      <div
        className="relative flex flex-col items-center w-2/3"
        style={{
          width: slides[activeSlideIndex]?.image_width || "auto",
          height: slides[activeSlideIndex]?.image_height || "auto",
        }}
      >
        {slides.length > 0 && (
          <img
            key={slides[activeSlideIndex].slide_number}
            src={`/images/${model?.category_name}/${model?.name}/${model?.name}_${slides[activeSlideIndex].slide_number}.webp`}
            alt="Взрыв-схема"
            className="w-full h-full object-contain mb-4"
          />
        )}
        {isSVG && (
          <div
            ref={svgContainerRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
          />
        )}
        {!isSVG && (
          <div
            className="absolute top-0 left-0 w-full h-full"
            onMouseMove={handleMouseMove}
          >
            {partsToRender.map((part) => (
              <div
                key={part.id}
                id={`part-${part.id}`} // ✅ ОБЯЗАТЕЛЬНО
                className="absolute bg-red-500 bg-opacity-0 cursor-pointer"
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
                  minHeight:
                    part.height && part.height < 10 ? "12px" : undefined,
                }}
                onMouseEnter={() => handleMouseEnter(part)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        )}

        {showTooltip && hoveredPart && (
          <div
            ref={tooltipRef}
            className="fixed bg-black text-white p-2 rounded text-sm pointer-events-none z-[9999]"
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
          hoveredPart={hoveredPart}
          setShowTooltip={(show) => setShowTooltip(show)}
          onPartHover={(part) => setHoveredPart(part)}
          isSvg={isSVG ? true : false}
        />
      </div>
    </div>
  );
};

export default UnifiedModelDetails;
