# -*- coding: utf-8 -*-
"""
Этап 3: сборка ассетов для сайта — БЕЗ изменений фронтенда.
Новый формат источника конвертируется в наш существующий:

  - draw.svg      → рендер-манифест для render_svg.mjs → <MODEL>_<n>.webp
  - layer2 svg    → оверлей в СТАРОМ формате (<use xlink:href="#refN">) → <MODEL>_<n>.svg
  - div-слайды    → полноразмерный jpg, чистка водяного знака (порог яркости), webp

Всё складывается в data/out_images/<Категория>/<MODEL>/ —
структура 1:1 как /var/www/makita-public/images на проде.

Категория берётся маппингом slug источника → наша категория (по URL моделей в БД).
Запуск:
  1) python -X utf8 03_build_assets.py        — оверлеи, jpg, манифест
  2) node render_svg.mjs data/render_manifest.json — растеризация
"""

import io
import json
import os
import re
import sys
import time

import psycopg2
import requests
from dotenv import load_dotenv
from PIL import Image

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://servismakita.ru'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36'}
DELAY = 0.6
RENDER_WIDTH = 1600  # ширина растеризации svg-рисунков (2x+ к старым 700px)
WM_THRESHOLD = 200   # порог чистки водяного знака: светлее — в белый

V2_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(V2_DIR, 'data')
MODELS_DIR = os.path.join(DATA_DIR, 'models')
SCHEMAS_DIR = os.path.join(DATA_DIR, 'schemas')
FILES_DIR = os.path.join(SCHEMAS_DIR, 'files')
OUT_DIR = os.path.join(DATA_DIR, 'out_images')

session = requests.Session()
session.headers.update(HEADERS)


def sanitize(name: str) -> str:
    return re.sub(r'[\\/:"*?<>|]', '_', name)


def category_mapping():
    """slug источника → имя нашей категории (по URL существующих моделей)."""
    conn = psycopg2.connect(
        dbname=os.environ['DB_NAME'], user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
    )
    cur = conn.cursor()
    cur.execute("""
        SELECT m.image_path, c.name FROM models m JOIN categories c ON c.id = m.category_id
    """)
    mapping = {}
    for url, cat_name in cur.fetchall():
        m = re.search(r'/catalog/(.+?)/[a-z0-9_-]+/?$', (url or '').strip())
        if m:
            mapping.setdefault(m.group(1), {})
            mapping[m.group(1)][cat_name] = mapping[m.group(1)].get(cat_name, 0) + 1
    conn.close()
    # для каждого slug — самая частая категория
    result = {slug: max(cats, key=cats.get) for slug, cats in mapping.items()}
    # ручной маппинг: модели этих категорий заводились вручную без URL источника,
    # «Подметальные машины» — новая категория (создастся на этапе merge)
    result.setdefault('dyrokoly', 'Дыроколы')
    result.setdefault('generatory', 'Генераторы')
    result.setdefault('kompressory', 'Компрессоры')
    result.setdefault('podmetalnye-mashiny', 'Подметальные машины')
    result.setdefault('rajdery', 'Райдеры')
    return result


# ─── Конвертация оверлея в старый формат ────────────────────

# у зон в layer2 номер лежит в data-id (не в id!)
ZONE_PATH = re.compile(r'<path([^>]*?)\bdata-id="(\d+)"([^>]*?)/>')
SVG_ROOT = re.compile(r'<svg[^>]*>', re.IGNORECASE)


