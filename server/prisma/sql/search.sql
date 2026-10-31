-- Idempotent search infrastructure (run via: npm run db:search). Needs permission to CREATE EXTENSION.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS product_name_trgm ON "Product" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS brand_name_trgm ON "Brand" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS variant_sku_trgm ON "ProductVariant" USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS note_name_trgm ON "FragranceNote" USING gin (name gin_trgm_ops);
-- Data-integrity guards that Prisma cannot express
DO $$ BEGIN
  ALTER TABLE "ProductVariant" ADD CONSTRAINT variant_stock_nonneg CHECK (stock >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT review_rating_range CHECK (rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
