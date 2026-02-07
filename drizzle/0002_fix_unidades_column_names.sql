-- Migration: Fix unidades column names to use consistent Spanish naming
-- This migration reverts English column names back to Spanish for consistency

-- Step 1: Drop existing foreign key constraints
ALTER TABLE "unidades" DROP CONSTRAINT IF EXISTS "unidades_condominium_id_condominios_id_fk";
ALTER TABLE "unidades" DROP CONSTRAINT IF EXISTS "unidades_condominio_id_condominios_id_fk";

-- Step 2: Rename columns from English to Spanish (if they exist as English)
-- Check if condominium_id exists and rename to condominio_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'condominium_id') THEN
    ALTER TABLE "unidades" RENAME COLUMN "condominium_id" TO "condominio_id";
  END IF;
END $$;

-- Check if propietario exists (as varchar) and needs to be changed to propietario_id (uuid)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'propietario' AND data_type = 'character varying') THEN
    ALTER TABLE "unidades" DROP COLUMN "propietario";
    ALTER TABLE "unidades" ADD COLUMN "propietario_id" UUID REFERENCES "usuarios"("id");
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'propietario_id') THEN
    ALTER TABLE "unidades" ADD COLUMN "propietario_id" UUID REFERENCES "usuarios"("id");
  END IF;
END $$;

-- Check if area exists and rename to metros_cuadrados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'area') THEN
    ALTER TABLE "unidades" RENAME COLUMN "area" TO "metros_cuadrados";
  END IF;
END $$;

-- Check if estado exists and rename to estado_pago
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'estado' AND table_name = 'unidades') THEN
    ALTER TABLE "unidades" RENAME COLUMN "estado" TO "estado_pago";
  END IF;
END $$;

-- Add activo column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'activo') THEN
    ALTER TABLE "unidades" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add inquilino_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'inquilino_id') THEN
    ALTER TABLE "unidades" ADD COLUMN "inquilino_id" UUID REFERENCES "usuarios"("id");
  END IF;
END $$;

-- Step 3: Update column defaults
ALTER TABLE "unidades" ALTER COLUMN "metros_cuadrados" DROP NOT NULL;
ALTER TABLE "unidades" ALTER COLUMN "estado_pago" SET DEFAULT 'al_corriente';
ALTER TABLE "unidades" ALTER COLUMN "cuota_mantenimiento" SET NOT NULL;

-- Step 4: Re-add foreign key constraint with correct column name
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_condominio_id_condominios_id_fk"
  FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE CASCADE;
