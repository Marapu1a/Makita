import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import OrderModal from "../components/OrderModal";
import {
  fetchOrders,
  updateOrderStatus,
  getOrderById,
  Order,
} from "../api/api";

const statuses = ["Новый", "В обработке", "Отправлен", "Завершён", "Отменён"];

const getStatusClass = (status: string) => {
  switch (status) {
    case "Новый":
      return "bg-blue-100 text-blue-800";
    case "В обработке":
      return "bg-yellow-100 text-yellow-800";
    case "Отправлен":
      return "bg-orange-100 text-orange-800";
    case "Завершён":
      return "bg-green-100 text-green-800";
    case "Отменён":
      return "bg-gray-200 text-gray-800";
    default:
      return "";
  }
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [phoneFilter, setPhoneFilter] = useState<string>("");
  const [modalOrder, setModalOrder] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortKey, setSortKey] = useState<keyof Order | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchOrders(filter);
        setOrders(data);
      } catch (err) {
        console.error("Ошибка при загрузке заказов:", err);
        setOrders([]);
      }
    };

    loadOrders();
  }, [filter]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    const confirmed = window.confirm(
      `Вы уверены, что хотите изменить статус заказа #${id} на "${newStatus}"?`
    );
    if (!confirmed) return;

    try {
      await updateOrderStatus(id, newStatus);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      console.error("Ошибка при обновлении статуса:", err);
    }
  };

  const handleSort = (key: keyof Order) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const getSortArrow = (key: keyof Order) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? "▲" : "▼";
  };

  const showOrderDetails = async (id: number) => {
    try {
      const order = await getOrderById(id);
      setModalOrder(order);
    } catch (err) {
      console.error("Ошибка при загрузке деталей заказа:", err);
    }
  };

  const filteredOrders = [...orders]
    .filter((order) =>
      order.phone.toLowerCase().includes(phoneFilter.toLowerCase())
    )
    .filter((order) => {
      const created = new Date(order.created_at).getTime();
      const start = startDate ? new Date(startDate).getTime() : null;
      const end = endDate ? new Date(endDate).getTime() : null;
      return (!start || created >= start) && (!end || created <= end);
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (sortOrder === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Заказы</h1>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => {
            navigate("/dashboard");
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
        >
          Выйти
        </button>
      </div>

      <div className="mb-4 flex items-center space-x-6">
        <div>
          <label className="mr-2 font-medium">Фильтр по статусу:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="">Все</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div>
            <label className="mr-2 font-medium">Телефон:</label>
            <input
              type="text"
              value={phoneFilter}
              onChange={(e) => {
                let value = e.target.value;
                const raw = value.replace(/\D/g, "");

                // Если стерли всё — оставляем только "+7"
                if (raw.length === 0) {
                  setPhoneFilter("+7");
                  return;
                }

                // Формируем маску
                let formatted = "+7";

                if (raw.length > 1) formatted += ` (${raw.slice(1, 4)}`;
                if (raw.length >= 4) formatted += `) ${raw.slice(4, 7)}`;
                if (raw.length >= 7) formatted += `-${raw.slice(7, 9)}`;
                if (raw.length >= 9) formatted += `-${raw.slice(9, 11)}`;

                // Если пользователь удаляет — не добавлять лишние символы
                if (value.length < phoneFilter.length) {
                  setPhoneFilter(value);
                } else {
                  setPhoneFilter(formatted);
                }
              }}
              placeholder="+7..."
              className="border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="mr-2 font-medium">От:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="mr-2 font-medium">До:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-2 py-1 rounded"
            />
          </div>
        </div>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th
              className="p-2 border cursor-pointer"
              onClick={() => handleSort("id")}
            >
              ID {getSortArrow("id")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => handleSort("created_at")}
            >
              Дата {getSortArrow("created_at")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => handleSort("name")}
            >
              Имя {getSortArrow("name")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => handleSort("phone")}
            >
              Телефон {getSortArrow("phone")}
            </th>
            <th className="p-2 border">Статус</th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => handleSort("total_price")}
            >
              Сумма {getSortArrow("total_price")}
            </th>
            <th className="p-2 border">Действия</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr key={order.id} className="border-t">
              <td className="p-2 border">{order.id}</td>
              <td className="p-2 border">
                {new Date(order.created_at).toLocaleString()}
              </td>
              <td className="p-2 border">{order.name}</td>
              <td className="p-2 border">{order.phone}</td>
              <td className="p-2 border">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className={`border rounded px-1 py-0.5 ${getStatusClass(
                    order.status
                  )}`}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-2 border">{order.total_price} ₽</td>
              <td className="p-2 border">
                <button
                  onClick={() => showOrderDetails(order.id)}
                  className="text-blue-600 hover:underline"
                >
                  Подробнее
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Модалка */}
      {modalOrder && (
        <OrderModal order={modalOrder} onClose={() => setModalOrder(null)} />
      )}
    </div>
  );
};

export default OrdersPage;
