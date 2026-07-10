"""
generate_seo.py — заполнение SEO-полей (seo_title, seo_description, h1, content)
для categories и models по шаблонам с данными из БД.

Запуск: python -X utf8 generate_seo.py [--dry-run] [--only categories|models]
Идемпотентен: обновляет только строки, где seo_title IS NULL.
"""

import os
import argparse
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def plural(n: int, one: str, few: str, many: str) -> str:
    """Русское склонение: 1 деталь, 2 детали, 5 деталей."""
    if n % 100 in (11, 12, 13, 14):
        return many
    if n % 10 == 1:
        return one
    if n % 10 in (2, 3, 4):
        return few
    return many


def category_seo(name: str, model_count: int):
    models_word = plural(model_count, 'модели', 'моделей', 'моделей')
    seo_title = f'{name} Makita — запчасти и взрыв-схемы для {model_count} {models_word}'
    seo_description = (
        f'Оригинальные запчасти Makita для категории «{name}»: '
        f'взрыв-схемы {model_count} {models_word}, артикулы, актуальные цены и наличие. '
        f'Заказ онлайн, доставка по Москве и России. ☎ +7 (495) 215-02-99'
    )
    return seo_title, seo_description


def model_seo(name: str, category: str, slide_count: int, part_count: int):
    parts_word = plural(part_count, 'деталь', 'детали', 'деталей')
    slides_word = plural(slide_count, 'взрыв-схема', 'взрыв-схемы', 'взрыв-схем')

    seo_title = f'Запчасти для Makita {name} — взрыв-схема и {part_count} {parts_word} с ценами'
    seo_description = (
        f'Каталог запчастей Makita {name} ({category}): '
        f'{slide_count} {slides_word}, {part_count} оригинальных {plural(part_count, "детали", "деталей", "деталей")} '
        f'с артикулами, ценами и наличием. Заказ онлайн, доставка по всей России.'
    )
    h1 = f'Запчасти для Makita {name}'
    content = (
        f'<p>Инструмент <strong>Makita {name}</strong> относится к категории «{category}». '
        f'В каталоге представлено {slide_count} {slides_word} и {part_count} оригинальных '
        f'{plural(part_count, "детали", "деталей", "деталей")} с артикулами производителя.</p>'
        f'<p>Наведите курсор на номер детали на схеме — она подсветится в таблице, и наоборот. '
        f'Для заказа добавьте нужные позиции в корзину или свяжитесь с нами по телефону '
        f'+7 (495) 215-02-99. Все запчасти оригинальные, цены и наличие актуальны.</p>'
    )
    return seo_title, seo_description, h1, content


def run(dry_run: bool, only: str | None):
    conn = psycopg2.connect(
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
    )
    cur = conn.cursor()

    # --- Categories ---
    if not only or only == 'categories':
        cur.execute("""
            SELECT c.id, c.name,
                   (SELECT COUNT(*) FROM models m WHERE m.category_id = c.id)
                   + (SELECT COUNT(*) FROM models m JOIN categories ch ON m.category_id = ch.id
                      WHERE ch.parent_id = c.id) AS model_count
            FROM categories c
            WHERE c.seo_title IS NULL
            ORDER BY c.id
        """)
        rows = cur.fetchall()
        for cid, name, model_count in rows:
            seo_title, seo_description = category_seo(name, model_count)
            if not dry_run:
                cur.execute(
                    "UPDATE categories SET seo_title=%s, seo_description=%s WHERE id=%s",
                    (seo_title, seo_description, cid),
                )
        if not dry_run:
            conn.commit()
        print(f"categories: {len(rows)} {'(dry-run)' if dry_run else 'updated'}")

    # --- Models ---
    if not only or only == 'models':
        cur.execute("""
            SELECT m.id, m.name, c.name,
                   (SELECT COUNT(*) FROM slides s WHERE s.model_id = m.id),
                   (SELECT COUNT(DISTINCT p.part_number) FROM parts p WHERE p.model_id = m.id)
            FROM models m
            JOIN categories c ON c.id = m.category_id
            WHERE m.seo_title IS NULL
            ORDER BY m.id
        """)
        rows = cur.fetchall()
        for mid, name, category, slide_count, part_count in rows:
            seo_title, seo_description, h1, content = model_seo(name, category, slide_count, part_count)
            if not dry_run:
                cur.execute(
                    "UPDATE models SET seo_title=%s, seo_description=%s, h1=%s, content=%s WHERE id=%s",
                    (seo_title, seo_description, h1, content, mid),
                )
        if not dry_run:
            conn.commit()
        print(f"models: {len(rows)} {'(dry-run)' if dry_run else 'updated'}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", choices=["categories", "models"])
    args = parser.parse_args()
    run(dry_run=args.dry_run, only=args.only)
