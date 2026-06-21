import psycopg2
from openpyxl import Workbook
import os
from dotenv import load_dotenv

load_dotenv()

# Настройки подключения — credentials из переменных окружения
conn = psycopg2.connect(
    host=os.environ.get("DB_HOST", "localhost"),
    port=int(os.environ.get("DB_PORT", "5432")),
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
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
