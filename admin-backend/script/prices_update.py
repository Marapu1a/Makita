# -*- coding: utf-8 -*-
"""
prices_update.py — обновление цен и наличия из двух файлов:

  1. result.xlsx (лист «обновление цен и наличия») — основной источник:
     Артикул | доступно (наличие) Y/пусто | доступно (кол-во) | цена со скидками
  2. makita_site_update.xlsx (лист «Для импорта») — выгрузка центрального сайта,
     применяется ПОВЕРХ первого (опционален): Артикул | Количество | Цена

Детали, отсутствующие в обоих файлах, не трогаются.
После успешного прогона файлы уезжают в backups/ с таймстампом.
Подключение к БД — из переменных окружения (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT).
"""

import os
import sys
import datetime

import pandas as pd
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(SCRIPT_DIR, 'backups')
RESULT_PATH = os.path.join(SCRIPT_DIR, 'result.xlsx')
SITE_PATH = os.path.join(SCRIPT_DIR, 'makita_site_update.xlsx')


def load_result(path):
    """result.xlsx → [(part_number, price|None, availability, quantity)]"""
    df = pd.read_excel(path, sheet_name='обновление цен и наличия')
    required = ['Артикул', 'доступно (наличие)', 'доступно (кол-во)', 'цена со скидками']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f'result.xlsx: нет колонок {missing}. Есть: {list(df.columns)}')

    rows = []
    for _, r in df.iterrows():
        pn = str(r['Артикул']).strip() if pd.notna(r['Артикул']) else ''
        if not pn:
            continue
        price = float(r['цена со скидками']) if pd.notna(r['цена со скидками']) else None
        if price is not None and price <= 0:
            price = None  # нулевую цену не льём — оставляем старую
        availability = str(r['доступно (наличие)']).strip().upper() == 'Y' if pd.notna(r['доступно (наличие)']) else False
        qty = int(r['доступно (кол-во)']) if pd.notna(r['доступно (кол-во)']) else 0
        rows.append((pn, price, availability, qty))
    return rows


def load_site(path):
    """makita_site_update.xlsx → [(part_number, price|None, availability, quantity)]"""
    df = pd.read_excel(path, sheet_name='Для импорта')
    required = ['Артикул', 'Количество', 'Цена']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f'makita_site_update.xlsx: нет колонок {missing}. Есть: {list(df.columns)}')

    rows = []
    for _, r in df.iterrows():
        pn = str(r['Артикул']).strip() if pd.notna(r['Артикул']) else ''
        if not pn:
            continue
        price = float(r['Цена']) if pd.notna(r['Цена']) else None
        if price is not None and price <= 0:
            price = None
        qty = int(r['Количество']) if pd.notna(r['Количество']) else 0
        rows.append((pn, price, qty > 0, qty))
    return rows


def apply_rows(cur, rows, label):
    """Bulk-апдейт через временную таблицу. Возвращает (строк в файле, обновлено в БД)."""
    cur.execute("""
        CREATE TEMP TABLE _price_import (
            part_number  VARCHAR PRIMARY KEY,
            price        DOUBLE PRECISION,
            availability BOOLEAN,
            quantity     INTEGER
        ) ON COMMIT DROP
    """)
    # дубли артикулов в файле: последняя строка побеждает
    cur.executemany(
        """INSERT INTO _price_import (part_number, price, availability, quantity)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (part_number) DO UPDATE
           SET price = EXCLUDED.price, availability = EXCLUDED.availability, quantity = EXCLUDED.quantity""",
        rows,
    )
    cur.execute("""
        UPDATE parts p
        SET price        = COALESCE(i.price, p.price),
            availability = i.availability,
            quantity     = i.quantity,
            updated_at   = NOW()
        FROM _price_import i
        WHERE p.part_number = i.part_number
    """)
    updated = cur.rowcount
    print(f'{label}: строк в файле {len(rows)}, обновлено деталей в БД: {updated}, '
          f'не найдено в базе: {len(rows) - updated}')
    return updated


def archive(path):
    if not os.path.exists(path):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M')
    dest = os.path.join(BACKUP_DIR, f'{ts}_{os.path.basename(path)}')
    os.replace(path, dest)


def main():
    if not os.path.exists(RESULT_PATH):
        print('ОШИБКА: файл result.xlsx не загружен', file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(
        dbname=os.environ.get('DB_NAME', 'makita'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ['DB_PASSWORD'],
        host=os.environ.get('DB_HOST', 'db'),
        port=os.environ.get('DB_PORT', '5432'),
    )
    cur = conn.cursor()
    cur.execute('SELECT NOW()')
    started_at = cur.fetchone()[0]

    # 1. Основной источник
    result_rows = load_result(RESULT_PATH)
    apply_rows(cur, result_rows, 'result.xlsx')
    conn.commit()

    # 2. Выгрузка центрального сайта — поверх
    if os.path.exists(SITE_PATH):
        site_rows = load_site(SITE_PATH)
        apply_rows(cur, site_rows, 'makita_site_update.xlsx (поверх)')
        conn.commit()
    else:
        print('makita_site_update.xlsx: не загружен, шаг пропущен')

    # Итог: сколько уникальных деталей затронуто этим прогоном
    cur.execute('SELECT COUNT(*) FROM parts WHERE updated_at >= %s', (started_at,))
    total = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM parts')
    all_parts = cur.fetchone()[0]
    print(f'ИТОГО: обновлено {total} из {all_parts} деталей каталога')

    cur.close()
    conn.close()

    archive(RESULT_PATH)
    archive(SITE_PATH)
    print('Файлы перемещены в backups/. Готово.')


if __name__ == '__main__':
    main()
