import pandas as pd
import os
import psycopg2

# Настройки подключения к БД
conn = psycopg2.connect(
    dbname='makita',
    user='postgres',
    password='2831742dfcz',
    host='localhost',
    port=5432
)
cur = conn.cursor()

# Читаем Excel
print("Чтение Excel-файла...")
script_dir = os.path.dirname(os.path.abspath(__file__))  # <-- Путь к папке script
excel_path = os.path.join(script_dir, 'price.xlsx')

df = pd.read_excel(excel_path, engine='openpyxl')

print(f"Найдено строк в файле: {len(df)}")

updated_count = 0

# Проходимся по строкам
for index, row in df.iterrows():
    part_number = str(row['Артикул']).strip()
    price = float(row['Цена'])
    puskino_stock = row['Пушкино-1']

    availability = not pd.isna(puskino_stock)

    # Обновляем в базе
    cur.execute(
        "UPDATE parts SET price = %s, availability = %s WHERE part_number = %s",
        (price, availability, part_number)
    )
    updated_count += 1

    # Лог каждые 100 строк
    if updated_count % 100 == 0:
        print(f"Обработано {updated_count} строк...")

# Сохраняем изменения
conn.commit()
cur.close()
conn.close()

print(f"Обновление завершено. Всего обновлено записей: {updated_count}")
