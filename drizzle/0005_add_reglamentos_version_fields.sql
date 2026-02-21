-- Migration: Add version system fields to reglamentos table
-- Created: 2026-02-09

-- Add new columns for version system
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "descripcion" text;
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "version" varchar(20) NOT NULL DEFAULT 'v1.0';
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "estado" varchar(50) NOT NULL DEFAULT 'active';
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "pages" integer;
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "file_size" varchar(50);
ALTER TABLE "reglamentos" ADD COLUMN IF NOT EXISTS "approved_by" varchar(200);

-- Make contenido nullable (it can be empty until edited)
ALTER TABLE "reglamentos" ALTER COLUMN "contenido" DROP NOT NULL;

-- Update existing records to have proper status based on activo field
UPDATE "reglamentos" SET "estado" =
  CASE
    WHEN "activo" = true THEN 'active'
    ELSE 'archived'
  END
WHERE "estado" = 'active'; -- Only update if not already set

-- Add comment to explain deprecated field
COMMENT ON COLUMN "reglamentos"."activo" IS 'Deprecated: Use estado field instead. Kept for backward compatibility.';
