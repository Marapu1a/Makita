import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import CartModal from "./CartModal";

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  availability: boolean;
  slide_id: number | null;
  x_coord: number;
  y_coord: number;
  width: number;
  height: number;
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
        const partMatch = parts.find(
          (p) => isMatchingPart(p) && p.number.toString() === partNumber
        );

        useEl.setAttribute(
          "style",
          `overflow: visible; opacity: 1; fill: ${
            partMatch
              ? partMatch.availability
                ? "rgba(0, 255, 0, 0.7)"
                : "rgba(255, 0, 0, 0.7)"
              : "rgba(0, 0, 0, 0)"
          };`
        );
      });
    } else {
      // ✅ Div логика
      parts.forEach((part) => {
        const partDiv = document.getElementById(`part-${part.id}`);
        if (!partDiv) return;

        if (isMatchingPart(part)) {
          partDiv.style.backgroundColor = part.availability
            ? "rgba(0, 255, 0, 0.7)" // ✅ есть в наличии
            : "rgba(255, 0, 0, 0.7)"; // ❌ нет в наличии
        } else {
          partDiv.style.backgroundColor = "rgba(0, 0, 0, 0)"; // не подсвечивать
        }
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
        <table className="text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-2 py-1">#</th>
              <th className="border px-3 py-1">Артикул</th>
              <th className="border px-2 py-1">Название</th>
              <th className="border px-2 py-1 text-center">Цена</th>
              <th className="border px-2 py-1 text-center">Есть</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr
                key={part.id}
                className="hover:bg-yellow-100 cursor-pointer odd:bg-gray-50"
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
                    className={`px-2 py-1 rounded text-white ${
                      part.availability
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    onClick={() => part.availability && setSelectedPart(part)}
                    disabled={!part.availability}
                  >
                    <Plus size={18} />
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
