BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS delivery_cost DOUBLE PRECISION;

UPDATE orders
SET delivery_cost = 0
WHERE delivery_method = 'Самовывоз'
  AND delivery_cost IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_delivery_zone_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_zone_check
      CHECK (delivery_zone IS NULL OR delivery_zone IN ('WITHIN_MKAD', 'OUTSIDE_MKAD'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_delivery_cost_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_cost_check
      CHECK (delivery_cost IS NULL OR delivery_cost >= 0);
  END IF;
END
$$;

COMMIT;
