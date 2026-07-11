# -*- coding: utf-8 -*-
"""
Этап 0: диф ассортимента с сайтом-источником.

Собирает список категорий и моделей источника (requests, без Selenium),
сравнивает с нашей БД по URL (models.image_path хранит URL источника)
и пишет отчёт + JSON для следующих этапов.

Запуск: python -X utf8 00_diff.py
Выход:  data/source_models.json, data/diff_report.json + отчёт в stdout
"""

import json
import os
import re
import sys
import time

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'https://servismakita.ru'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36'}
DELAY = 0.5  # вежливая пауза между запросами
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

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


def page_title(html: str, fallback: str) -> str:
    m = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
    return m.group(1).strip() if m else fallback


def parse_source():
    """
    Категории и модели источника. Структура: /catalog/<cat>/<model>/
    ИЛИ /catalog/<cat>/<subcat>/<model>/. На странице категории лежат
    ссылки на её прямых детей (либо модели, либо подкатегории).

    Классификация ребёнка: слаг без цифр — кандидат в подкатегории,
    проверяем фетчем (внутри есть ссылки 3-го уровня → подкатегория,
    иначе это модель). Слаги моделей всегда содержат цифры (dpc6201...).
    """
    html = get(f'{BASE}/catalog/')
    cat_slugs = sorted(set(re.findall(r'href="/catalog/([a-z0-9_-]+)/"', html)))
    cat_slugs = [c for c in cat_slugs if c not in ('2',)]  # мусорный тестовый раздел
    print(f'Категорий на источнике: {len(cat_slugs)}')

    source = {}
    for i, cat in enumerate(cat_slugs, 1):
        cat_html = get(f'{BASE}/catalog/{cat}/')
        children = sorted(set(re.findall(rf'href="/catalog/{cat}/([a-z0-9_-]+)/"', cat_html)))
        cat_title = page_title(cat_html, cat)

        models = {}       # slug -> url (модели прямо в категории)
        subcat_count = 0
        for child in children:
            if re.search(r'\d', child):
                models[child] = f'{BASE}/catalog/{cat}/{child}/'
                continue
            # кандидат в подкатегории — проверяем содержимое
            child_html = get(f'{BASE}/catalog/{cat}/{child}/')
            l3 = sorted(set(re.findall(rf'href="/catalog/{cat}/{child}/([a-z0-9_-]+)/"', child_html)))
            if l3:
                subcat_count += 1
                sub_title = page_title(child_html, child)
                source[f'{cat}/{child}'] = {
                    'title': sub_title,
                    'models': {s: f'{BASE}/catalog/{cat}/{child}/{s}/' for s in l3},
                }
            else:
                models[child] = f'{BASE}/catalog/{cat}/{child}/'

        if models:
            source[cat] = {'title': cat_title, 'models': models}
        print(f'  [{i}/{len(cat_slugs)}] {cat} ({cat_title}): '
              f'{len(models)} моделей, {subcat_count} подкатегорий')
    return source


def load_our_models():
    """Наши модели: множество нормализованных URL источника."""
    conn = psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
    )
    cur = conn.cursor()
    cur.execute('SELECT id, name, image_path FROM models')
    rows = cur.fetchall()
    conn.close()

    by_url = {}
    for mid, name, url in rows:
        norm = (url or '').strip().rstrip('/') + '/'
        by_url[norm] = {'id': mid, 'name': name}
    return by_url


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    source = parse_source()
    ours = load_our_models()

    src_urls = {}
    for cat, info in source.items():
        for slug, url in info['models'].items():
            src_urls[url] = {'category': cat, 'category_title': info['title'], 'slug': slug}

    new_models = {u: v for u, v in src_urls.items() if u not in ours}
    gone_models = {u: v for u, v in ours.items() if u not in src_urls}

    print()
    print('=' * 60)
    print(f'На источнике моделей: {len(src_urls)}')
    print(f'В нашей БД моделей:   {len(ours)}')
    print(f'НОВЫХ (нет у нас):    {len(new_models)}')
    print(f'Исчезло с источника:  {len(gone_models)} (у нас остаются, не трогаем)')
    print('=' * 60)

    if new_models:
        from collections import Counter
        by_cat = Counter(v['category_title'] for v in new_models.values())
        print('\nНовые по категориям:')
        for cat, cnt in by_cat.most_common():
            print(f'  {cat}: {cnt}')
        print('\nПримеры новых:')
        for u in list(new_models)[:15]:
            print(f'  {u}')

    with open(os.path.join(DATA_DIR, 'source_models.json'), 'w', encoding='utf-8') as f:
        json.dump(source, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA_DIR, 'diff_report.json'), 'w', encoding='utf-8') as f:
        json.dump(
            {
                'new': new_models,
                'gone': {u: v['name'] for u, v in gone_models.items()},
            },
            f, ensure_ascii=False, indent=1,
        )
    print(f'\nСохранено: data/source_models.json, data/diff_report.json')


if __name__ == '__main__':
    main()
