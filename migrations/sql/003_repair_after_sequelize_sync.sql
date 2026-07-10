-- =============================================================
-- Migration 003: восстановление после sequelize.sync({alter:true})
-- =============================================================
-- Админ-бэкенд без NODE_ENV=production при старте «синхронизировал»
-- схему под свои старые модели: снёс slug/SEO-колонки у categories и
-- models и has_svg у slides. Таблицы parts (нормализованная) и orders
-- уцелели (sync упал на добавлении NOT NULL колонки и прервался).
--
-- После этого скрипта запустить: generate_slugs.py и generate_seo.py
-- (заполняют только NULL — детали не тронут, категории/модели восстановят).
-- =============================================================

-- categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug             VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title        VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description  TEXT;

-- models
ALTER TABLE models ADD COLUMN IF NOT EXISTS slug             VARCHAR(255);
ALTER TABLE models ADD COLUMN IF NOT EXISTS seo_title        VARCHAR(500);
ALTER TABLE models ADD COLUMN IF NOT EXISTS seo_description  TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS h1               VARCHAR(500);
ALTER TABLE models ADD COLUMN IF NOT EXISTS content          TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_indexable     BOOLEAN NOT NULL DEFAULT TRUE;

-- slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS has_svg BOOLEAN NOT NULL DEFAULT FALSE;

-- Индексы
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON categories (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS models_slug_key     ON models     (slug) WHERE slug IS NOT NULL;

-- has_svg: пересчёт из diagram_parts (в отличие от 002, где источником была
-- денормализованная parts — после нормализации координаты живут в diagram_parts)
UPDATE slides s
SET has_svg = TRUE
WHERE EXISTS     (SELECT 1 FROM diagram_parts dp WHERE dp.slide_id = s.id AND dp.x_coord IS NULL)
  AND NOT EXISTS (SELECT 1 FROM diagram_parts dp WHERE dp.slide_id = s.id AND dp.x_coord IS NOT NULL);

-- Контроль: ожидаем ~1233 SVG-слайдов
SELECT
  (SELECT COUNT(*) FROM slides WHERE has_svg)            AS svg_slides,
  (SELECT COUNT(*) FROM parts  WHERE slug IS NOT NULL)   AS parts_with_slug,
  (SELECT COUNT(*) FROM categories)                      AS categories_total;
