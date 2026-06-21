-- =============================================================
-- Checks 001: Верификация миграции normalize_parts_to_diagram_parts
-- =============================================================
-- Запускать ПОСЛЕ 001_normalize_parts_to_diagram_parts.sql (без Step 8)
-- Все запросы только читают данные — безопасно запускать многократно.
-- Ожидаемый результат каждого блока указан в комментарии.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- CHECK 1: Количество строк — parts_old == diagram_parts
-- ─────────────────────────────────────────────────────────────
-- Ожидание: оба значения равны (139 084 при текущих данных)
SELECT
    (SELECT COUNT(*) FROM parts)         AS parts_original,
    (SELECT COUNT(*) FROM diagram_parts) AS diagram_parts_count,
    (SELECT COUNT(*) FROM parts) = (SELECT COUNT(*) FROM diagram_parts) AS counts_match;

-- ─────────────────────────────────────────────────────────────
-- CHECK 2: Количество строк parts_new == уникальных part_number в parts
-- ─────────────────────────────────────────────────────────────
-- Ожидание: оба значения равны (38 310 при текущих данных)
SELECT
    (SELECT COUNT(*) FROM parts_new)                   AS parts_new_count,
    (SELECT COUNT(DISTINCT part_number) FROM parts)    AS distinct_part_numbers,
    (SELECT COUNT(*) FROM parts_new) =
    (SELECT COUNT(DISTINCT part_number) FROM parts)    AS counts_match;

-- ─────────────────────────────────────────────────────────────
-- CHECK 3: Нет orphan diagram_parts.part_id
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк
SELECT COUNT(*) AS orphan_part_ids
FROM diagram_parts dp
LEFT JOIN parts_new pn ON dp.part_id = pn.id
WHERE pn.id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- CHECK 4: Нет orphan diagram_parts.model_id
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк
SELECT COUNT(*) AS orphan_model_ids
FROM diagram_parts dp
LEFT JOIN models m ON dp.model_id = m.id
WHERE m.id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- CHECK 5: Нет orphan diagram_parts.slide_id (кроме NULL)
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк
SELECT COUNT(*) AS orphan_slide_ids
FROM diagram_parts dp
LEFT JOIN slides s ON dp.slide_id = s.id
WHERE dp.slide_id IS NOT NULL AND s.id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- CHECK 6: Нет orphan order_items.product_id
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк (в текущих данных order_items пуст — вернёт 0)
SELECT COUNT(*) AS orphan_order_item_product_ids
FROM order_items oi
LEFT JOIN parts_new pn ON oi.product_id = pn.id
WHERE pn.id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- CHECK 7: Уникальность part_number в parts_new
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк
SELECT part_number, COUNT(*) AS cnt
FROM parts_new
GROUP BY part_number
HAVING COUNT(*) > 1;

-- ─────────────────────────────────────────────────────────────
-- CHECK 8: Уникальность slug в parts_new (если slug заполнен)
-- ─────────────────────────────────────────────────────────────
-- На этом этапе slug ещё NULL — запрос должен вернуть 0 строк
SELECT slug, COUNT(*) AS cnt
FROM parts_new
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- ─────────────────────────────────────────────────────────────
-- CHECK 9: Уникальность (model_id, number) в diagram_parts
-- ─────────────────────────────────────────────────────────────
-- Ожидание: 0 строк (проверено на исходных данных — дублей нет)
SELECT model_id, number, COUNT(*) AS cnt
FROM diagram_parts
GROUP BY model_id, number
HAVING COUNT(*) > 1;

-- ─────────────────────────────────────────────────────────────
-- CHECK 10: Выборочная проверка — 5 популярных part_number и их модели
-- ─────────────────────────────────────────────────────────────
-- Показывает: сколько моделей использует каждый из топ-5 артикулов
SELECT
    pn.part_number,
    pn.name,
    pn.price,
    COUNT(DISTINCT dp.model_id) AS model_count,
    STRING_AGG(DISTINCT m.name, ', ' ORDER BY m.name) AS models_sample
FROM parts_new pn
JOIN diagram_parts dp ON dp.part_id = pn.id
JOIN models m ON m.id = dp.model_id
WHERE pn.part_number IN (
    SELECT part_number
    FROM parts
    GROUP BY part_number
    ORDER BY COUNT(*) DESC
    LIMIT 5
)
GROUP BY pn.part_number, pn.name, pn.price
ORDER BY model_count DESC;

-- ─────────────────────────────────────────────────────────────
-- CHECK 11: Сводная статистика
-- ─────────────────────────────────────────────────────────────
SELECT
    (SELECT COUNT(*) FROM parts)                        AS parts_total_rows,
    (SELECT COUNT(DISTINCT part_number) FROM parts)     AS parts_unique_pn,
    (SELECT COUNT(*) FROM parts_new)                    AS parts_new_rows,
    (SELECT COUNT(*) FROM diagram_parts)                AS diagram_parts_rows,
    (SELECT COUNT(*) FROM order_items)                  AS order_items_rows,
    (SELECT COUNT(*) FROM _migration_id_mapping)        AS mapping_rows;
