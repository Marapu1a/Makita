-- =============================================================
-- Migration 001: Normalize parts → parts (Part) + diagram_parts (DiagramPart)
-- =============================================================
-- Статус:        PROTOTYPE — запускать только на копии/локальной БД
-- Ветка:         migration/db-schema-prisma-prototype
-- Дата:          2026-06-12
-- Данные:        139 084 строк в parts, 38 310 уникальных part_number
--
-- Принципы:
--   • Только additive: исходная таблица parts НЕ удаляется и НЕ переименовывается
--     в этом скрипте. Переименование — явный отдельный шаг (Step 8).
--   • Идемпотентность: IF NOT EXISTS везде, повторный запуск безопасен.
--   • Rollback: см. 001_normalize_parts_rollback.sql
--
-- Стратегия дедупликации (canonical data для Part):
--   Для part_number с конфликтующими price/availability берётся строка
--   с MAX(id) — т.е. последняя добавленная/обновлённая парсером запись.
--   Проверка показала: name всегда одинаков для одного part_number (0 конфликтов).
--   Price-конфликтов: 27 из 38 310 (0.07%) — преимущественно небольшие расхождения.
--   Два тестовых артикула (394114051, 963230031) с меткой "Тест" — оставляются,
--   but is_indexable будет FALSE после скрипта slug-генерации.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Создать таблицу физических деталей parts_new
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_new (
    id           SERIAL PRIMARY KEY,
    part_number  CHARACTER VARYING NOT NULL,
    name         CHARACTER VARYING,
    price        DOUBLE PRECISION  NOT NULL DEFAULT 0,
    availability BOOLEAN           NOT NULL DEFAULT TRUE,
    quantity     INTEGER           NOT NULL DEFAULT 0,

    -- SEO-поля (заполняются скриптом/AI позже)
    slug            CHARACTER VARYING(255),
    seo_title       CHARACTER VARYING(500),
    seo_description TEXT,
    h1              CHARACTER VARYING(500),
    content         TEXT,
    is_indexable    BOOLEAN NOT NULL DEFAULT TRUE,

    -- Стандартные имена с подчёркиванием (в отличие от createdat/updatedat в старых таблицах)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,

    CONSTRAINT parts_new_part_number_unique UNIQUE (part_number),
    CONSTRAINT parts_new_slug_unique        UNIQUE (slug)
);

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Перенести уникальные физические детали (дедупликация по part_number)
-- ─────────────────────────────────────────────────────────────
-- DISTINCT ON (part_number) + ORDER BY id DESC = берём строку с MAX(id).
-- Это гарантирует что при конфликте price/availability побеждает последняя версия.

INSERT INTO parts_new (part_number, name, price, availability, quantity, created_at, updated_at)
SELECT DISTINCT ON (part_number)
    part_number,
    name,
    COALESCE(price, 0),
    COALESCE(availability, TRUE),
    COALESCE(quantity, 0),
    createdat,
    updatedat
FROM parts
ORDER BY part_number, id DESC
ON CONFLICT (part_number) DO NOTHING;

-- Контрольный счётчик (вставить в лог)
DO $$
DECLARE
    cnt_new   INT;
    cnt_uniq  INT;
BEGIN
    SELECT COUNT(*) INTO cnt_new  FROM parts_new;
    SELECT COUNT(DISTINCT part_number) INTO cnt_uniq FROM parts;
    RAISE NOTICE 'parts_new rows: %, expected (distinct part_number): %', cnt_new, cnt_uniq;
    IF cnt_new != cnt_uniq THEN
        RAISE EXCEPTION 'MISMATCH: parts_new has % rows but expected %', cnt_new, cnt_uniq;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Создать таблицу diagram_parts (вхождения деталей в схемы)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagram_parts (
    id        SERIAL PRIMARY KEY,
    model_id  INTEGER NOT NULL,
    part_id   INTEGER NOT NULL,
    slide_id  INTEGER,
    number    INTEGER NOT NULL,
    x_coord   DOUBLE PRECISION,
    y_coord   DOUBLE PRECISION,
    width     DOUBLE PRECISION,
    height    DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT diagram_parts_model_id_fk FOREIGN KEY (model_id)
        REFERENCES models(id) ON DELETE CASCADE,
    CONSTRAINT diagram_parts_part_id_fk  FOREIGN KEY (part_id)
        REFERENCES parts_new(id) ON DELETE RESTRICT,
    CONSTRAINT diagram_parts_slide_id_fk FOREIGN KEY (slide_id)
        REFERENCES slides(id) ON DELETE SET NULL,

    -- Проверено на реальных данных: дублей (model_id, number) нет
    CONSTRAINT diagram_parts_model_number_unique UNIQUE (model_id, number)
);

