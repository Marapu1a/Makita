-- =============================================================
-- Migration 001c: CUTOVER — переименование таблиц (Step 8 из 001)
-- ВНИМАНИЕ: после этого шага СТАРЫЙ backend и админка перестают
-- корректно работать с деталями. Выполнять непосредственно перед
-- переключением nginx на v2-стек. Даунтайм ~секунды.
-- Откат: см. комментарий внизу.
-- =============================================================

BEGIN;

-- 1. Снимаем FK ПЕРВЫМ — иначе ремаппинг упирается в constraint
--    (на проде Step 6 из 001 не смог выполниться именно из-за этого)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- 2. Ремаппинг product_id: старые parts.id → новые нормализованные id
UPDATE order_items oi
SET product_id = m.new_id
FROM _migration_id_mapping m
WHERE oi.product_id = m.old_id;

-- 3. Переименование таблиц
ALTER TABLE parts     RENAME TO parts_old;
ALTER TABLE parts_new RENAME TO parts;

-- 4. FK на новую parts
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES parts(id) ON UPDATE CASCADE;

COMMIT;

-- Контроль
SELECT
  (SELECT COUNT(*) FROM parts)         AS parts_normalized,   -- ожидается 38310
  (SELECT COUNT(*) FROM parts_old)     AS parts_old_rows,     -- ожидается 139084
  (SELECT COUNT(*) FROM diagram_parts) AS diagram_parts_rows; -- ожидается 139084

-- ВНИМАНИЕ: выполнять РОВНО ОДИН РАЗ — повторный запуск ремаппинга
-- перепишет уже сконвертированные product_id ещё раз (id пересекаются).

-- ─── ОТКАТ (если что-то пошло не так) ────────────────────────
-- BEGIN;
-- ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
-- -- вернуть product_id на старые id (обратный маппинг: любой old_id этого артикула)
-- UPDATE order_items oi SET product_id = m.old_id
-- FROM (SELECT DISTINCT ON (new_id) new_id, old_id FROM _migration_id_mapping ORDER BY new_id, old_id) m
-- WHERE oi.product_id = m.new_id;
-- ALTER TABLE parts     RENAME TO parts_new;
-- ALTER TABLE parts_old RENAME TO parts;
-- ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
--   FOREIGN KEY (product_id) REFERENCES parts(id) ON UPDATE CASCADE;
-- COMMIT;
-- (плюс вернуть nginx на localhost:8080 и поднять старые контейнеры)
