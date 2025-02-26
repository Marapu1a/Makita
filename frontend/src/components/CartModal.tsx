import { useState } from "react";
import { useCart } from "../utils/useCart";

type CartModalProps = {
  part: {
    id: number;
    part_number: string;
    name: string;
    price: number;
  } | null;
  onClose: () => void;
};

const CartModal: React.FC<CartModalProps> = ({ part, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const totalPrice = (part?.price ?? 0) * quantity;

  if (!part) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
      <div className="bg-white p-6 rounded shadow-lg w-80">
        <h2 className="text-lg font-semibold">{part.name || "Без названия"}</h2>
        <p className="text-sm text-gray-600">Артикул: {part.part_number}</p>
        <p className="text-lg font-bold mt-2">{totalPrice} ₽</p>

        <div className="flex items-center mt-4 space-x-2">
          <button
            className="px-2 py-1 border"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            -
          </button>
          <span>{quantity}</span>
          <button
            className="px-2 py-1 border"
            onClick={() => setQuantity((q) => q + 1)}
          >
            +
          </button>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            className="flex-1 bg-red-600 text-white py-2 rounded"
            onClick={() => {
              addToCart({ ...part, quantity });
              onClose();
            }}
          >
            Добавить в корзину
          </button>
          <button className="flex-1 bg-gray-300 py-2 rounded" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartModal;
