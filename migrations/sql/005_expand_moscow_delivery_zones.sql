BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_rate_per_km DOUBLE PRECISION;

-- Сохраняем исторический тариф старых заказов за МКАД.
UPDATE orders
SET delivery_rate_per_km = 50
WHERE delivery_zone = 'OUTSIDE_MKAD'
  AND delivery_rate_per_km IS NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_delivery_zone_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_zone_check
  CHECK (
    delivery_zone IS NULL OR delivery_zone IN (
      'WITHIN_MKAD',
      'MKAD_TO_TTK',
      'TTK_TO_GARDEN',
      'INSIDE_GARDEN',
      'OUTSIDE_MKAD'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_delivery_rate_per_km_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_rate_per_km_check
      CHECK (delivery_rate_per_km IS NULL OR delivery_rate_per_km >= 0);
  END IF;
END
$$;

COMMIT;
