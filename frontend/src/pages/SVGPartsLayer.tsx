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
};

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  slide_id: number | null;
};

type Model = {
  id: string;
  name: string;
  category_name: string;
};

const ModelDetailsWithSVG = () => {
  const { modelId } = useParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const svgContainerRef = useRef<HTMLDivElement | null>(null);

  // Загрузка данных модели
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
        setSvgContent(svgText);
      } catch (error) {
        console.error("Error loading SVG:", error);
        setSvgContent(null);
      }
    };

    loadSVG();
  }, [model, slides, activeSlideIndex]);

  // Работа с SVG и подсветка деталей
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgElement = svgDoc.querySelector("svg");

    if (!svgElement) return;

    svgContainerRef.current.innerHTML = "";
    svgContainerRef.current.appendChild(svgElement);

    const useElements = svgElement.querySelectorAll("use");
    const xlinkNS = "http://www.w3.org/1999/xlink";

    useElements.forEach((useEl) => {
      const xlinkHref = useEl.getAttributeNS(xlinkNS, "href");

      if (xlinkHref && xlinkHref.startsWith("#ref")) {
        const match = xlinkHref.match(/#ref(\d+)/);
        if (!match) return;

        const partNumber = match[1];
        const part = parts.find((p) => p.number.toString() === partNumber);
        if (!part) return;

        // Применение стилей по умолчанию
        useEl.setAttribute("opacity", "1");
        useEl.setAttribute("fill", "rgba(0, 0, 0, 0.0)");
        useEl.style.opacity = "1";
        useEl.style.fill = "rgba(0, 0, 0, 0.0)";
        useEl.style.overflow = "visible";

        // Наведение для подсветки и тултипа
        useEl.addEventListener("mouseenter", (e: MouseEvent) => {
          useEl.setAttribute("fill", "rgba(255, 0, 0, 0.7)");
          useEl.style.fill = "rgba(255, 0, 0, 0.7)";
          setHoveredPart(part);
          setShowTooltip(true);
          setTooltipPosition({ x: e.clientX + 10, y: e.clientY - 40 });
        });

        useEl.addEventListener("mousemove", (e: MouseEvent) => {
          setTooltipPosition({ x: e.clientX + 10, y: e.clientY - 40 });
        });

        useEl.addEventListener("mouseleave", () => {
          useEl.setAttribute("fill", "rgba(0, 255, 0, 0.5)");
          useEl.style.fill = "rgba(0, 255, 0, 0.5)";
          setHoveredPart(null);
          setShowTooltip(false);
        });
      }
    });
  }, [svgContent, parts]);

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
          <>
            <img
              key={slides[activeSlideIndex].slide_number}
              src={`/images/${model?.category_name}/${model?.name}/${model?.name}_${slides[activeSlideIndex].slide_number}.webp`}
              alt="Взрыв-схема"
              className="w-full h-full object-contain mb-4"
            />
            <div
              ref={svgContainerRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-auto"
            />
          </>
        )}

        {/* ✅ Тултип */}
        {showTooltip && hoveredPart && (
          <div
            ref={tooltipRef}
            className="fixed bg-black text-white p-2 rounded text-sm pointer-events-none"
            style={{
              top: `${tooltipPosition.y}px`,
              left: `${tooltipPosition.x}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
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

        {/* ✅ Переключение между схемами */}
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
        />
      </div>
    </div>
  );
};

export default ModelDetailsWithSVG;
