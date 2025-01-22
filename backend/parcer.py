from openpyxl import Workbook
from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import psycopg2
from datetime import datetime

# Настройка Selenium
driver = webdriver.Chrome()
driver.get("https://servismakita.ru/catalog/benzorezy/dpc6201/")
time.sleep(5)

# Сохраняем уникальные детали
data = []

# Парсинг всех строк таблицы
rows = driver.find_elements(By.CSS_SELECTOR, "tr.componentListSingle")
for row in rows:
    cells = row.find_elements(By.TAG_NAME, "td")
    if len(cells) >= 5:
        try:
            number = cells[0].text.strip()
            part_number = cells[1].text.strip()
            name = cells[2].text.strip()
            price = float(cells[3].text.strip().replace(",", ".")) if cells[3].text.strip() else 0
            quantity = int(cells[4].text.strip()) if cells[4].text.strip() else 0

            # Координаты и размеры
            x_coord, y_coord, width, height = None, None, None, None
            try:
                coord_div = driver.find_element(By.CSS_SELECTOR, f".fx_draft__{part_number}")
                style = coord_div.get_attribute("style")
                if "margin-left:" in style and "margin-top:" in style:
                    x_coord = float(style.split("margin-left:")[1].split("px")[0].strip())
                    y_coord = float(style.split("margin-top:")[1].split("px")[0].strip())

                    # Только если координаты есть, берём размеры
                    width = coord_div.size.get("width", None)
                    height = coord_div.size.get("height", None)
            except Exception as e:
                print(f"Координаты не найдены для детали {part_number}: {e}")

            # Сохраняем данные
            data.append([number, part_number, name, price, quantity, x_coord, y_coord, width, height])
            print(f"Деталь: Номер={number}, Артикул={part_number}, Цена={price}, Количество={quantity}, X={x_coord}, Y={y_coord}, Ширина={width}, Высота={height}")
        except Exception as e:
            print(f"Ошибка обработки строки: {e}")

# Закрываем Selenium
driver.quit()

# Сохраняем в базу данных
def save_to_db(data, model_id):
    try:
        conn = psycopg2.connect(
            dbname="makita",
            user="postgres",
            password="2831742dfcz",
            host="localhost",
            port="5432"
        )
        cursor = conn.cursor()

        for item in data:
            number, part_number, name, price, quantity, x_coord, y_coord, width, height = item

            # Преобразуем данные в безопасный для БД формат
            try:
                name = name.encode('utf-8', errors='ignore').decode('utf-8')
            except Exception as e:
                print(f"Ошибка обработки текста в детали {part_number}, номер {number}: {name}")
                continue

            try:
                # Проверяем, существует ли запись с таким `part_number` и `number`
                cursor.execute("""
                    SELECT id, name, price, quantity, x_coord, y_coord, width, height
                    FROM parts
                    WHERE part_number = %s AND number = %s
                """, (part_number, number))
                part = cursor.fetchone()

                if part:
                    # Если запись существует, обновляем данные при изменении
                    db_id, db_name, db_price, db_quantity, db_x_coord, db_y_coord, db_width, db_height = part
                    if (db_name != name or db_price != price or db_quantity != quantity or
                        db_x_coord != x_coord or db_y_coord != y_coord or
                        db_width != width or db_height != height):
                        cursor.execute("""
                            UPDATE parts
                            SET name = %s, price = %s, quantity = %s, x_coord = %s, y_coord = %s, width = %s, height = %s, updatedat = NOW()
                            WHERE id = %s
                        """, (name, price, quantity, x_coord, y_coord, width, height, db_id))
                        print(f"Обновлена запись: {part_number}, номер {number}")
                else:
                    # Если записи нет, добавляем новую
                    cursor.execute("""
                        INSERT INTO parts (model_id, number, name, part_number, price, quantity, x_coord, y_coord, width, height, createdat, updatedat)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (model_id, number, name, part_number, price, quantity, x_coord, y_coord, width, height))
                    print(f"Добавлена новая запись: {part_number}, номер {number}")
            except Exception as e:
                print(f"Ошибка при сохранении детали {part_number}, номер {number}: {e}")

        conn.commit()
        print("Данные успешно сохранены в БД.")
    except Exception as e:
        print(f"Ошибка при подключении к БД: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Вызываем сохранение
model_id = 2  # Укажи реальный ID модели
save_to_db(data, model_id)

# Сохраняем в Excel
wb = Workbook()
ws = wb.active
ws.title = "Parts Data"

# Заголовки
headers = ["Номер", "Артикул", "Наименование", "Цена", "Количество", "X-координата", "Y-координата", "Ширина", "Высота"]
ws.append(headers)

for item in data:
    ws.append(item)

# Сохраняем файл
excel_file = "parsed_parts_with_dimensions_db.xlsx"
wb.save(excel_file)

print(f"Данные успешно сохранены в {excel_file}")
