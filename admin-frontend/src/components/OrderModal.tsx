import type { OrderDetail } from "../api/api";

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;

const Row = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-500 leading-5">
        {label}
      </span>
      <span>{value}</span>
    </div>
  ) : null;

const OrderModal = ({ order, onClose }: { order: OrderDetail; onClose: () => void }) => {
  const fullAddress = [
    order.city,
    order.street && `ул. ${order.street}`,
    order.house && `д. ${order.house}`,
    order.apartment && `кв. ${order.apartment}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="order-print-root fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="order-print-sheet max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-ink bg-paper p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Заказ #{order.id} — {order.name}
            </h2>
            <div className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString("ru-RU")} · {order.status}
            </div>
          </div>
          <div className="order-print-actions flex gap-2">
            <button type="button" onClick={() => window.print()} className="btn-primary px-3 py-1">
              Печать
            </button>
            <button type="button" onClick={onClose} className="btn-ghost px-3 py-1">
              Закрыть
            </button>
          </div>
        </div>

        <div className="mb-6 space-y-1">
          <Row label="Телефон" value={order.phone} />
          <Row label="Email" value={order.email} />
          <Row label="Доставка" value={order.deliveryMethod} />
          <Row label="ТК" value={order.transportCompany} />
          <Row label="Адрес" value={fullAddress || null} />
          <Row label="Комментарий" value={order.comment} />
        </div>

        <table className="order-print-table tbl mb-4">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[25%]" />
            <col className="w-[28%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Название</th>
              <th>Модели</th>
              <th className="text-right">Кол-во</th>
              <th className="text-right">Цена</th>
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="order-print-item">
                <td className="whitespace-nowrap font-semibold">{item.partNumber}</td>
                <td>{item.partName}</td>
                <td className="text-xs text-gray-500">{item.models.join(", ")}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right whitespace-nowrap">{fmtPrice(item.price)}</td>
                <td className="text-right whitespace-nowrap">{fmtPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right text-base font-bold">Итого: {fmtPrice(order.totalPrice)}</div>
      </div>
    </div>
  );
};

export default OrderModal;
