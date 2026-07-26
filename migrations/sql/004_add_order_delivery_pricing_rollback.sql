BEGIN;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_delivery_cost_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_zone_check,
  DROP COLUMN IF EXISTS delivery_cost,
  DROP COLUMN IF EXISTS delivery_zone;

COMMIT;
