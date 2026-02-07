-- Migration: Align unidades table with frontend entity
-- This migration changes the unidades table to match the frontend Unit entity

-- Drop the old columns and add new ones
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "condominio_id";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "propietario_id";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "inquilino_id";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "metros_cuadrados";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "estado_pago";
ALTER TABLE "unidades" DROP COLUMN IF EXISTS "activo";

-- Add new columns
ALTER TABLE "unidades" ADD COLUMN IF NOT EXISTS "condominium_id" uuid NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE;
ALTER TABLE "unidades" ADD COLUMN IF NOT EXISTS "area" decimal(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "unidades" ADD COLUMN IF NOT EXISTS "propietario" varchar(200) NOT NULL DEFAULT '';
ALTER TABLE "unidades" ADD COLUMN IF NOT EXISTS "estado" varchar(50) NOT NULL DEFAULT 'Vacío';

-- Make habitaciones, banos, estacionamientos NOT NULL with defaults
ALTER TABLE "unidades" ALTER COLUMN "habitaciones" SET NOT NULL;
ALTER TABLE "unidades" ALTER COLUMN "habitaciones" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "banos" SET NOT NULL;
ALTER TABLE "unidades" ALTER COLUMN "banos" SET DEFAULT 0;
ALTER TABLE "unidades" ALTER COLUMN "estacionamientos" SET NOT NULL;
ALTER TABLE "unidades" ALTER COLUMN "estacionamientos" SET DEFAULT 0;
