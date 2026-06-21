import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

# Подключение к базе данных — credentials из переменных окружения
conn = psycopg2.connect(
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    host=os.environ.get("DB_HOST", "localhost"),
    port=os.environ.get("DB_PORT", "5432"),
)
cursor = conn.cursor()

# Настроим Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# Получаем все категории
cursor.execute("SELECT id, name FROM categories")
categories = cursor.fetchall()

def sanitize_filename(name):
    return re.sub(r'[\\/:"*?<>|]', '_', name)  # заменяет запрещенные символы на "_"

# Парсим каждую категорию
for category_id, category_name_dirty in categories:
    category_name = sanitize_filename(category_name_dirty)

    print(f"Обрабатываю категорию: {category_name}")
    
    # Получаем все модели в текущей категории
    cursor.execute("SELECT id, name, image_path FROM models WHERE category_id = %s", (category_id,))
    models = cursor.fetchall()
    
    for model_id, model_name, model_url in models:
        print(f"\nПарсим модель: {model_name}")
        
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
                print(f"📸 Обрабатываю слайд {slide_number}...")
                active_slide = driver.find_element(By.CSS_SELECTOR, ".swiper-slide-active")
                
                has_div_items = len(active_slide.find_elements(By.CSS_SELECTOR, 'div[item]')) > 0
                has_svg = len(active_slide.find_elements(By.TAG_NAME, 'svg')) > 0

                image_src, image_width, image_height = None, None, None

                if has_div_items:
                    print("✅ Обнаружена разметка div[item], парсим стандартно.")
                    img_elements = active_slide.find_elements(By.CSS_SELECTOR, "img")
                    
                    for img in img_elements:
                        img_src = img.get_attribute("src")
                        if "/drafts/" in img_src:
                            image_src = img_src
                            image_width = img.get_attribute("width")
                            image_height = img.get_attribute("height")
                            break
                
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
                            
                            print(f"📥 Изображение сохранено: {image_path}")
                            
                            cursor.execute("""
                                INSERT INTO slides (model_id, slide_number, image_path, image_width, image_height, createdat, updatedat)
                                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                                ON CONFLICT (model_id, slide_number) 
                                DO UPDATE SET 
                                    image_path = EXCLUDED.image_path,
                                    image_width = EXCLUDED.image_width,
                                    image_height = EXCLUDED.image_height,
                                    updatedat = NOW();
                            """, (model_id, slide_number, image_name, image_width, image_height))
                        
                    found_parts = active_slide.find_elements(By.CSS_SELECTOR, 'div[item^="fx_draft_i__"]')
                    found_part_numbers = [part.get_attribute("item").replace("fx_draft_i__", "") for part in found_parts]
                    print(f"🔎 Найдено {len(found_part_numbers)} деталей на слайде: {found_part_numbers}")
                
                    # Проставляем координаты деталей
                    for part_data in parts_data:
                        part_number = part_data["order"]
                        if part_number is None:
                            continue  # Если нет номера детали — пропускаем

                        # Пробуем найти координаты
                        try:
                            coord_div = active_slide.find_element(By.CSS_SELECTOR, f'div[item="fx_draft_i__{part_number}"]')
                            style = coord_div.get_attribute("style")

                            part_data["x"] = float(style.split("margin-left:")[1].split("px")[0].strip())
                            part_data["y"] = float(style.split("margin-top:")[1].split("px")[0].strip())
                            part_data["width"] = coord_div.size.get("width", None)
                            part_data["height"] = coord_div.size.get("height", None)

                            print(f"✅ Координаты для {part_number}: x={part_data['x']}, y={part_data['y']}, width={part_data['width']}, height={part_data['height']}")

                            # Записываем детали с координатами
                            cursor.execute("""
                                INSERT INTO parts (model_id, number, part_number, name, price, quantity, x_coord, y_coord, width, height, createdat, updatedat)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                ON CONFLICT (model_id, number) 
                                DO UPDATE SET 
                                    name = EXCLUDED.name,
                                    price = EXCLUDED.price,
                                    quantity = EXCLUDED.quantity,
                                    x_coord = EXCLUDED.x_coord,
                                    y_coord = EXCLUDED.y_coord,
                                    width = EXCLUDED.width,
                                    height = EXCLUDED.height,
                                    updatedat = NOW();
                            """, (
                                model_id, part_data["order"], part_data["article"],
                                part_data["name"], part_data["price"], part_data["quantity"],
                                part_data["x"], part_data["y"], part_data["width"], part_data["height"]
                            ))
                            conn.commit()

                        except Exception:
                            # Если координаты не найдены, записываем деталь отдельно без них
                            print(f"⚠️ Координаты для {part_number} не найдены, записываем без них.")

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
                                model_id, part_data["order"], part_data["article"],
                                part_data["name"], part_data["price"], part_data["quantity"]
                            ))
                            conn.commit()
                
                elif has_svg:
                    print("✅ Обнаружена разметка SVG, скачиваем файлы.")
                    svg_element = active_slide.find_element(By.TAG_NAME, "svg")
                    svg_content = svg_element.get_attribute("outerHTML")

                    folder_path = f"public/images/{category_name}/{model_name}"
                    os.makedirs(folder_path, exist_ok=True)
                    svg_path = os.path.join(folder_path, f"{model_name}_{slide_number}.svg")

                    with open(svg_path, "w", encoding="utf-8") as file:
                        file.write(svg_content)

                    print(f"📥 SVG сохранён: {svg_path}")

                    try:
                        fig_image = active_slide.find_element(By.CSS_SELECTOR, "#fig_image")
                        bg_style = fig_image.get_attribute("style")

                        if "background-image" in bg_style:
                            bg_url = bg_style.split('url("')[1].split('")')[0]

                            if bg_url.startswith("/"):
                                bg_url = "https://servismakita.ru" + bg_url

                            response = requests.get(bg_url, stream=True)
                            if response.status_code == 200:
                                bg_name = f"{model_name}_{slide_number}_bg.webp"
                                bg_path = os.path.join(folder_path, bg_name)

                                with open(bg_path, "wb") as file:
                                    for chunk in response.iter_content(1024):
                                        file.write(chunk)

                                print(f"📥 Фоновое изображение схемы сохранено: {bg_path}")
                    except Exception as e:
                        print(f"⚠️ Ошибка при скачивании фонового изображения: {e}")

                # Переход к следующему слайду
                try:
                    next_button = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, ".swiper-button-next"))
                    )
                    driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                    next_button.click()
                    print(f"⏭️ Переключение на слайд {slide_number + 1}...")
                    time.sleep(2)
                    slide_number += 1
                except Exception:
                    print("✅ Слайды закончились. Завершаем обработку.")
                    break
            except Exception as e:
                print(f"❌ Ошибка при обработке слайда: {e}")
                break
        
        conn.commit()

cursor.close()
conn.close()
driver.quit()

print("✅ Парсинг завершён.")
