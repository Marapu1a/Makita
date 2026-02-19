import psycopg2
from openpyxl import Workbook

# Настройки подключения
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="makita",
    user="postgres",
    password="2831742dfcz"
)

BASE_URL = "https://makita-remont.ru/model/"

cur = conn.cursor()
cur.execute("SELECT id, name FROM models ORDER BY name")
models = cur.fetchall()

wb = Workbook()
ws = wb.active
ws.title = "Модели"

# Заголовки
ws.append(["Название модели", "URL"])

# Данные
for model_id, name in models:
    url = f"{BASE_URL}{model_id}"
    ws.append([name, url])

# Сохраняем
wb.save("models_export.xlsx")

print("✅ Файл 'models_export.xlsx' создан.")
