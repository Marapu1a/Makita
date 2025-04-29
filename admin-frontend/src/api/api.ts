import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface Part {
    id: number;
    name: string;
    part_number: string;
    price: number;
    availability: boolean;
}

export interface Order {
    id: number;
    name: string;
    phone: string;
    status: string;
    total_price: number;
    created_at: string;
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

// --- Функции API ---

// Авторизация (получить токен)
export const login = async (login: string, password: string) => {
    const response = await api.post("/api/admin/login", { login, password });
    return response.data.token;
};

// Получить список категорий
export const fetchCategories = async (parentId: number | null = null) => {
    const response = await api.get("/api/admin/categories", {
        params: parentId !== null ? { parent_id: parentId } : {},
    });
    return response.data.data;
};

// Получить список моделей по категории
export const fetchModelsByCategory = async (categoryId: number) => {
    const response = await api.get(`/api/admin/models?category_id=${categoryId}`);
    return response.data.data;
};

// Получить детали по модели
export const fetchPartsByModel = async (modelId: number) => {
    const response = await api.get(`/api/admin/parts/model/${modelId}`);
    return response.data.data;
};

// Обновить деталь
export const updatePart = async (id: number, updatedFields: Partial<Part>) => {
    const response = await api.patch(`/api/admin/parts/${id}`, updatedFields);
    return response.data;
};

// --- Заказы ---

// Получить список заказов
export const fetchOrders = async (status?: string): Promise<Order[]> => {
    const token = localStorage.getItem("token");

    const response = await api.get("/api/admin/orders", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        params: status ? { status } : {},
    });

    const data = response.data?.data;

    if (!Array.isArray(data)) {
        console.error("Ожидался массив заказов, но пришло:", data);
        return [];
    }

    return data;
};

// Обновить статус заказа
export const updateOrderStatus = async (orderId: number, status: string) => {
    const token = localStorage.getItem("token");

    const response = await api.patch(
        `/api/admin/orders/${orderId}`,
        { status },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};

// Заказы по ID
export const getOrderById = async (id: number) => {
    const token = localStorage.getItem("token");
    const response = await api.get(`/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
};

// Загрузка файла
export const uploadPriceFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    await fetch(`${API_URL}/api/upload-price`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
};

// Запуск обновления базы
export const updatePrices = async () => {
    await fetch(`${API_URL}/api/update-prices`, {
        method: 'POST',
        credentials: 'include',
    });
};

export default api;
