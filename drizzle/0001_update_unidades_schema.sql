-- Migration: Update unidades schema to match new DTO
-- This migration updates the unidades table structure

-- Step 1: Drop foreign key constraints
ALTER TABLE "unidades" DROP CONSTRAINT IF EXISTS "unidades_propietario_id_usuarios_id_fk";
ALTER TABLE "unidades" DROP CONSTRAINT IF EXISTS "unidades_inquilino_id_usuarios_id_fk";
ALTER TABLE "unidades" DROP CONSTRAINT IF EXISTS "unidades_condominio_id_condominios_id_fk";

-- Step 2: Rename columns
ALTER TABLE "unidades" RENAME COLUMN "condominio_id" TO "condominium_id";
ALTER TABLE "unidades" RENAME COLUMN "metros_cuadrados" TO "area";
ALTER TABLE "unidades" RENAME COLUMN "estado_pago" TO "estado";

-- Step 3: Drop old columns
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "propietario_id";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "inquilino_id";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "activo";

-- Step 4: Add new propietario column (string instead of UUID)
ALTER TABLE "unidades" ADD COLUMN "propietario" VARCHAR(200) NOT NULL DEFAULT '';

-- Step 5: Update defaults
ALTER TABLE "unidades" ALTER COLUMN "area" SET NOT NULL;
ALTER TABLE "unidades" ALTER COLUMN "area" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "estado" SET DEFAULT 'activo';
ALTER TABLE "unidades" ALTER COLUMN "habitaciones" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "banos" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "cuota_mantenimiento" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "cuota_mantenimiento" DROP NOT NULL;

-- Step 6: Re-add foreign key constraint with new column name
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_condominium_id_condominios_id_fk"
  FOREIGN KEY ("condominium_id") REFERENCES "condominios"("id") ON DELETE CASCADE;
