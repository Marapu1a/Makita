import { useEffect } from "react";

type Part = {
  id: number;
  number: number;
  name: string | null;
  part_number: string;
  price: number;
  slide_id: number | null;
};

type PartsTableProps = {
  parts: Part[];
  onPartHover: (part: Part | null) => void;
  setShowTooltip: (show: boolean) => void;
  hoveredPart: Part | null;
  isSvg: boolean;
};

const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  onPartHover,
  hoveredPart,
  setShowTooltip,
  isSvg,
}) => {
  useEffect(() => {
    if (!hoveredPart) return;

    const isMatchingPart = (part: Part) =>
      hoveredPart.part_number === part.part_number;

    if (isSvg) {
      // ✅ SVG логика
      const svgContainer = document.querySelector("svg");
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
    <div className="max-h-[500px] overflow-y-auto border rounded">
      <h2 className="text-xl font-semibold mb-2">Таблица деталей</h2>
      <table className="min-w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2 py-1">#</th>
            <th className="border px-2 py-1">Артикул</th>
            <th className="border px-2 py-1">Название</th>
            <th className="border px-2 py-1">Цена</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr
              key={part.id}
              className="hover:bg-gray-100 cursor-pointer"
              onMouseEnter={() => {
                onPartHover(part);
                setShowTooltip(false);
              }}
              onMouseLeave={() => onPartHover(null)}
            >
              <td className="border px-2 py-1">{part.number}</td>
              <td className="border px-2 py-1">{part.part_number}</td>
              <td className="border px-2 py-1">{part.name || "—"}</td>
              <td className="border px-2 py-1">{part.price} ₽</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartsTable;
