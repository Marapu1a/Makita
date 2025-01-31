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

# Получаем все категории
cursor.execute("SELECT id, name FROM categories")
categories = cursor.fetchall()

# Парсим каждую категорию
for category_id, category_name in categories:
    print(f"Обрабатываю категорию: {category_name}")
    
    # Получаем все модели в текущей категории
    cursor.execute("SELECT id, name, image_path FROM models WHERE category_id = %s", (category_id,))
    models = cursor.fetchall()
    
    for model_id, model_name, model_url in models:
        print(f"\nПарсим модель: {model_name}")
        
        # URL страницы модели (предполагаем, что URL строится по шаблону)
        model_url = model_url.strip()
        driver.get(model_url)
        time.sleep(5)
        
        # Парсим детали модели
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
        
        print(f"Найдено {len(parts_data)} деталей для {model_name}")
        
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
                            folder_path = f"public/images/{category_name}/{model_name}"
                            os.makedirs(folder_path, exist_ok=True)
                            
                            image_name = f"{model_name}_{slide_number}.webp"
                            image_path = os.path.join(folder_path, image_name)
                            
                            with open(image_path, "wb") as file:
                                for chunk in response.iter_content(1024):
                                    file.write(chunk)
                            print(f"Изображение сохранено: {image_path}")
                            
                            cursor.execute("""
                                INSERT INTO slides (model_id, slide_number, image_path, image_width, image_height, createdat, updatedat)
                                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                            """, (model_id, slide_number, image_name, image_width, image_height))
                
                    # Обрабатываем детали
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
                                
                                # **Добавляем в БД**
                                cursor.execute("""
                                    INSERT INTO parts (model_id, slide_id, number, part_number, name, price, quantity, x_coord, y_coord, width, height, createdat, updatedat)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                    ON CONFLICT (part_number) DO UPDATE 
                                    SET slide_id = EXCLUDED.slide_id,
                                        x_coord = EXCLUDED.x_coord,
                                        y_coord = EXCLUDED.y_coord,
                                        width = EXCLUDED.width,
                                        height = EXCLUDED.height,
                                        updatedat = NOW();
                                """, (
                                    model_id, slide_id, part_data["order"], part_data["article"],
                                    part_data["name"], part_data["price"], part_data["quantity"],
                                    x, y, width, height
                                ))
                                conn.commit()  # Фиксируем изменения сразу
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
                            image_name = f"{model_name}_{slide_number}.webp"
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

print("Парсинг завершён.")