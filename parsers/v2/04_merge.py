# -*- coding: utf-8 -*-
"""
Этап 4: merge новых моделей в нормализованную БД (models/slides/parts/diagram_parts).

Правила:
  - существующие детали НЕ трогаются (ON CONFLICT DO NOTHING по артикулу);
    новые заводятся с price=0, availability=false — цены придут из прайсов
  - модель с уже существующим именем пропускается (отчёт)
  - пустышки источника (один артикул 999999-9) пропускаются
  - слайды: image_path=<MODEL>_<n>.webp, размеры из схемы; has_svg=true
    для слайдов с интерактивным оверлеем
  - привязка деталей к слайдам:
      div-слайд  → координаты зон
      svg-слайд  → детали из zone_numbers, координаты NULL
      остальные  → первый слайд модели, координаты NULL (таблица видна,
                   интерактива нет — как у статичных слайдов источника)
После merge запустить: generate_slugs.py и generate_seo.py.

Запуск: python -X utf8 04_merge.py [--dry-run] [--only <slug>]
"""

import argparse
import json
import os
import re
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

V2_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(V2_DIR, 'data')
MODELS_DIR = os.path.join(DATA_DIR, 'models')
SCHEMAS_DIR = os.path.join(DATA_DIR, 'schemas')

# тот же ручной маппинг, что в 03_build_assets
MANUAL_CATS = {
    'dyrokoly': 'Дыроколы',
    'generatory': 'Генераторы',
    'kompressory': 'Компрессоры',
    'podmetalnye-mashiny': 'Подметальные машины',
    'rajdery': 'Райдеры',
}


def sanitize(name: str) -> str:
    return re.sub(r'[\\/:"*?<>|]', '_', name)


def connect():
    return psycopg2.connect(
        dbname=os.environ['DB_NAME'], user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
    )


def category_mapping(cur):
    cur.execute("""
        SELECT m.image_path, c.name FROM models m JOIN categories c ON c.id = m.category_id
    """)
    counts = {}
    for url, cat_name in cur.fetchall():
        m = re.search(r'/catalog/(.+?)/[a-z0-9_-]+/?$', (url or '').strip())
        if m:
            counts.setdefault(m.group(1), {})
            counts[m.group(1)][cat_name] = counts[m.group(1)].get(cat_name, 0) + 1
    result = {slug: max(c, key=c.get) for slug, c in counts.items()}
    for k, v in MANUAL_CATS.items():
        result.setdefault(k, v)
    return result


def get_or_create_category(cur, name, dry):
    cur.execute('SELECT id FROM categories WHERE name = %s', (name,))
    row = cur.fetchone()
    if row:
        return row[0], False
    if dry:
        return -1, True
    cur.execute(
        'INSERT INTO categories (name, createdat, updatedat) VALUES (%s, NOW(), NOW()) RETURNING id',
        (name,),
    )
    return cur.fetchone()[0], True


