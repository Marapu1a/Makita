import { useEffect, useState } from "react";

interface Part {
  part_number: string;
  name: string;
  price: number;
  model_name: string;
  available: boolean;
}

const Parts = () => {
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    // Заглушка: просто отображаем пустой массив, если данные ещё не загружены.
    setParts([
      {
        part_number: "123",
        name: "Деталь 1",
        price: 100,
        available: true,
        model_name: "Модель 1",
      },
      {
        part_number: "124",
        name: "Деталь 2",
        price: 200,
        available: false,
        model_name: "Модель 2",
      },
    ]);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Детали</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">№</th>
            <th className="border p-2">Название</th>
            <th className="border p-2">Цена</th>
            <th className="border p-2">Наличие</th>
            <th className="border p-2">Модель</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr key={index} className="border">
              <td className="border p-2">{part.part_number}</td>
              <td className="border p-2">{part.name}</td>
              <td className="border p-2">{part.price} ₽</td>
              <td className="border p-2">{part.available ? "✅" : "❌"}</td>
              <td className="border p-2">{part.model_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Parts;
