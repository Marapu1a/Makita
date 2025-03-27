type Props = {
  cart: any[];
  onClose: () => void;
};

const OrderConfirmationModal = ({ cart, onClose }: Props) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  console.log("RENDERING CONFIRMATION MODAL");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Спасибо! Ваш заказ принят 🎉</h2>
        <p className="mb-4">Наш менеджер свяжется с вами в ближайшее время.</p>

        <table className="w-full border text-sm mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Артикул</th>
              <th className="p-2 border">Название</th>
              <th className="p-2 border">Кол-во</th>
              <th className="p-2 border">Цена</th>
              <th className="p-2 border">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, i) => (
              <tr key={i}>
                <td className="p-2 border">{item.part_number}</td>
                <td className="p-2 border">{item.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">{item.price} ₽</td>
                <td className="p-2 border">{item.price * item.quantity} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold">Итого: {total} ₽</div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
