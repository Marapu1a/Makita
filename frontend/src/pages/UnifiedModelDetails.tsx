import { useEffect, useState, useRef, useMemo } from "react";
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
  availability: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSVGMap, setIsSVGMap] = useState<Record<number, boolean>>({});
  const [svgContent, setSvgContent] = useState<{
    [slideId: number]: string | null;
  }>({});
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

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

      const svgMap: Record<number, boolean> = {};
      slidesData.forEach((slide: Slide) => {
        const slideParts = partsData.filter(
          (p: Part) => p.slide_id === slide.id
        );
        const hasNoCoords = slideParts.some(
          (part: Part) => part.x_coord === null || part.y_coord === null
        );
        svgMap[slide.id] = hasNoCoords;
      });

      setIsSVGMap(svgMap);
      setActiveSlideIndex(0);
      setIsLoading(false);
    };

    loadData();
  }, [modelId]);

  const activeSlide = useMemo(
    () => slides[activeSlideIndex] || null,
    [slides, activeSlideIndex]
  );
  const filteredParts = useMemo(() => {
    return parts.filter((part) => part.slide_id === activeSlide?.id);
  }, [parts, activeSlide]);
  const isSVG = isSVGMap[activeSlide?.id] ?? false;

  const handleMouseEnter = (part: Part) => {
    setHoveredPart(part);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setHoveredPart(null);
    setShowTooltip(false);
  };

  const handleMouseMove = (() => {
    let animationFrameId: number;

    return (event: MouseEvent | React.MouseEvent) => {
      if (!tooltipRef.current || !hoveredPart) return;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        // ✅ Проверка здесь
        if (!tooltipRef.current) return;

        let x = event.clientX + 10;
        let y = event.clientY - 40;

        const tooltipWidth = tooltipRef.current?.clientWidth || 0;

        if (x + tooltipWidth > window.innerWidth) {
          x = window.innerWidth - tooltipWidth - 10;
        }

        if (y < 0) {
          y = event.clientY + 20;
        }

        tooltipRef.current.style.left = `${x}px`;
        tooltipRef.current.style.top = `${y}px`;
      });
    };
  })();

  useEffect(() => {
    const loadSVG = async () => {
      const slide = slides[activeSlideIndex];
      if (!slide || svgContent[slide.id]) return; // ✅ Проверка внутри эффекта

      const svgPath = `/images/${model?.category_name}/${model?.name}/${model?.name}_${slide.slide_number}.svg`;

      try {
        const response = await fetch(svgPath);
        if (!response.ok) throw new Error("SVG not found");
        const svgText = await response.text();
        setSvgContent((prev) => ({ ...prev, [slide.id]: svgText }));
      } catch (error) {
        console.error("Error loading SVG:", error);
        setSvgContent((prev) => ({ ...prev, [slide.id]: null }));
      }
    };

    loadSVG();
  }, [activeSlideIndex, model, slides]); // ✅ svgContent убрали из зависимостей

  useEffect(() => {
    const svgText = svgContent[slides[activeSlideIndex]?.id];
    if (!svgText || !svgContainerRef.current) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) return;

    svgContainerRef.current.innerHTML = "";
    svgContainerRef.current.appendChild(svgElement);

    // ✅ Проставляем нужные атрибуты
    svgElement.querySelectorAll("use").forEach((useEl) => {
      useEl.setAttribute(
        "style",
        `overflow: visible; opacity: 1; fill: rgba(0, 0, 0, 0)`
      );
    });

    const useElements = svgElement.querySelectorAll("use");
    useElements.forEach((useEl) => {
      const xlinkNS = "http://www.w3.org/1999/xlink";
      const xlinkHref = useEl.getAttributeNS(xlinkNS, "href");

      if (xlinkHref && xlinkHref.startsWith("#ref")) {
        const match = xlinkHref.match(/#ref(\d+)/);
        if (!match) return;

        const partNumber = match[1];
        const part = parts.find((p) => p.number.toString() === partNumber);
        if (!part) return;

        useEl.setAttribute("pointer-events", "all");

        useEl.addEventListener("mouseenter", () => handleMouseEnter(part));
        useEl.addEventListener("mouseleave", handleMouseLeave);
      }
    });
  }, [svgContent, slides, activeSlideIndex, parts]);

  if (isLoading) return <div>Загрузка...</div>;

  return (
    <div
      className="container mx-auto py-6 flex"
      onMouseMove={handleMouseMove} // ✅ Глобальный слушатель для движения мыши
    >
      {/* Основной блок со схемой и SVG */}
      <div className="relative flex flex-col items-center w-2/3">
        <div
          className="relative"
          style={{
            width: activeSlide?.image_width || "auto",
            height: activeSlide?.image_height || "auto",
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

          {isSVG && (
            <div
              ref={svgContainerRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-auto"
            />
          )}

          {!isSVG && (
            <div className="absolute top-0 left-0 w-full h-full">
              {filteredParts.map((part) => (
                <div
                  key={part.id}
                  id={`part-${part.id}`}
                  className="absolute bg-red-500 bg-opacity-0 cursor-pointer"
                  style={{
                    left: `${part.x_coord}px`,
                    top: `${part.y_coord}px`,
                    width: `${part.width}px`,
                    height: `${part.height}px`,
                    zIndex: Math.max(
                      1,
                      1000 - (part.width || 0) * (part.height || 0)
                    ),
                    minWidth:
                      part.width && part.width < 10 ? "12px" : undefined,
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
            >
              <p>
                <strong>Номер на схеме:</strong> {hoveredPart.number}
              </p>
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
        </div>
      </div>

      {/* Превью слайдов - вертикальный список */}
      <div className="flex flex-col items-center w-20 ml-4 space-y-2 overflow-y-auto">
        {slides.map((slide, index) => (
          <img
            key={slide.slide_number}
            src={`/images/${model?.category_name}/${model?.name}/${model?.name}_${slide.slide_number}.webp`}
            alt={`Схема ${slide.slide_number}`}
            className={`cursor-pointer w-16 h-16 object-contain border-2 ${
              activeSlideIndex === index ? "border-blue-500" : "border-gray-300"
            }`}
            onClick={() => setActiveSlideIndex(index)}
          />
        ))}
      </div>

      {/* Таблица деталей */}
      <div className="w-full pl-4">
        <PartsTable
          parts={parts}
          hoveredPart={hoveredPart}
          setShowTooltip={setShowTooltip}
          onPartHover={setHoveredPart}
          isSvg={isSVG}
          svgRef={svgContainerRef}
          modelName={model ? model.name : "Неизвестная модель"}
        />
      </div>
    </div>
  );
};

export default UnifiedModelDetails;
