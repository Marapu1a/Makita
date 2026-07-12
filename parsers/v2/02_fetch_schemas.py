# -*- coding: utf-8 -*-
"""
Этап 2: выгрузка схем (слайдов) для новых моделей через ajax-эндпоинт источника.

Для каждой модели из data/models/*.json дёргает
ajax.php?isAjax=Y&schemas=[...] и разбирает слайды:

  - DIV-режим: главная картинка /drafts/*.jpg + зоны-контуры
    div[item=fx_draft_i__N] (координаты из margin-left/top, размеры из <img>,
    артикул из класса fx_draft__<артикул>)
  - SVG-режим (новый формат источника): два <svg> — layer2 (интерактив,
    элементы с id=N) и рисунок; оба сохраняются в файлы
  - пустые схемы (id='0') пропускаются

Выход: data/schemas/<key>.json + data/schemas/files/<MODEL>_<n>_*.svg
Идемпотентен: готовые json пропускаются.
Запуск: python -X utf8 02_fetch_schemas.py [--limit N]
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse

import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://servismakita.ru'
AJAX = f'{BASE}/local/templates/MakitaServis/components/bitrix/catalog.section/.default/ajax.php'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36'}
DELAY = 0.6
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MODELS_DIR = os.path.join(DATA_DIR, 'models')
SCHEMAS_DIR = os.path.join(DATA_DIR, 'schemas')
FILES_DIR = os.path.join(SCHEMAS_DIR, 'files')

session = requests.Session()
session.headers.update(HEADERS)


def get(url: str) -> str:
    last_err = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=60)
            r.raise_for_status()
            time.sleep(DELAY)
            return r.text
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise last_err


STYLE_ML = re.compile(r'margin-left:\s*(-?[\d.]+)px')
STYLE_MT = re.compile(r'margin-top:\s*(-?[\d.]+)px')


def parse_div_slide(slide):
    """Слайд с контурами: главная картинка + зоны."""
    main_img = None
    for img in slide.find_all('img'):
        src = img.get('src', '')
        if '/drafts/' in src:
            main_img = img
            break
    if main_img is None:
        return None

    zones = []
    for div in slide.select('div[item^="fx_draft_i__"]'):
        try:
            number = int(div['item'].replace('fx_draft_i__', ''))
        except ValueError:
            continue
        style = div.get('style', '')
        ml = STYLE_ML.search(style)
        mt = STYLE_MT.search(style)
        img = div.find('img')
        article = None
        for cls in div.get('class', []):
            if cls.startswith('fx_draft__'):
                article = cls.replace('fx_draft__', '')
        zones.append({
            'number': number,
            'article': article,
            'x': float(ml.group(1)) if ml else None,
            'y': float(mt.group(1)) if mt else None,
            'w': float(img['width']) if img and img.get('width') else None,
            'h': float(img['height']) if img and img.get('height') else None,
        })

    return {
        'type': 'div',
        'image_url': urllib.parse.urljoin(BASE, main_img['src']),
        'width': float(main_img.get('width') or 0) or None,
        'height': float(main_img.get('height') or 0) or None,
        'zones': zones,
    }


VIEWBOX = re.compile(r'viewBox="([\d. ]+)"', re.IGNORECASE)


def parse_svg_slide(slide_html: str, model_name: str, n: int):
    """Слайд с двумя svg: layer2 (интерактив) + рисунок."""
    svg_starts = [m.start() for m in re.finditer(r'<svg', slide_html)]
    svgs = []
    for s in svg_starts:
        e = slide_html.find('</svg>', s)
        if e == -1:
            continue
        svgs.append(slide_html[s:e + len('</svg>')])
    if not svgs:
        return None

    overlay = next((s for s in svgs if 'class="layer2"' in s[:300]), None)
    drawing = next((s for s in svgs if 'class="layer2"' not in s[:300]), None)

    vb = VIEWBOX.search(svgs[0])
    width = height = None
    if vb:
        parts = vb.group(1).split()
        if len(parts) == 4:
            width, height = float(parts[2]), float(parts[3])

    os.makedirs(FILES_DIR, exist_ok=True)
    files = {}
    safe = re.sub(r'[\\/:"*?<>|]', '_', model_name)
    if drawing:
        p = os.path.join(FILES_DIR, f'{safe}_{n}_draw.svg')
        with open(p, 'w', encoding='utf-8') as f:
            f.write(drawing)
        files['drawing'] = os.path.basename(p)
    if overlay:
        p = os.path.join(FILES_DIR, f'{safe}_{n}_overlay.svg')
        with open(p, 'w', encoding='utf-8') as f:
            f.write(overlay)
        files['overlay'] = os.path.basename(p)
        numbers = sorted({int(x) for x in re.findall(r'id="(\d+)"', overlay)})
    else:
        numbers = []

    return {
        'type': 'svg',
        'width': width,
        'height': height,
        'files': files,
        'zone_numbers': numbers,
    }


def fetch_model_schemas(record):
    ids = [s for s in record['schemas'] if s and s != '0']
    if not ids:
        return []

    q = urllib.parse.quote(json.dumps(ids, separators=(',', ':')))
    html = get(f'{AJAX}?isAjax=Y&schemas={q}')

    # Режем на слайды по сырому HTML: SVG нельзя пропускать через BS4 —
    # он приводит атрибуты к нижнему регистру (viewBox → viewbox),
    # а SVG-XML регистрозависим и ломается при рендере/растеризации.
    starts = [m.start() for m in re.finditer(r"<div class=['\"]swiper-slide['\"]", html)]
    chunks = [html[s:(starts[i + 1] if i + 1 < len(starts) else len(html))]
              for i, s in enumerate(starts)]

    slides = []
    for n, chunk in enumerate(chunks, 1):
        if '<svg' in chunk:
            parsed = parse_svg_slide(chunk, record['name'], n)
        else:
            parsed = parse_div_slide(BeautifulSoup(chunk, 'html.parser'))
        if parsed:
            parsed['slide_number'] = n
            slides.append(parsed)
    return slides


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    os.makedirs(SCHEMAS_DIR, exist_ok=True)
    files = sorted(os.listdir(MODELS_DIR))
    if args.limit:
        files = files[: args.limit]

    done = skipped = empty = failed = 0
    for i, fname in enumerate(files, 1):
        out_path = os.path.join(SCHEMAS_DIR, fname)
        if os.path.exists(out_path):
            skipped += 1
            continue
        with open(os.path.join(MODELS_DIR, fname), encoding='utf-8') as f:
            record = json.load(f)

        try:
            slides = fetch_model_schemas(record)
        except Exception as e:
            print(f'  [{i}/{len(files)}] ОШИБКА {record["name"]}: {e}')
            failed += 1
            continue

        if not slides:
            empty += 1
            # пустышку тоже фиксируем, чтобы resume её не дёргал заново
            slides = []
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump({'name': record['name'], 'slides': slides}, f, ensure_ascii=False, indent=1)
        done += 1

        kinds = {}
        for s in slides:
            kinds[s['type']] = kinds.get(s['type'], 0) + 1
        print(f'  [{i}/{len(files)}] {record["name"]}: {len(slides)} слайдов {kinds or "(пусто)"}')

    print(f'\nГотово: {done} (из них пустых: {empty}), пропущено: {skipped}, ошибок: {failed}')


if __name__ == '__main__':
    main()
