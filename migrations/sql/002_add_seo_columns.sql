-- Migration 002: SEO columns + has_svg flag
-- Additive only — no DROP, no RENAME

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

-- parts (slug — НЕ уникальный: несколько строк на один part_number в денормализованной таблице)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- slides: флаг SVG-режима
ALTER TABLE slides ADD COLUMN IF NOT EXISTS has_svg BOOLEAN NOT NULL DEFAULT FALSE;

-- orders: поле updated_at отсутствовало (created_at уже есть)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Индексы
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON categories (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS models_slug_key     ON models     (slug) WHERE slug IS NOT NULL;
CREATE        INDEX IF NOT EXISTS parts_slug_idx      ON parts      (slug) WHERE slug IS NOT NULL;

-- Проставляем has_svg = TRUE для слайдов, где все детали без координат (SVG-positioning)
-- Слайды с хотя бы одной деталью с x_coord — DIV-режим (has_svg остаётся FALSE)
UPDATE slides s
SET has_svg = TRUE
WHERE EXISTS     (SELECT 1 FROM parts p WHERE p.slide_id = s.id AND p.x_coord IS NULL)
  AND NOT EXISTS (SELECT 1 FROM parts p WHERE p.slide_id = s.id AND p.x_coord IS NOT NULL);
