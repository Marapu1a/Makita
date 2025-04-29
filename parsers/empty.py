import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import re
import requests

# ====== Настройки ======
# Тут парсим точечно детали в моделях без изображений (и без самих моделей, их вручную создаем)
# Введи вручную данные о модели
model_name = "d1"  # Название модели
category_name = "Генераторы"  # Категория модели
model_url = "https://servismakita.ru/catalog/dyrokoly/"  # Введи сюда URL модели

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

def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', '_', name)

# === 1. Проверка или создание категории ===
cursor.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
category_row = cursor.fetchone()

if category_row:
    category_id = category_row[0]
else:
    cursor.execute("INSERT INTO categories (name, createdat, updatedat) VALUES (%s, NOW(), NOW()) RETURNING id", (category_name,))
    category_id = cursor.fetchone()[0]
    conn.commit()
    print(f"✅ Создана категория: {category_name}")

# === 2. Проверка или создание модели ===
cursor.execute("SELECT id FROM models WHERE name = %s", (model_name,))
model_row = cursor.fetchone()

if model_row:
    model_id = model_row[0]
else:
    cursor.execute("""
        INSERT INTO models (name, image_path, category_id, createdat, updatedat) 
        VALUES (%s, %s, %s, NOW(), NOW()) RETURNING id
    """, (model_name, f"images/{sanitize_filename(category_name)}/{model_name}/{model_name}_1.webp", category_id))
    model_id = cursor.fetchone()[0]
    conn.commit()
    print(f"✅ Создана модель: {model_name}")

# === 3. Открываем страницу модели ===
driver.get(model_url)
time.sleep(5)

# === 4. Парсим детали ===
parts_table = driver.find_elements(By.CSS_SELECTOR, "tr.componentListSingle")
parts_data = []

for part in parts_table:
    cells = part.find_elements(By.CSS_SELECTOR, "td")
    if len(cells) >= 5:
        price_raw = cells[3].text.strip().replace(' ', '').replace('₽', '')
        parts_data.append({
            "order": cells[0].text.strip() or None,
            "article": cells[1].text.strip() or None,
            "name": cells[2].text.strip() or None,
            "price": float(price_raw) if price_raw.replace('.', '', 1).isdigit() else 0,
            "quantity": cells[4].text.strip() or None
        })

print(f"🔎 Найдено {len(parts_data)} деталей для модели {model_name}")

# === 5. Записываем детали в БД ===
for part_data in parts_data:
    cursor.execute("""
        INSERT INTO parts (model_id, number, part_number, name, price, quantity, createdat, updatedat)
        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (model_id, number) 
        DO UPDATE SET 
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            quantity = EXCLUDED.quantity,
            updatedat = NOW();
    """, (
        model_id, part_data["order"], part_data["article"], part_data["name"],
        part_data["price"], part_data["quantity"]
    ))
conn.commit()

# === 6. Парсим слайды ===
slide_number = 1

while True:
    try:
        print(f"📸 Обрабатываю слайд {slide_number}...")

        # Проверка наличия слайдов перед парсингом
        try:
            active_slide = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".swiper-slide-active"))
            )
            print(f"📸 Слайд найден, начинаем обработку.")
        except Exception:
            print("⚠️ Слайдов не найдено для этой модели, пропускаем обработку слайдов.")
            break  # Если слайдов нет, выходим из цикла

        # Обрабатываем слайды
        img_elements = active_slide.find_elements(By.CSS_SELECTOR, "img")

        # Скачиваем изображение слайда
        for img in img_elements:
            img_src = img.get_attribute("src")
            if img_src:
                response = requests.get(img_src, stream=True)
                if response.status_code == 200:
                    folder_path = f"public/images/{sanitize_filename(category_name)}/{model_name}"
                    os.makedirs(folder_path, exist_ok=True)

                    image_name = f"{model_name}_{slide_number}.webp"
                    image_path = os.path.join(folder_path, image_name)

                    with open(image_path, "wb") as file:
                        for chunk in response.iter_content(1024):
                            file.write(chunk)

                    print(f"📥 Сохранено изображение: {image_path}")

                    # Сохраняем слайд в БД
                    cursor.execute("""
                        INSERT INTO slides (model_id, slide_number, image_path, image_width, image_height, createdat, updatedat)
                        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                        ON CONFLICT (model_id, slide_number) 
                        DO UPDATE SET 
                            image_path = EXCLUDED.image_path,
                            updatedat = NOW();
                    """, (model_id, slide_number, image_name, img.get_attribute("width"), img.get_attribute("height")))
                    conn.commit()

        # Переход к следующему слайду
        try:
            next_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".swiper-button-next"))
            )
            next_button.click()
            slide_number += 1
            time.sleep(2)
        except Exception:
            print("✅ Все слайды обработаны.")
            break

    except Exception as e:
        print(f"❌ Ошибка при обработке слайда: {e}")
        break

# === 7. Завершаем парсинг ===
cursor.close()
conn.close()
driver.quit()

print("✅ Парсинг завершён.")
