type OrderModalProps = {
  order: any;
  onClose: () => void;
};

const OrderModal = ({ order, onClose }: OrderModalProps) => {
  const fullAddress = [
    order.city,
    order.street && `ул. ${order.street}`,
    order.house && `д. ${order.house}`,
    order.apartment && `кв. ${order.apartment}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Заказ #{order.id} — {order.name}
        </h2>

        <div className="mb-4 space-y-1 text-sm">
          <p>
            <span className="font-medium">Телефон:</span> {order.phone}
          </p>
          <p>
            <span className="font-medium">Email:</span> {order.email}
          </p>
          <p>
            <span className="font-medium">Дата:</span>{" "}
            {new Date(order.created_at).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Статус:</span> {order.status}
          </p>
          <p>
            <span className="font-medium">Доставка:</span>{" "}
            {order.delivery_method}
          </p>
          {order.transport_company && (
            <p>
              <span className="font-medium">ТК:</span> {order.transport_company}
            </p>
          )}
          {fullAddress && (
            <p>
              <span className="font-medium">Адрес:</span> {fullAddress}
            </p>
          )}
          {order.comment && (
            <p>
              <span className="font-medium">Комментарий:</span> {order.comment}
            </p>
          )}
        </div>

        <table className="w-full border text-sm mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Категория / Модель</th>
              <th className="p-2 border">Артикул</th>
              <th className="p-2 border">Название</th>
              <th className="p-2 border">Кол-во</th>
              <th className="p-2 border">Цена</th>
              <th className="p-2 border">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: any) => (
              <tr key={item.id} className="border-t">
                <td className="p-2 border">
                  {item.part?.model?.category?.name} / {item.part?.model?.name}
                </td>
                <td className="p-2 border">{item.part?.part_number}</td>
                <td className="p-2 border">{item.part?.name}</td>
                <td className="p-2 border">{item.quantity}</td>
                <td className="p-2 border">{item.price} ₽</td>
                <td className="p-2 border">{item.price * item.quantity} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold text-base mb-4">
          Итого: {order.total_price} ₽
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default OrderModal;
