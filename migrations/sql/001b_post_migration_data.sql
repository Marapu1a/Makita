-- =============================================================
-- Migration 001b: донастройка данных после 001 (АДДИТИВНО, безопасно при работающем старом сайте)
-- Выполнять ПОСЛЕ 001 и ПОСЛЕ generate_slugs.py (слаги должны быть в старой parts)
-- =============================================================

-- Перенос слагов из денормализованной parts в parts_new (один слаг на артикул)
UPDATE parts_new pn
SET slug = sub.slug
FROM (
  SELECT DISTINCT ON (part_number) part_number, slug
  FROM parts
  WHERE slug IS NOT NULL
  ORDER BY part_number, id
) sub
WHERE pn.part_number = sub.part_number AND pn.slug IS NULL;

-- Тестовые артикулы и мусорный 'NULL' не индексируем
UPDATE parts_new SET is_indexable = FALSE WHERE part_number IN ('394114051', '963230031', 'NULL');

-- Контроль
SELECT
  (SELECT COUNT(*) FROM parts_new WHERE slug IS NOT NULL)     AS with_slug,
  (SELECT COUNT(*) FROM parts_new WHERE is_indexable = FALSE) AS non_indexable;
