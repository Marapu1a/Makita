import os
from PIL import Image
from tqdm import tqdm

# === Папка с изображениями ===
FOLDER = r"D:\sites\makita-parts\frontend\parsers\images"

def convert_images_to_webp(folder):
    for root, _, files in os.walk(folder):
        if not files:
            continue  # Пропускаем пустые папки

        folder_name = os.path.basename(root)  # Берём только название текущей папки
        processed = 0
        skipped = 0

        print(f"\n📂 Обрабатываем папку: {folder_name} ({len(files)} файлов)")

        for file in tqdm(files, desc=f"Конвертация {folder_name}", leave=False):
            file_path = os.path.join(root, file)

            # Пропускаем SVG
            if file.lower().endswith(".svg"):
                skipped += 1
                continue

            # Конвертируем и перезаписываем файл
            try:
                with Image.open(file_path) as img:
                    img.save(file_path, "WEBP", quality=70, method=6)  # Перезапись в WebP
                    processed += 1
            except Exception as e:
                print(f"❌ Ошибка с файлом {file}: {e}")
                skipped += 1

        print(f"✅ {folder_name}: обработано {processed}, пропущено {skipped}")

convert_images_to_webp(FOLDER)
print("\n🎉 Все изображения (кроме SVG) конвертированы в WebP!")
