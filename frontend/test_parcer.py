import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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

# Настроим Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# Тестовая модель
model_id = 1  # ID тестовой модели
model_url = "https://servismakita.ru/catalog/benzorezy/ek6101/"  # Подставь URL тестовой модели
category_name = "TestCategory"
model_name = "TestModel"

# Переход на страницу модели
driver.get(model_url)
time.sleep(5)

# Парсим детали модели (правая часть)
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

while True:
    try:
        print(f"Обрабатываю слайд {slide_number}...")
        active_slide = driver.find_element(By.CSS_SELECTOR, ".swiper-slide-active")

        # Проверяем разметку
        has_div_items = len(active_slide.find_elements(By.CSS_SELECTOR, 'div[item]')) > 0
        has_svg = len(active_slide.find_elements(By.TAG_NAME, 'svg')) > 0

        if has_div_items:
            print("Обнаружена разметка с div[item], парсим стандартно.")
            for part_data in parts_data:
                if part_data["slide_number"] is not None:
                    continue

                part_number = part_data["order"]
                try:
                    coord_div = active_slide.find_element(By.CSS_SELECTOR, f'div[item="fx_draft_i__{part_number}"]')
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

        elif has_svg:
            print("Обнаружена разметка с SVG, скачиваем файлы.")
            svg_element = active_slide.find_element(By.TAG_NAME, "svg")
            svg_content = svg_element.get_attribute("outerHTML")

            folder_path = f"public/images/{category_name}/{model_name}"
            os.makedirs(folder_path, exist_ok=True)
            svg_path = os.path.join(folder_path, f"{model_name}_{slide_number}.svg")

            with open(svg_path, "w", encoding="utf-8") as file:
                file.write(svg_content)

            print(f"SVG сохранён: {svg_path}")

            # Проверяем фоновое изображение схемы
            active_slide = driver.find_element(By.CSS_SELECTOR, ".swiper-slide-active")

            fig_image = active_slide.find_element(By.CSS_SELECTOR, "#fig_image")
            background_style = fig_image.get_attribute("style")
            bg_image_url = None

            if "background-image" in background_style:
                bg_image_url = background_style.split('url("')[1].split('")')[0]

            if bg_image_url:
                # Добавляем домен, если путь относительный
                if bg_image_url.startswith("/"):
                    base_url = "https://servismakita.ru"  # Подставь реальный домен
                    bg_image_url = base_url + bg_image_url

                response = requests.get(bg_image_url, stream=True)
                if response.status_code == 200:
                    image_name = f"{model_name}_{slide_number}.png"
                    image_path = os.path.join(folder_path, image_name)

                    with open(image_path, "wb") as file:
                        for chunk in response.iter_content(1024):
                            file.write(chunk)

                    print(f"Фоновое изображение схемы сохранено: {image_path}")
                else:
                    print(f"Ошибка загрузки фонового изображения: {response.status_code}")

        else:
            print("Непонятная разметка, пропускаем.")

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
        print(f"Ошибка при обработке слайда: {e}")
        break

conn.commit()
cursor.close()
conn.close()
driver.quit()

print("Тестовый парсинг завершён.")
