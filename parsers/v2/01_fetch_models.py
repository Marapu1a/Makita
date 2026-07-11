# -*- coding: utf-8 -*-
"""
Этап 1: выгрузка данных новых моделей (по списку из 00_diff.py).

Для каждой новой модели забирает страницу и сохраняет в data/models/*.json:
  - имя модели (из H1), категория (из дифа)
  - таблица деталей: позиция, артикул, название, количество у источника
  - window.schemas — ID схем для этапа 2

Идемпотентен: уже выгруженные модели пропускаются (resume после обрыва).
Запуск: python -X utf8 01_fetch_models.py [--limit N]
"""

import argparse
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36'}
DELAY = 0.6
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
MODELS_DIR = os.path.join(DATA_DIR, 'models')

session = requests.Session()
session.headers.update(HEADERS)


def get(url: str) -> str:
    last_err = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            time.sleep(DELAY)
            return r.text
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise last_err


def parse_model_page(html: str):
    soup = BeautifulSoup(html, 'html.parser')

    # Имя модели: «Запчасти для бензореза Makita DPC6201» → DPC6201
    h1 = soup.find('h1')
    h1_text = h1.get_text(strip=True) if h1 else ''
    m = re.search(r'Makita\s+(.+)$', h1_text)
    name = m.group(1).strip() if m else None

    # Таблица деталей
    parts = []
    for row in soup.select('tr.componentListSingle'):
        tds = row.find_all('td')
        if len(tds) < 3:
            continue
        pos_raw = row.get('data-pos') or tds[0].get_text(strip=True)
        try:
            pos = int(pos_raw)
        except (TypeError, ValueError):
            pos = -1
        article = (row.get('data-tbl-article') or tds[1].get_text(strip=True)).strip()
        if not article:
            continue
        parts.append({
            'pos': pos,
            'article': article,
            'name': tds[2].get_text(strip=True) or None,
            'source_quantity': row.get('data-quantity') or None,
        })

    # ID схем
    m = re.search(r'window\.schemas\s*=\s*(\[[^\]]*\])', html)
    schemas = json.loads(m.group(1).replace("'", '"')) if m else []

    return name, parts, schemas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='обработать только первые N (для теста)')
    args = ap.parse_args()

    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, 'diff_report.json'), encoding='utf-8') as f:
        new_models = json.load(f)['new']

    items = sorted(new_models.items())
    if args.limit:
        items = items[: args.limit]

    done = skipped = failed = 0
    for i, (url, info) in enumerate(items, 1):
        key = f"{info['category'].replace('/', '__')}__{info['slug']}"
        out_path = os.path.join(MODELS_DIR, f'{key}.json')
        if os.path.exists(out_path):
            skipped += 1
            continue

        try:
            html = get(url)
            name, parts, schemas = parse_model_page(html)
        except Exception as e:
            print(f'  [{i}/{len(items)}] ОШИБКА {url}: {e}')
            failed += 1
            continue

        if not name:
            name = info['slug'].upper()
        record = {
            'url': url,
            'name': name,
            'category_path': info['category'],
            'category_title': info['category_title'],
            'slug': info['slug'],
            'schemas': schemas,
            'parts': parts,
        }
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(record, f, ensure_ascii=False, indent=1)
        done += 1
        print(f'  [{i}/{len(items)}] {name}: {len(parts)} деталей, {len(schemas)} схем')

    print(f'\nГотово: {done}, пропущено (уже были): {skipped}, ошибок: {failed}')


if __name__ == '__main__':
    main()
