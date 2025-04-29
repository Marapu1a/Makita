import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const IMAGE_BASE_URL = "/images/categories/";

// Функция для приведения названий файлов в порядок
const sanitizeFileName = (name: string) =>
    name.replace(/\s+/g, "_").replace(/[\/\\]/g, "_");

// Получение всех категорий с добавлением путей к изображениям
export const fetchCategories = async (parentId: string | null = null) => {
    try {
        const response = await axios.get(`${API_URL}/categories`, {
            params: { parent_id: parentId },
        });

        if (response.data.success) {
            return response.data.data.map((category: { name: string }) => ({
                ...category,
                img: `${IMAGE_BASE_URL}${sanitizeFileName(category.name)}.webp`,
            }));
        } else {
            console.error("Ошибка загрузки категорий:", response.data.error);
            return [];
        }
    } catch (error) {
        console.error("Ошибка при загрузке категорий:", error);
        return [];
    }
};

// Получение моделей по `category_id`
export const fetchModelsByCategory = async (categoryId: string) => {
    try {
        const response = await axios.get(`${API_URL}/models`, {
            params: { category_id: categoryId },
        });
        return response.data.success ? response.data.data : [];
    } catch (error) {
        console.error("Ошибка загрузки моделей:", error);
        return [];
    }
};

// Получение одной модели по `model_id`
export const fetchModelById = async (modelId: string) => {
    try {
        const response = await axios.get(`${API_URL}/models/${modelId}`);
        return response.data.success ? response.data.data : null;
    } catch (error) {
        console.error("Ошибка загрузки модели:", error);
        return null;
    }
};

// Получение деталей по `model_id`
export const fetchPartsByModel = async (modelId: string) => {
    try {
        const response = await axios.get(`${API_URL}/parts/model/${modelId}`);
        return response.data.success ? response.data.data : [];
    } catch (error) {
        console.error("Ошибка загрузки деталей модели:", error);
        return [];
    }
};

// Получение слайдов по `model_id`
export const fetchSlidesByModel = async (modelId: string) => {
    try {
        const response = await axios.get(`${API_URL}/slides/model/${modelId}`);
        return response.data.success ? response.data.data : [];
    } catch (error) {
        console.error("Ошибка получения слайдов:", error);
        return [];
    }
};

// Оформление заказа
export const createOrder = async (orderData: any) => {
    try {
        // Формируем корректный объект для заказа
        const formattedCart = orderData.cart.map((item: any) => ({
            product_id: item.id, // Используем ID из Part
            quantity: item.quantity,
            price: item.price,
        }));

        const payload = { ...orderData, cart: formattedCart };

        const response = await axios.post(`${API_URL}/orders`, payload);

        return response.data;
    } catch (error) {
        console.error("Ошибка при оформлении заказа:", error);
        return { success: false, message: "Ошибка сервера" };
    }
};
