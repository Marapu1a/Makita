import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart, CartItem } from "../utils/useCart";
import { createOrder } from "../utils/api";
import OrderModal from "../components/OrderModal";
import OrderConfirmationModal from "../components/OrderConfirmationModal";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [confirmedCart, setConfirmedCart] = useState<CartItem[] | any>(null);

  useEffect(() => {
    console.log("confirmedCart", confirmedCart);
  }, [confirmedCart]);

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleOrderSubmit = async (
    orderData: any
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await createOrder({
        ...orderData,
        cart: cartItems,
        total_price: totalPrice,
      });

      if (result.success) {
        setConfirmedCart([...cartItems]); // триггерим обновление
        clearCart();
        setOrderModalOpen(false);
        return { success: true };
      } else {
        return {
          success: false,
          message: result.message || "Ошибка при оформлении заказа",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Ошибка сервера. Попробуйте снова позже.",
      };
    }
  };

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

          <button
            onClick={() => setOrderModalOpen(true)}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Оформить заказ
          </button>

          <OrderModal
            isOpen={isOrderModalOpen}
            onClose={() => setOrderModalOpen(false)}
            onSubmit={handleOrderSubmit}
            totalPrice={totalPrice}
            cartItems={cartItems}
          />
        </>
      )}
      {/* ВНЕ УСЛОВИЯ, чтобы всегда рендерилось при confirmedCart */}
      {confirmedCart && confirmedCart.length > 0 && (
        <OrderConfirmationModal
          cart={confirmedCart}
          onClose={() => setConfirmedCart(null)}
        />
      )}
    </div>
  );
};

export default CartPage;
