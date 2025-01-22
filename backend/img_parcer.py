import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Настройка Selenium
driver = webdriver.Chrome()
driver.get("https://servismakita.ru/catalog/benzorezy/dpc6201/")
time.sleep(5)

# Директория для сохранения изображений
output_dir = "images"
os.makedirs(output_dir, exist_ok=True)

# Название модели для фильтрации изображений
model_name = "dpc6201"

# Парсим ссылки на изображения
images = driver.find_elements(By.TAG_NAME, "img")
for img in images:
    src = img.get_attribute("src")
    if src and model_name.lower() in os.path.basename(src).lower():  # Проверяем, содержит ли имя файла название модели
        try:
            response = requests.get(src)
            if response.status_code == 200:
                file_name = os.path.join(output_dir, os.path.basename(src))
                with open(file_name, "wb") as f:
                    f.write(response.content)
                print(f"Скачано: {file_name}")
        except Exception as e:
            print(f"Ошибка скачивания {src}: {e}")

# Закрываем Selenium
driver.quit()
