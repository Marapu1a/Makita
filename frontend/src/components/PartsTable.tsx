import { useEffect, useState } from "react";
import CartModal from "./CartModal";

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  slide_id: number | null;
  availability: boolean;
};

type PartsTableProps = {
  parts: Part[];
  onPartHover: (part: Part | null) => void;
  setShowTooltip: (show: boolean) => void;
  hoveredPart: Part | null;
  isSvg: boolean;
  svgRef: React.RefObject<HTMLDivElement>;
  modelName: string;
};

const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  onPartHover,
  hoveredPart,
  setShowTooltip,
  isSvg,
  svgRef,
  modelName,
}) => {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  useEffect(() => {
    if (!hoveredPart) return;

    const isMatchingPart = (part: Part) =>
      hoveredPart.part_number === part.part_number;

    if (isSvg && svgRef?.current) {
      // ✅ SVG логика
      const svgContainer = svgRef.current.querySelector("svg");
      if (!svgContainer) return;

      svgContainer.querySelectorAll("use").forEach((useEl) => {
        const xlinkHref =
          useEl.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
          useEl.getAttribute("href");

        if (!xlinkHref?.startsWith("#ref")) return;

        const match = xlinkHref.match(/#ref(\d+)/);
        if (!match) return;

        const partNumber = match[1];
        const matched = parts.some(
          (p) => isMatchingPart(p) && p.number.toString() === partNumber
        );

        useEl.setAttribute(
          "style",
          `overflow: visible; opacity: 1; fill: ${
            matched ? "rgba(0, 255, 0, 0.7)" : "rgba(0, 0, 0, 0)"
          };`
        );
      });
    } else {
      // ✅ Div логика
      parts.forEach((part) => {
        const partDiv = document.getElementById(`part-${part.id}`);
        if (!partDiv) return;

        partDiv.style.backgroundColor = isMatchingPart(part)
          ? "rgba(0, 255, 0, 0.7)" // ✅ Подсветка
          : "rgba(255, 0, 0, 0)"; // ❌ Снятие подсветки
      });
    }
  }, [hoveredPart, isSvg, parts]);

  return (
    <>
      {selectedPart && (
        <CartModal
          part={{
            ...selectedPart,
            name: selectedPart?.name ?? "Без названия",
          }}
          onClose={() => setSelectedPart(null)}
        />
      )}
      <div className="max-h-screen overflow-y-auto border rounded">
        <h2 className="text-xl font-semibold mb-2">Модель {modelName}</h2>
        <table className="min-w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-2 py-1">#</th>
              <th className="border px-2 py-1">Артикул</th>
              <th className="border px-2 py-1">Название</th>
              <th className="border px-2 py-1 text-center">Цена</th>
              <th className="border px-2 py-1 text-center">Есть</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part, index) => (
              <tr
                key={part.id}
                className="hover:bg-gray-100 cursor-pointer odd:bg-gray-50"
                onMouseEnter={() => {
                  onPartHover(part);
                  setShowTooltip(false);
                }}
                onMouseLeave={() => onPartHover(null)}
              >
                <td className="border px-2 py-1 text-center">{part.number}</td>
                <td className="border px-2 py-1">{part.part_number}</td>
                <td className="border px-2 py-1">{part.name || "—"}</td>
                <td className="border px-2 py-1 text-center">{part.price} ₽</td>
                <td className="border px-2 py-1 text-center">
                  {part.availability ? "Да" : "Нет"}
                </td>
                <td className="border px-2 py-1 text-center">
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => setSelectedPart(part)}
                  >
                    Добавить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PartsTable;
