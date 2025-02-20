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
  hoveredPart: Part | null;
};

const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  onPartHover,
  hoveredPart,
}) => {
  useEffect(() => {
    if (!hoveredPart) return;

    const svgContainer = document.querySelector("svg");
    if (!svgContainer) return;

    const useElements = svgContainer.querySelectorAll("use");
    const xlinkNS = "http://www.w3.org/1999/xlink";

    useElements.forEach((useEl) => {
      const xlinkHref =
        useEl.getAttributeNS(xlinkNS, "href") || useEl.getAttribute("href");

      if (xlinkHref && xlinkHref.startsWith("#ref")) {
        const match = xlinkHref.match(/#ref(\d+)/);
        if (!match) return;

        const partNumber = match[1];

        // ✅ Сравниваем артикулы и подсвечиваем ВСЕ детали с таким же артикулом
        const isMatchingPart =
          hoveredPart && hoveredPart.number.toString() === partNumber;

        useEl.setAttribute(
          "fill",
          isMatchingPart ? "rgba(255, 0, 0, 0.7)" : "rgba(0, 255, 0, 0.5)"
        );
        useEl.style.fill = isMatchingPart
          ? "rgba(255, 0, 0, 0.7)"
          : "rgba(0, 255, 0, 0.5)";
      }
    });
  }, [hoveredPart]);

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
          {parts.map((part, index) => (
            <tr
              key={part.id}
              className="hover:bg-gray-100 cursor-pointer"
              onMouseEnter={() => onPartHover(part)}
              onMouseLeave={() => onPartHover(null)}
            >
              <td className="border px-2 py-1">{index + 1}</td>
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
