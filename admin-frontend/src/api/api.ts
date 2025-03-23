import axios from "axios";

const API_URL = "http://localhost:5001";

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
export const fetchCategories = async () => {
    const response = await api.get("/api/admin/categories");
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

export default api;
