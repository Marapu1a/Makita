import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Подключение к базе данных
conn = psycopg2.connect(
    dbname="makita",
    user="postgres",
    password="2831742dfcz",
    host="localhost"
)
cursor = conn.cursor()

# Настроим Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# URL главной страницы
base_url = 'https://servismakita.ru/catalog/'
driver.get(base_url)
time.sleep(5)

# Сбор категорий
print("Парсинг категорий...")
categories = []
category_elements = driver.find_elements(By.CSS_SELECTOR, ".catalogElementIns a.name")

for category in category_elements:
    category_name = category.text.strip()
    category_url = category.get_attribute("href")
    categories.append((category_name, category_url))
    cursor.execute("INSERT INTO categories (name, createdat, updatedat) VALUES (%s, NOW(), NOW()) ON CONFLICT (name) DO NOTHING", (category_name,))

conn.commit()

# Получаем категории с ID
cursor.execute("SELECT id, name FROM categories")
categories_from_db = {name: id for id, name in cursor.fetchall()}

# Сбор моделей
print("Парсинг моделей...")
for category_name, category_url in categories:
    print(f"Обрабатываю категорию: {category_name}")
    driver.get(category_url)
    time.sleep(3)

    # Теперь берём модели со всей страницы
    model_elements = driver.find_elements(By.CSS_SELECTOR, ".container-list a[href^='/catalog/']")

    for model in model_elements:
        model_name = model.text.strip()
        model_url = model.get_attribute("href")

        # Фиксируем относительные ссылки
        if model_url and model_url.startswith("/"):
            model_url = f"https://servismakita.ru{model_url}"

        created_at = updated_at = time.strftime('%Y-%m-%d %H:%M:%S')
        category_id = categories_from_db.get(category_name)

        print(f"📌 Найдена модель: name={model_name}, url={model_url}")  # Логирование

        cursor.execute(
            """
            INSERT INTO models (name, image_path, createdat, updatedat, category_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET updatedat = EXCLUDED.updatedat
            """,
            (model_name, model_url, created_at, updated_at, category_id)
        )
        conn.commit()

        print(f"✅ Добавлена модель: {model_name}")

cursor.close()
conn.close()
driver.quit()

print("Парсинг завершён.")