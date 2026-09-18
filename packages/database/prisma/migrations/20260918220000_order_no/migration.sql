-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNo" TEXT;

-- Backfill existing rows
UPDATE "Order"
SET "orderNo" = 'SK' || UPPER(SUBSTRING(md5(random()::text || id), 1, 8))
WHERE "orderNo" IS NULL;

-- Enforce unique + not null
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo");
CREATE INDEX IF NOT EXISTS "Order_orderNo_idx" ON "Order"("orderNo");

ALTER TABLE "Order" ALTER COLUMN "orderNo" SET NOT NULL;