def convert_overlay(overlay_svg: str) -> str:
    """
    layer2 (path id="N") → старый формат: <defs><path id="refN"…></defs>
    + <use xlink:href="#refN" style="opacity:0"> на каждую зону.
    Текстовые метки (номера) отбрасываются — они нарисованы в фоне.
    """
    root_m = SVG_ROOT.search(overlay_svg)
    root_tag = root_m.group(0)
    # xlink-неймспейс обязателен для старого формата
    if 'xmlns:xlink' not in root_tag:
        root_tag = root_tag.replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ', 1)

    defs, uses = [], []
    for m in ZONE_PATH.finditer(overlay_svg):
        pre, num, post = m.groups()
        # data-id="N" превращается в честный id="refN" — на него ссылается <use>
        defs.append(f'<path{pre}id="ref{num}"{post}/>')
        uses.append(
            f'<use xlink:href="#ref{num}" '
            f'style="overflow:visible;opacity:0;fill:rgba(0,0,0,0)"/>'
        )

    return (
        root_tag
        + '<defs>' + ''.join(defs) + '</defs>'
        + ''.join(uses)
        + '</svg>'
    )


# ─── Чистка водяного знака ──────────────────────────────────

def clean_watermark(jpg_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(jpg_bytes)).convert('L')
    return img.point(lambda p: 255 if p > WM_THRESHOLD else p)


def download(url: str) -> bytes:
    last_err = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=60)
            r.raise_for_status()
            time.sleep(DELAY)
            return r.content
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise last_err


def main():
    cat_map = category_mapping()
    manifest = []
    stats = {'svg': 0, 'div': 0, 'skipped_cat': 0}
    unmapped = set()

    for fname in sorted(os.listdir(SCHEMAS_DIR)):
        if not fname.endswith('.json'):
            continue
        with open(os.path.join(SCHEMAS_DIR, fname), encoding='utf-8') as f:
            schema = json.load(f)
        if not schema['slides']:
            continue
        with open(os.path.join(MODELS_DIR, fname), encoding='utf-8') as f:
            record = json.load(f)

        # категория: slug источника ('bolgarki' или 'dreli/miksery') → наша
        src_cat = record['category_path']
        our_cat = cat_map.get(src_cat)
        if not our_cat:
            unmapped.add(f"{src_cat} ({record['category_title']})")
            stats['skipped_cat'] += 1
            continue

        model = sanitize(record['name'])
        out_folder = os.path.join(OUT_DIR, sanitize(our_cat), model)
        os.makedirs(out_folder, exist_ok=True)

        for slide in schema['slides']:
            n = slide['slide_number']
            webp_path = os.path.join(out_folder, f'{model}_{n}.webp')

            if slide['type'] == 'svg':
                draw = slide['files'].get('drawing')
                overlay = slide['files'].get('overlay')
                if draw and not os.path.exists(webp_path):
                    manifest.append({
                        'svg': os.path.join(FILES_DIR, draw),
                        'out': webp_path,
                        'width': RENDER_WIDTH,
                    })
                if overlay:
                    with open(os.path.join(FILES_DIR, overlay), encoding='utf-8') as f:
                        converted = convert_overlay(f.read())
                    with open(os.path.join(out_folder, f'{model}_{n}.svg'), 'w', encoding='utf-8') as f:
                        f.write(converted)
                stats['svg'] += 1

            elif slide['type'] == 'div':
                if not os.path.exists(webp_path):
                    # полноразмер: убираем _small из URL, при 404 берём _small
                    url_full = slide['image_url'].replace('_small', '')
                    try:
                        raw = download(url_full)
                    except Exception:
                        raw = download(slide['image_url'])
                    img = clean_watermark(raw)
                    img.save(webp_path, 'WEBP', quality=82, method=6)
                stats['div'] += 1

        print(f'  {record["name"]} → {our_cat}: {len(schema["slides"])} слайдов')

    with open(os.path.join(DATA_DIR, 'render_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    print(f'\nОверлеев+div обработано: svg={stats["svg"]}, div={stats["div"]}')
    print(f'В рендер-манифесте svg-рисунков: {len(manifest)}')
    if unmapped:
        print(f'\n⚠️ Без маппинга категории (пропущены): {sorted(unmapped)}')
    print('\nДальше: node render_svg.mjs data/render_manifest.json')


if __name__ == '__main__':
    main()
