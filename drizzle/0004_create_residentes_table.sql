-- Migration: Create residentes table
-- This migration creates the residentes table for managing unit residents

CREATE TABLE IF NOT EXISTS "residentes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "unidad_id" uuid NOT NULL REFERENCES "unidades"("id") ON DELETE CASCADE,
  "nombre" varchar(200) NOT NULL,
  "email" varchar(255) NOT NULL,
  "telefono" varchar(20) NOT NULL,
  "tipo" varchar(50) NOT NULL DEFAULT 'Propietario',
  "fecha_ingreso" timestamp NOT NULL,
  "documento_identidad" varchar(50),
  "contacto_emergencia" varchar(200),
  "telefono_emergencia" varchar(20),
  "notas" text,
  "activo" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create index for faster lookups by unit
CREATE INDEX IF NOT EXISTS "idx_residentes_unidad_id" ON "residentes" ("unidad_id");

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS "idx_residentes_email" ON "residentes" ("email");
