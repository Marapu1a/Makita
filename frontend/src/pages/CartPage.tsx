import BackButton from "../components/BackButton";
import { useCart } from "../utils/useCart";
import { Link } from "react-router-dom";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart } = useCart();

  // Итоговая сумма
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Корзина</h1>

      {cartItems.length === 0 ? (
        <div className="text-center text-gray-600">
          <p>Корзина пуста</p>
          <Link to="/" className="text-red-600 hover:underline">
            На главную
          </Link>
        </div>
      ) : (
        <>
          <table className="min-w-full border-collapse border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-2 py-1">Артикул</th>
                <th className="border px-2 py-1">Название</th>
                <th className="border px-2 py-1 text-center">Цена</th>
                <th className="border px-2 py-1 text-center">Кол-во</th>
                <th className="border px-2 py-1 text-center">Сумма</th>
                <th className="border px-2 py-1 text-center">Удалить</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.id} className="odd:bg-gray-50 hover:bg-gray-100">
                  <td className="border px-2 py-1">{item.part_number}</td>
                  <td className="border px-2 py-1">{item.name}</td>
                  <td className="border px-2 py-1 text-center">
                    {item.price} ₽
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        className="px-2 border"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="px-2 border"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {(item.price * item.quantity).toLocaleString()} ₽
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => removeFromCart(item.id)}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-lg font-semibold">
            Итого: {totalPrice.toLocaleString()} ₽
          </div>

          <button className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Оформить заказ
          </button>
          <BackButton className="ml-2" rootPath="/" />
        </>
      )}
    </div>
  );
};

export default CartPage;
