import os
import time
import re
import requests
import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By

# Подключение к базе данных
conn = psycopg2.connect(
    dbname="makita",
    user="postgres",
    password="2831742dfcz",
    host="localhost"
)
cursor = conn.cursor()

# Настройки Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# URL главной страницы
base_url = 'https://servismakita.ru/catalog/pily/'
driver.get(base_url)
time.sleep(5)

# Папка для хранения изображений
image_base_path = "public/images/categories"
os.makedirs(image_base_path, exist_ok=True)

# Функция очистки имени файла от запрещённых символов
def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', '_', name).replace(" ", "_")  # Убираем запрещённые символы + пробелы меняем на "_"

# Функция скачивания и сохранения изображения
def download_image(image_url, category_name):
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Заменяем расширение на .jpg, чтобы было единообразие
        safe_category_name = sanitize_filename(category_name)
        save_path = os.path.join(image_base_path, f"{safe_category_name}.jpg")

        with open(save_path, "wb") as file:
            file.write(response.content)

        print(f"✅ Сохранено: {save_path}")
    except Exception as e:
        print(f"❌ Ошибка скачивания {image_url}: {e}")

# Сбор категорий
print("Парсинг категорий...")
category_elements = driver.find_elements(By.CSS_SELECTOR, ".catalogElementIns")

for category in category_elements:
    name_element = category.find_element(By.CSS_SELECTOR, "a.name")
    img_element = category.find_element(By.CSS_SELECTOR, "a.img img")

    category_name = name_element.text.strip()
    image_url = img_element.get_attribute("src")

    if not image_url:
        print(f"❌ Пропущено: {category_name} — нет изображения")
        continue

    if image_url.startswith("/"):
        image_url = f"https://servismakita.ru{image_url}"

    download_image(image_url, category_name)

cursor.close()
conn.close()
driver.quit()

print("Парсинг завершён.")