def merge_model(cur, record, schema, cat_id, dry):
    """Возвращает статистику по модели или None (пропуск)."""
    name = record['name']
    parts = [p for p in record['parts'] if p['article'] and p['article'] != '999999-9']
    slides = schema['slides'] if schema else []
    if not parts and not slides:
        return None  # пустышка

    # модель с таким именем уже есть?
    cur.execute('SELECT id FROM models WHERE name = %s', (name,))
    if cur.fetchone():
        return 'name_exists'

    if dry:
        return {'parts': len(parts), 'slides': len(slides), 'new_parts': '?'}

    cur.execute("""
        INSERT INTO models (name, image_path, category_id, createdat, updatedat)
        VALUES (%s, %s, %s, NOW(), NOW()) RETURNING id
    """, (name, record['url'], cat_id))
    model_id = cur.fetchone()[0]

    # слайды
    slide_ids = {}       # slide_number -> id
    number_to_slide = {} # номер позиции -> (slide_id, координаты|None)
    model_fs = sanitize(name)
    for s in slides:
        has_overlay = s['type'] == 'svg' and bool(s.get('files', {}).get('overlay'))
        cur.execute("""
            INSERT INTO slides (model_id, slide_number, image_path, image_width, image_height,
                                has_svg, createdat, updatedat)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (model_id, slide_number) DO UPDATE SET image_path = EXCLUDED.image_path
            RETURNING id
        """, (model_id, s['slide_number'], f"{model_fs}_{s['slide_number']}.webp",
              s.get('width'), s.get('height'), has_overlay))
        sid = cur.fetchone()[0]
        slide_ids[s['slide_number']] = sid

        if s['type'] == 'div':
            for z in s.get('zones', []):
                number_to_slide.setdefault(z['number'], (sid, z))
        elif has_overlay:
            for num in s.get('zone_numbers', []):
                number_to_slide.setdefault(num, (sid, None))

    first_slide_id = slide_ids.get(min(slide_ids)) if slide_ids else None

    # физические детали + вхождения
    new_parts = 0
    for p in parts:
        cur.execute("""
            INSERT INTO parts (part_number, name, price, availability, quantity, created_at)
            VALUES (%s, %s, 0, FALSE, 0, NOW())
            ON CONFLICT (part_number) DO NOTHING
        """, (p['article'], p['name']))
        new_parts += cur.rowcount
        cur.execute('SELECT id FROM parts WHERE part_number = %s', (p['article'],))
        part_id = cur.fetchone()[0]

        sid, zone = number_to_slide.get(p['pos'], (first_slide_id, None))
        cur.execute("""
            INSERT INTO diagram_parts (model_id, part_id, slide_id, number,
                                       x_coord, y_coord, width, height, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (model_id, number) DO NOTHING
        """, (
            model_id, part_id, sid, p['pos'],
            zone['x'] if zone else None, zone['y'] if zone else None,
            zone['w'] if zone else None, zone['h'] if zone else None,
        ))

    return {'parts': len(parts), 'slides': len(slides), 'new_parts': new_parts}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', help='обработать только модель с этим slug')
    args = ap.parse_args()

    conn = connect()
    cur = conn.cursor()
    cat_map = category_mapping(cur)

    stats = {'merged': 0, 'stub': 0, 'name_exists': 0, 'no_cat': 0,
             'parts_total': 0, 'parts_new': 0, 'new_cats': set()}

    for fname in sorted(os.listdir(MODELS_DIR)):
        if not fname.endswith('.json'):
            continue
        with open(os.path.join(MODELS_DIR, fname), encoding='utf-8') as f:
            record = json.load(f)
        if args.only and record['slug'] != args.only:
            continue

        schema_path = os.path.join(SCHEMAS_DIR, fname)
        schema = None
        if os.path.exists(schema_path):
            with open(schema_path, encoding='utf-8') as f:
                schema = json.load(f)

        cat_name = cat_map.get(record['category_path'])
        if not cat_name:
            stats['no_cat'] += 1
            print(f"  ⚠️ {record['name']}: нет маппинга категории {record['category_path']}")
            continue

        cat_id, created = get_or_create_category(cur, cat_name, args.dry_run)
        if created:
            stats['new_cats'].add(cat_name)

        result = merge_model(cur, record, schema, cat_id, args.dry_run)
        if result is None:
            stats['stub'] += 1
            conn.rollback() if args.dry_run else conn.commit()
            continue
        if result == 'name_exists':
            stats['name_exists'] += 1
            print(f"  ⚠️ {record['name']}: модель с таким именем уже есть — пропуск")
            conn.rollback()
            continue

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
        stats['merged'] += 1
        stats['parts_total'] += result['parts']
        if result['new_parts'] != '?':
            stats['parts_new'] += result['new_parts']
        print(f"  ✅ {record['name']} → {cat_name}: {result['slides']} слайдов, "
              f"{result['parts']} деталей (новых артикулов: {result['new_parts']})")

    cur.close()
    conn.close()

    print('\n' + '=' * 60)
    mode = 'DRY-RUN (ничего не записано)' if args.dry_run else 'ЗАПИСАНО'
    print(f'{mode}: моделей {stats["merged"]}, пустышек {stats["stub"]}, '
          f'конфликтов имён {stats["name_exists"]}, без категории {stats["no_cat"]}')
    print(f'Строк деталей: {stats["parts_total"]}, новых артикулов: {stats["parts_new"]}')
    if stats['new_cats']:
        print(f'Новые категории: {sorted(stats["new_cats"])}')
    if not args.dry_run:
        print('\nДальше: python -X utf8 ../generate_slugs.py && python -X utf8 ../generate_seo.py')


if __name__ == '__main__':
    main()
