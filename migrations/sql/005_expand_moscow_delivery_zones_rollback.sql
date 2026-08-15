BEGIN;

UPDATE orders
SET delivery_zone = 'WITHIN_MKAD'
WHERE delivery_zone IN ('MKAD_TO_TTK', 'TTK_TO_GARDEN', 'INSIDE_GARDEN');

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_delivery_rate_per_km_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_zone_check,
  DROP COLUMN IF EXISTS delivery_rate_per_km;

ALTER TABLE orders
  ADD CONSTRAINT orders_delivery_zone_check
  CHECK (delivery_zone IS NULL OR delivery_zone IN ('WITHIN_MKAD', 'OUTSIDE_MKAD'));

COMMIT;
