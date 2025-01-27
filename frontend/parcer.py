import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import openpyxl
import time
import os
import requests

# Подключение к базе данных
conn = psycopg2.connect(
    dbname="makita",
    user="postgres",
    password="2831742dfcz",
    host="localhost"
)
cursor = conn.cursor()

# Настраиваем Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# URL целевой страницы
url = 'https://servismakita.ru/catalog/benzorezy/dpc6201/'

# Загружаем страницу с помощью Selenium
print("Загрузка страницы...")
driver.get(url)
time.sleep(5)

# Создаём Excel-файл
print("Создание Excel-файла...")
workbook = openpyxl.Workbook()
sheet = workbook.active
sheet.title = "Parts Data"

# Заголовки для Excel
headers = [
    "Номер слайда", "Порядковый номер", "Артикул", "Наименование", "Цена", "Количество", "X", "Y", "Ширина", "Высота"
]
sheet.append(headers)

# Парсим правую часть страницы (таблица деталей)
print("Парсинг правой части страницы (таблица деталей)...")
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
            "quantity": cells[4].text.strip() or None,
            "slide_number": None,
            "x": None,
            "y": None,
            "width": None,
            "height": None
        })
print(f"Найдено {len(parts_data)} деталей.")

# Логика обработки слайдов
slide_number = 1
model_name = "DPC6201"

while True:
    try:
        print(f"Обработка слайда {slide_number}...")

        # Получаем активный слайд
        active_slide = driver.find_element(By.CSS_SELECTOR, ".swiper-slide-active")

        # Находим изображение схемы
        img_elements = active_slide.find_elements(By.CSS_SELECTOR, "img")
        image_src, image_width, image_height = None, None, None
        for img in img_elements:
            img_src = img.get_attribute("src")
            if "/drafts/" in img_src:
                image_src = img_src
                image_width = img.get_attribute("width")
                image_height = img.get_attribute("height")
                break

        # Скачиваем изображение схемы
        if image_src:
            response = requests.get(image_src, stream=True)
            if response.status_code == 200:
                folder_path = f"public/images/{model_name}"
                os.makedirs(folder_path, exist_ok=True)

                image_name = f"{model_name}_{slide_number}.webp"
                image_path = os.path.join(folder_path, image_name)

                with open(image_path, "wb") as file:
                    for chunk in response.iter_content(1024):
                        file.write(chunk)
                print(f"Изображение сохранено: {image_path}")

                # Сохраняем данные о слайде в БД
                cursor.execute("""
                    INSERT INTO slides (model_id, slide_number, image_path, image_width, image_height)
                    VALUES (%s, %s, %s, %s, %s)
                """, (1, slide_number, image_name, image_width, image_height))

        # Обрабатываем детали
        for part_data in parts_data:
            if part_data["slide_number"] is not None:
                continue

            part_number = part_data["article"]
            try:
                coord_div = active_slide.find_element(By.CSS_SELECTOR, f".fx_draft__{part_number}")
                style = coord_div.get_attribute("style")
                if "margin-left:" in style and "margin-top:" in style:
                    x_coord = float(style.split("margin-left:")[1].split("px")[0].strip())
                    y_coord = float(style.split("margin-top:")[1].split("px")[0].strip())
                    width = coord_div.size.get("width", None)
                    height = coord_div.size.get("height", None)

                    part_data["slide_number"] = slide_number
                    part_data["x"] = x_coord
                    part_data["y"] = y_coord
                    part_data["width"] = width
                    part_data["height"] = height
                    print(f"Деталь {part_number} найдена на слайде {slide_number}.")
            except Exception:
                pass

        # Переход к следующему слайду
        try:
            next_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".swiper-button-next"))
            )
            driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
            next_button.click()
            print(f"Переключение на слайд {slide_number + 1}...")
            time.sleep(2)
            slide_number += 1
        except Exception:
            print("Слайды закончились. Завершаем обработку.")
            break

    except Exception as e:
        print(f"Обработка слайда завершена: {e}")
        break

# Сохраняем детали в БД
print("Запись данных в базу...")
model_id = 1

for part_data in parts_data:
    try:
        cursor.execute("""
            INSERT INTO parts (
                model_id, number, name, part_number, x_coord, y_coord, width, height, price, availability, quantity, slide_number
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            model_id,
            part_data["order"],
            part_data["name"],
            part_data["article"],
            part_data["x"],
            part_data["y"],
            part_data["width"],
            part_data["height"],
            part_data["price"],
            True,
            part_data["quantity"],
            part_data["slide_number"]
        ))
    except Exception as e:
        print(f"Ошибка при записи детали {part_data['article']}: {e}")

conn.commit()
cursor.close()
conn.close()

print("Данные успешно сохранены в базу данных.")

# Записываем данные в Excel
for part_data in parts_data:
    sheet.append([
        part_data["slide_number"],
        part_data["order"],
        part_data["article"],
        part_data["name"],
        part_data["price"],
        part_data["quantity"],
        part_data["x"],
        part_data["y"],
        part_data["width"],
        part_data["height"]
    ])

workbook.save("parts_data_with_slides.xlsx")
print("Данные сохранены в parts_data_with_slides.xlsx")

driver.quit()