CREATE INDEX IF NOT EXISTS idx_diagram_parts_model_id ON diagram_parts(model_id);
CREATE INDEX IF NOT EXISTS idx_diagram_parts_part_id  ON diagram_parts(part_id);
CREATE INDEX IF NOT EXISTS idx_diagram_parts_slide_id ON diagram_parts(slide_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Перенести все вхождения деталей в diagram_parts
-- ─────────────────────────────────────────────────────────────
INSERT INTO diagram_parts (model_id, part_id, slide_id, number, x_coord, y_coord, width, height, created_at, updated_at)
SELECT
    p.model_id,
    pn.id           AS part_id,
    p.slide_id,
    p.number,
    p.x_coord,
    p.y_coord,
    p.width,
    p.height,
    p.createdat     AS created_at,
    p.updatedat     AS updated_at
FROM parts p
JOIN parts_new pn ON pn.part_number = p.part_number
ON CONFLICT (model_id, number) DO NOTHING;

DO $$
DECLARE
    cnt_dp    INT;
    cnt_parts INT;
BEGIN
    SELECT COUNT(*) INTO cnt_dp    FROM diagram_parts;
    SELECT COUNT(*) INTO cnt_parts FROM parts;
    RAISE NOTICE 'diagram_parts rows: %, expected (parts rows): %', cnt_dp, cnt_parts;
    IF cnt_dp != cnt_parts THEN
        RAISE WARNING 'diagram_parts count (%) != parts count (%). Check for ON CONFLICT skips.', cnt_dp, cnt_parts;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Создать таблицу маппинга old parts.id → new parts_new.id
-- ─────────────────────────────────────────────────────────────
-- Нужна для ремаппинга order_items.product_id (Step 6)
CREATE TABLE IF NOT EXISTS _migration_id_mapping (
    old_id  INTEGER NOT NULL,
    new_id  INTEGER NOT NULL,
    CONSTRAINT _migration_id_mapping_old_id_unique UNIQUE (old_id)
);

INSERT INTO _migration_id_mapping (old_id, new_id)
SELECT p.id AS old_id, pn.id AS new_id
FROM parts p
JOIN parts_new pn ON pn.part_number = p.part_number
ON CONFLICT (old_id) DO NOTHING;

DO $$
DECLARE
    cnt_map   INT;
    cnt_parts INT;
BEGIN
    SELECT COUNT(*) INTO cnt_map   FROM _migration_id_mapping;
    SELECT COUNT(*) INTO cnt_parts FROM parts;
    RAISE NOTICE '_migration_id_mapping rows: %, expected (parts rows): %', cnt_map, cnt_parts;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Ремаппинг order_items.product_id
-- ─────────────────────────────────────────────────────────────
-- Текущие данные: order_items содержит 0 строк (только 1 тестовый заказ без позиций).
-- Скрипт написан полностью для корректности при наличии данных.

-- Сначала проверить что нет orphan-ов (product_id без маппинга)
DO $$
DECLARE
    orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM order_items oi
    LEFT JOIN _migration_id_mapping m ON oi.product_id = m.old_id
    WHERE m.new_id IS NULL;

    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'ABORT: % order_items.product_id not found in mapping. Manual fix required.', orphan_count;
    END IF;
    RAISE NOTICE 'order_items orphan check passed (0 orphans)';
END $$;

-- Выполнить ремаппинг
UPDATE order_items oi
SET product_id = m.new_id
FROM _migration_id_mapping m
WHERE oi.product_id = m.old_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Создать view для обратной совместимости со старым API
-- ─────────────────────────────────────────────────────────────
-- Старый Express-код делает SELECT * FROM parts WHERE model_id = $1.
-- После переименования таблицы в Step 8 — запросы к "parts" будут читать этот view.
CREATE OR REPLACE VIEW parts_compat AS
SELECT
    dp.id,
    dp.model_id,
    dp.slide_id,
    dp.number,
    p.name,
    p.part_number,
    dp.x_coord,
    dp.y_coord,
    dp.width,
    dp.height,
    p.price,
    p.availability,
    p.quantity,
    p.created_at  AS createdat,
    p.updated_at  AS updatedat
FROM diagram_parts dp
JOIN parts_new p ON p.id = dp.part_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 8: Переименование таблиц (ФИНАЛЬНЫЙ ШАГ — выполнять отдельно)
-- ─────────────────────────────────────────────────────────────
-- ВНИМАНИЕ: этот блок закомментирован намеренно.
-- Выполнять только после полной проверки данных скриптом 001_normalize_parts_checks.sql
-- и после подтверждения что старый API работает через parts_compat.
--
-- BEGIN;
--   ALTER TABLE parts     RENAME TO parts_old;   -- сохраняем исходник
--   ALTER TABLE parts_new RENAME TO parts;        -- новая нормализованная таблица
--   -- diagram_parts уже имеет правильное имя
--   -- order_items.product_id уже ремаппнут на parts_new.id
-- COMMIT;
--
-- После переименования: проверить что old API работает через parts_compat view.
-- Для этого в Express-коде заменить имя таблицы parts → parts_compat в запросах
-- которые фильтруют по model_id (один файл: backend/routes/partRoutes.js).

-- ─────────────────────────────────────────────────────────────
-- ИТОГ ШАГОВ (без Step 8):
-- ─────────────────────────────────────────────────────────────
-- ✓ parts_new        — физические детали, уникальный part_number
-- ✓ diagram_parts    — вхождения деталей на схемы
-- ✓ _migration_id_mapping — маппинг old parts.id → new parts_new.id
-- ✓ order_items      — product_id ремаппнут (или был пуст)
-- ✓ parts_compat     — view для обратной совместимости
-- ✗ parts            — исходная таблица НЕ тронута (только после проверки)
