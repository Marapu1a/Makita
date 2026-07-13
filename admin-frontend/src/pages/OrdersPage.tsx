import { useCallback, useEffect, useState } from "react";
import {
  fetchOrder,
  fetchOrders,
  updateOrderStatus,
  ApiError,
} from "../api/api";
import type { OrderDetail, OrderRow } from "../api/api";
import OrderModal from "../components/OrderModal";
import { useToast } from "../components/Toast";

export const ORDER_STATUSES = ["Новый", "В обработке", "Отправлен", "Завершён", "Отменён"];

export const statusClass = (status: string) => {
  switch (status) {
    case "Новый":
      return "bg-makita text-white";
    case "В обработке":
      return "bg-gray-800 text-white";
    case "Отправлен":
      return "border border-makita text-makita";
    case "Завершён":
      return "border border-gray-300 text-gray-500";
    case "Отменён":
      return "border border-gray-300 text-gray-400 line-through";
    default:
      return "border border-gray-300";
  }
};

const PAGE_SIZE = 25;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;

const OrdersPage = () => {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modalOrder, setModalOrder] = useState<OrderDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrders({ status, phone, from, to, page, limit: PAGE_SIZE });
      setOrders(res.data);
      setTotal(res.total);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast("error", "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [status, phone, from, to, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // при смене фильтров возвращаемся на первую страницу
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setPage(1);
    setter(v);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const prev = orders;
    setOrders((o) => o.map((ord) => (ord.id === id ? { ...ord, status: newStatus } : ord)));
    try {
      await updateOrderStatus(id, newStatus);
      toast("success", `Заказ #${id} → «${newStatus}»`);
    } catch {
      setOrders(prev);
      toast("error", `Не удалось обновить заказ #${id}`);
    }
  };

  const showDetails = async (id: number) => {
    try {
      const { data } = await fetchOrder(id);
      setModalOrder(data);
    } catch {
      toast("error", "Не удалось загрузить заказ");
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Заказы</h1>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="field-label">Статус</label>
          <select value={status} onChange={(e) => withReset(setStatus)(e.target.value)} className="field w-44">
            <option value="">Все</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Телефон</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => withReset(setPhone)(e.target.value)}
            placeholder="Цифры в любом виде"
            className="field w-48"
          />
        </div>
        <div>
          <label className="field-label">От</label>
          <input type="date" value={from} onChange={(e) => withReset(setFrom)(e.target.value)} className="field w-40" />
        </div>
        <div>
          <label className="field-label">До</label>
          <input type="date" value={to} onChange={(e) => withReset(setTo)(e.target.value)} className="field w-40" />
        </div>
        <div className="ml-auto pb-2 text-sm text-gray-500">
          Всего: <span className="font-semibold text-ink">{total}</span>
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Дата</th>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Статус</th>
            <th className="text-right">Сумма</th>
            <th>Позиций</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="font-semibold">{order.id}</td>
              <td>{fmtDateTime(order.createdAt)}</td>
              <td>{order.name}</td>
              <td className="whitespace-nowrap">{order.phone}</td>
              <td>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className={`cursor-pointer px-2 py-1 text-xs font-semibold uppercase tracking-wider ${statusClass(order.status)}`}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-white font-normal normal-case text-ink">
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="text-right whitespace-nowrap">{fmtPrice(order.totalPrice)}</td>
              <td className="text-center">{order.itemsCount}</td>
              <td>
                <button
                  onClick={() => showDetails(order.id)}
                  className="text-sm font-semibold text-makita hover:text-makita-dark"
                >
                  Подробнее
                </button>
              </td>
            </tr>
          ))}
          {!loading && orders.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400">
                Заказов не найдено
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-3 py-1">
            ←
          </button>
          <span className="px-2 text-sm">
            {page} / {pages}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={page >= pages} className="btn-ghost px-3 py-1">
            →
          </button>
        </div>
      )}

      {modalOrder && <OrderModal order={modalOrder} onClose={() => setModalOrder(null)} />}
    </div>
  );
};

export default OrdersPage;
