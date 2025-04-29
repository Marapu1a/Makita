import pandas as pd
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
df = pd.read_excel('Makita_Price_SP_24_04_2025.xlsx', engine='openpyxl')  # Имя файла поменяй под свой

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

# Сохраняем изменения
conn.commit()
cur.close()
conn.close()

print("Обновление завершено.")
