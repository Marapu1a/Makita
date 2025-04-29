import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Настраиваем Selenium
options = webdriver.ChromeOptions()
driver = webdriver.Chrome(options=options)

# Открываем главную страницу каталога
base_url = "https://servismakita.ru/catalog/"
driver.get(base_url)
time.sleep(3)

# Находим все категории
categories = driver.find_elements(By.CSS_SELECTOR, ".catalogElementIns a.name")
categories_list = [(cat.text.strip(), cat.get_attribute("href")) for cat in categories]

def sanitize_filename(name):
    """Очищает имя файла от запрещённых символов"""
    return "".join(c if c.isalnum() or c in " _-" else "_" for c in name)

def download_pdf(category_name, model_name, pdf_url):
    """Скачивает PDF и сохраняет его в нужную папку"""
    sanitized_category = sanitize_filename(category_name)
    sanitized_model = sanitize_filename(model_name.replace("_PDF", ""))  # Убираем _PDF
    
    folder_path = os.path.join("public", "pdfs", sanitized_category)
    os.makedirs(folder_path, exist_ok=True)  # Создаём папку, если её нет

    file_path = os.path.join(folder_path, f"{sanitized_model}.pdf")
    
    if os.path.exists(file_path):
        print(f"  🔹 {model_name}.pdf уже скачан, пропускаем.")
        return
    
    try:
        print(f"  ⏬ Качаю {model_name}...")
        response = requests.get(pdf_url, stream=True, timeout=10)
        response.raise_for_status()

        with open(file_path, "wb") as file:
            for chunk in response.iter_content(1024):
                file.write(chunk)

        print(f"  ✅ {model_name}.pdf сохранён в {file_path}")

    except Exception as e:
        print(f"  ❌ Ошибка при скачивании {model_name}: {e}")

def find_pdf_models(container):
    """Рекурсивно ищет ссылки на PDF-модели внутри контейнера, возвращает только уникальные"""
    pdf_models = set()  # Используем `set`, чтобы исключить дубликаты

    sub_divs = container.find_elements(By.XPATH, ".//a[contains(text(), '_PDF')]")
    for link in sub_divs:
        model_name = link.text.strip()
        model_url = link.get_attribute("href")
        pdf_models.add((model_name, model_url))

    return list(pdf_models)  # Возвращаем список уникальных моделей

# Проход по категориям
for category_name, category_url in categories_list:
    print(f"\n📂 Категория: {category_name} ({category_url})")
    driver.get(category_url)
    time.sleep(3)

    containers = driver.find_elements(By.CSS_SELECTOR, ".container-list")

    all_pdf_models = set()  # Убираем дубли для всей категории
    for container in containers:
        all_pdf_models.update(find_pdf_models(container))

    if all_pdf_models:
        print("  ✅ Найдены модели с PDF:")
        for model_name, model_url in all_pdf_models:
            print(f"    📄 {model_name} → {model_url}")
            download_pdf(category_name, model_name, model_url)

# Закрываем браузер
driver.quit()
print("\n✅ Парсинг завершён, все PDF скачаны.")
