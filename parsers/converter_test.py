import os
from PIL import Image

FOLDER = "D:\\sites\\makita-parts\\frontend\\public\\images\\categories"

formats = {}

for file in os.listdir(FOLDER):
    if file.lower().endswith((".webp", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif")):
        file_path = os.path.join(FOLDER, file)
        try:
            with Image.open(file_path) as img:
                real_format = img.format
                formats[real_format] = formats.get(real_format, 0) + 1
        except Exception as e:
            print(f"Ошибка с файлом {file}: {e}")

print("Реальные форматы файлов:")
for fmt, count in formats.items():
    print(f"{fmt}: {count}")
