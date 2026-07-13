import cv2
import numpy as np
import os

def process_image(input_path, output_path):
    """Обрабатывает изображение, удаляя водяные знаки и сохраняя результат."""
    print(f"🔹 Обрабатываем файл: {input_path}")
    print(f"🔹 Файл для сохранения: {output_path}")

    # Создаём папку, если её нет
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)

    # Читаем изображение (обход проблемы кириллицы)
    try:
        with open(input_path, "rb") as f:
            file_bytes = np.asarray(bytearray(f.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"❌ Ошибка чтения файла: {e}")
        return

    if image is None:
        print("❌ OpenCV не смог открыть изображение!")
        return

    print("✅ Файл успешно загружен!")

    # Конвертация в RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Диапазоны цветов для удаления
    lower_ws = np.array([223, 226, 225])  # Самый тёмный водяной знак
    upper_ws = np.array([245, 248, 247])  # Самый светлый водяной знак
    lower_bg = np.array([250, 250, 250])  # Белый фон
    upper_bg = np.array([255, 255, 255])

    # Создание масок
    watermark_mask = cv2.inRange(image, lower_ws, upper_ws)
    background_mask = cv2.inRange(image, lower_bg, upper_bg)
    full_mask = cv2.bitwise_or(watermark_mask, background_mask)

    # Удаление водяного знака
    image[full_mask > 0] = [255, 255, 255]

    # Конвертация обратно в BGR
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    # Кодируем в память и сохраняем вручную (обход проблемы кириллицы)
    try:
        success, encoded_image = cv2.imencode(".webp", image)
        if success:
            with open(output_path, "wb") as f:
                f.write(encoded_image.tobytes())
            print(f"✅ Файл успешно сохранён: {output_path}")
        else:
            print("❌ OpenCV не смог закодировать изображение.")
    except Exception as e:
        print(f"❌ Ошибка при сохранении файла: {e}")

def process_folder(input_folder, output_folder):
    """Рекурсивно обходит папку, обрабатывая все изображения."""
    for root, _, files in os.walk(input_folder):
        relative_path = os.path.relpath(root, input_folder)
        output_dir = os.path.join(output_folder, relative_path)
        os.makedirs(output_dir, exist_ok=True)

        for file in files:
            if file.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                input_path = os.path.join(root, file)
                output_path = os.path.join(output_dir, file)
                process_image(input_path, output_path)

if __name__ == "__main__":
    input_folder = "images"  # Исходная папка
    output_folder = "output_images"  # Папка для сохранения обработанных файлов
    process_folder(input_folder, output_folder)
    print("✅ Обработка завершена!")
