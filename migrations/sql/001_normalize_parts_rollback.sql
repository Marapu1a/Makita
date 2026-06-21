-- =============================================================
-- Rollback 001: Откат миграции normalize_parts_to_diagram_parts
-- =============================================================
-- ВАЖНО: Читать этот файл полностью перед выполнением любого шага.
-- Откат имеет несколько сценариев в зависимости от того, что уже выполнено.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- СЦЕНАРИЙ A: Step 8 НЕ выполнялся (таблица parts не переименована)
-- Это самый распространённый случай при прототипировании.
-- ─────────────────────────────────────────────────────────────
--
-- Безопасно: просто удаляем созданные таблицы и view.
-- Исходная таблица parts не тронута.
-- order_items.product_id мог быть обновлён (Step 6) — нужно вернуть обратно.

-- 1. Вернуть order_items.product_id к старым значениям (если был ремаппнут)
-- В текущих данных order_items пуст — этот шаг ничего не делает.
-- Если данные были, маппинг хранится в _migration_id_mapping.
DO $$
DECLARE
    cnt INT;
BEGIN
    SELECT COUNT(*) INTO cnt FROM order_items;
    IF cnt > 0 THEN
        UPDATE order_items oi
        SET product_id = m.old_id
        FROM _migration_id_mapping m
        WHERE oi.product_id = m.new_id;
        RAISE NOTICE 'order_items.product_id reverted for % rows', cnt;
    ELSE
        RAISE NOTICE 'order_items is empty, no revert needed';
    END IF;
END $$;

-- 2. Удалить view
DROP VIEW IF EXISTS parts_compat;

-- 3. Удалить diagram_parts (FK-зависимости удалятся каскадно)
DROP TABLE IF EXISTS diagram_parts;

-- 4. Удалить таблицу маппинга
DROP TABLE IF EXISTS _migration_id_mapping;

-- 5. Удалить parts_new
DROP TABLE IF EXISTS parts_new;

-- Проверка: исходная parts на месте
SELECT COUNT(*) AS parts_rows_intact FROM parts;
-- Ожидание: 139 084 (исходное количество)

-- ─────────────────────────────────────────────────────────────
-- СЦЕНАРИЙ B: Step 8 был выполнен (parts переименована в parts_old,
--             parts_new переименована в parts)
-- ─────────────────────────────────────────────────────────────
--
-- ПРЕДУПРЕЖДЕНИЕ: полный откат из состояния после Step 8 требует pg_dump.
-- Простой DROP/RENAME безопасен только если в новой parts нет новых записей
-- (нет новых заказов, нет новых деталей через новый API).
--
-- Если в новой parts есть новые данные — безопасный откат ТОЛЬКО из бэкапа:
--   psql -U $DB_USER -d $DB_NAME < backup_before_normalization_YYYYMMDD_HHMMSS.sql
--
-- Если новых данных нет — ручной откат:

-- РАСКОММЕНТИРОВАТЬ ТОЛЬКО ЕСЛИ Step 8 выполнялся И новых данных нет:
--
-- BEGIN;
--   -- Вернуть order_items.product_id к старым значениям
--   UPDATE order_items oi
--   SET product_id = m.old_id
--   FROM _migration_id_mapping m
--   WHERE oi.product_id = m.new_id;
--
--   DROP VIEW  IF EXISTS parts_compat;
--   DROP TABLE IF EXISTS diagram_parts;
--   DROP TABLE IF EXISTS _migration_id_mapping;
--   DROP TABLE IF EXISTS parts;          -- это parts_new переименованная
--   ALTER TABLE parts_old RENAME TO parts;
-- COMMIT;
--
-- Проверка после ручного отката:
-- SELECT COUNT(*) FROM parts;  -- должно = исходному количеству

-- ─────────────────────────────────────────────────────────────
-- СЦЕНАРИЙ C: Полный откат из pg_dump (рекомендуется)
-- ─────────────────────────────────────────────────────────────
--
-- Создать бэкап ДО запуска миграции:
--   pg_dump -U postgres -h localhost -d makita \
--     -f "backup_before_001_$(date +%Y%m%d_%H%M%S).sql"
--
-- Восстановить:
--   psql -U postgres -h localhost -d makita_restore \
--     < backup_before_001_YYYYMMDD_HHMMSS.sql
--
-- Восстановление в ту же БД (деструктивно — удаляет все данные):
--   dropdb -U postgres makita && createdb -U postgres makita
--   psql -U postgres -d makita < backup_before_001_YYYYMMDD_HHMMSS.sql
--
-- Это единственный 100% безопасный способ отката при любом сценарии.
