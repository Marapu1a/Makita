"""
generate_slugs.py — заполнение slug-колонок для categories, models, parts.
Запуск: python -X utf8 generate_slugs.py [--dry-run] [--only categories|models|parts]
Идемпотентен: обновляет только строки, где slug IS NULL.
"""

import re
import os
import sys
import argparse
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Транслитерация по ГОСТ 7.0.34
_TRANSLIT = {
    'а': 'a',  'б': 'b',  'в': 'v',  'г': 'g',  'д': 'd',
    'е': 'e',  'ё': 'yo', 'ж': 'zh', 'з': 'z',  'и': 'i',
    'й': 'y',  'к': 'k',  'л': 'l',  'м': 'm',  'н': 'n',
    'о': 'o',  'п': 'p',  'р': 'r',  'с': 's',  'т': 't',
    'у': 'u',  'ф': 'f',  'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch','ъ': '',   'ы': 'y',  'ь': '',
    'э': 'e',  'ю': 'yu', 'я': 'ya',
}


def transliterate(text: str) -> str:
    result = []
    for ch in text.lower():
        result.append(_TRANSLIT.get(ch, ch))
    return ''.join(result)


def slugify(text: str) -> str:
    s = transliterate(text)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def make_unique(base: str, seen: set) -> str:
    slug = base
    n = 2
    while slug in seen:
        slug = f"{base}-{n}"
        n += 1
    seen.add(slug)
    return slug


def run(dry_run: bool, only: str | None):
    conn = psycopg2.connect(
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
    )
    cur = conn.cursor()

    def do_update(table, row_id, slug):
        if not dry_run:
            cur.execute(f"UPDATE {table} SET slug = %s WHERE id = %s", (slug, row_id))

    # --- Categories ---
    if not only or only == 'categories':
        cur.execute("SELECT id, name FROM categories WHERE slug IS NULL ORDER BY id")
        rows = cur.fetchall()
        seen = set()
        cur.execute("SELECT slug FROM categories WHERE slug IS NOT NULL")
        for (s,) in cur.fetchall():
            seen.add(s)
        updated = 0
        for row_id, name in rows:
            slug = make_unique(slugify(name), seen)
            do_update("categories", row_id, slug)
            updated += 1
        if not dry_run:
            conn.commit()
        print(f"categories: {updated} slugs {'(dry-run)' if dry_run else 'updated'}")

    # --- Models ---
    if not only or only == 'models':
        cur.execute("SELECT id, name FROM models WHERE slug IS NULL ORDER BY id")
        rows = cur.fetchall()
        seen = set()
        cur.execute("SELECT slug FROM models WHERE slug IS NOT NULL")
        for (s,) in cur.fetchall():
            seen.add(s)
        updated = 0
        for row_id, name in rows:
            slug = make_unique(slugify(name), seen)
            do_update("models", row_id, slug)
            updated += 1
        if not dry_run:
            conn.commit()
        print(f"models: {updated} slugs {'(dry-run)' if dry_run else 'updated'}")

    # --- Parts (one slug per unique part_number) ---
    if not only or only == 'parts':
        cur.execute("""
            SELECT DISTINCT ON (part_number) id, part_number
            FROM parts
            WHERE slug IS NULL AND part_number IS NOT NULL
            ORDER BY part_number, id
        """)
        rows = cur.fetchall()
        seen = set()
        cur.execute("SELECT DISTINCT slug FROM parts WHERE slug IS NOT NULL")
        for (s,) in cur.fetchall():
            seen.add(s)

        # Строим кэш part_number -> slug
        pn_to_slug: dict[str, str] = {}
        for _, pn in rows:
            base = re.sub(r'[^a-z0-9]+', '-', pn.lower()).strip('-')
            pn_to_slug[pn] = make_unique(base, seen)

        updated = 0
        for pn, slug in pn_to_slug.items():
            if not dry_run:
                cur.execute(
                    "UPDATE parts SET slug = %s WHERE part_number = %s AND slug IS NULL",
                    (slug, pn)
                )
                updated += cur.rowcount
            else:
                updated += 1

        if not dry_run:
            conn.commit()
        print(f"parts: {updated} rows {'(dry-run)' if dry_run else 'updated'}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", choices=["categories", "models", "parts"])
    args = parser.parse_args()
    run(dry_run=args.dry_run, only=args.only)
