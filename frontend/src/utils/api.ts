const API_URL = "http://localhost:5000/api";
const IMAGE_BASE_URL = "/images/categories/";

export const fetchCategories = async () => {
    try {
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) throw new Error("Ошибка загрузки категорий");
        const data = await response.json();

        // Добавляем пути к изображениям
        return data.map((category: { id: string; name: string }) => ({
            ...category,
            img: `${IMAGE_BASE_URL}${category.name.replace(/\s+/g, "_").replace(/\//g, "_")}.jpg`
        }));
    } catch (error) {
        console.error("Ошибка при загрузке категорий:", error);
        return [];
    }
};

// Функция для получения моделей по category_id
export async function fetchModels(categoryId: string) {
    const response = await fetch(`${API_URL}/models?category_id=${categoryId}`);
    if (!response.ok) {
        throw new Error("Ошибка при загрузке моделей");
    }
    return response.json();
}

export const fetchModelsByCategory = async (categoryId: string) => {
    try {
        const response = await fetch(`${API_URL}/models?category_id=${categoryId}`);
        if (!response.ok) throw new Error("Ошибка загрузки моделей");
        return response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Получаем детали по названию модели
export const fetchPartsByModel = async (modelId: string) => {
    const res = await fetch(`${API_URL}/parts/model/${modelId}`);
    if (!res.ok) throw new Error("Ошибка загрузки деталей модели");
    return res.json();
};