-- =============================================================
-- Migration 001c: CUTOVER — переименование таблиц (Step 8 из 001)
-- ВНИМАНИЕ: после этого шага СТАРЫЙ backend и админка перестают
-- корректно работать с деталями. Выполнять непосредственно перед
-- переключением nginx на v2-стек. Даунтайм ~секунды.
-- Откат: см. комментарий внизу.
-- =============================================================

BEGIN;

ALTER TABLE parts     RENAME TO parts_old;
ALTER TABLE parts_new RENAME TO parts;

-- FK order_items.product_id следует за таблицей при переименовании —
-- перевешиваем на новую parts (значения уже ремаппнуты в 001 Step 6)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES parts(id) ON UPDATE CASCADE;

COMMIT;

-- Контроль
SELECT
  (SELECT COUNT(*) FROM parts)         AS parts_normalized,   -- ожидается 38310
  (SELECT COUNT(*) FROM parts_old)     AS parts_old_rows,     -- ожидается 139084
  (SELECT COUNT(*) FROM diagram_parts) AS diagram_parts_rows; -- ожидается 139084

-- ─── ОТКАТ (если что-то пошло не так) ────────────────────────
-- BEGIN;
-- ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
-- ALTER TABLE parts     RENAME TO parts_new;
-- ALTER TABLE parts_old RENAME TO parts;
-- ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
--   FOREIGN KEY (product_id) REFERENCES parts(id) ON UPDATE CASCADE;
-- COMMIT;
-- (плюс вернуть nginx на localhost:8080 и поднять старые контейнеры)
