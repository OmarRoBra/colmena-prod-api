-- Migration: Add status_condominio field to condominios table
-- Created: 2025-12-30
-- Description: Adds a status_condominio field to track condominium status (activo, inactivo, archivado)
--              This replaces the boolean 'activo' field with a more flexible status system
--              Note: The 'estado' column is used for state/province (e.g., CDMX, Jalisco)

-- ==========================================================================
-- PART 1: Add the status_condominio column
-- ==========================================================================

-- Add status_condominio column with default value 'activo'
ALTER TABLE condominios
ADD COLUMN status_condominio VARCHAR(20) NOT NULL DEFAULT 'activo'
CHECK (status_condominio IN ('activo', 'inactivo', 'archivado'));

COMMENT ON COLUMN condominios.status_condominio IS 'Status of the condominium: activo, inactivo, or archivado';

-- ==========================================================================
-- PART 2: Migrate existing data
-- ==========================================================================

-- Update existing records based on the activo field
-- If activo = true, set status_condominio to 'activo'
-- If activo = false, set status_condominio to 'inactivo'
UPDATE condominios
SET status_condominio = CASE
  WHEN activo = true THEN 'activo'
  ELSE 'inactivo'
END;

-- ==========================================================================
-- PART 3: Create index for better query performance
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_condominios_status_condominio ON condominios(status_condominio);

-- ==========================================================================
-- Migration completed
-- ==========================================================================

-- To verify the migration:
-- SELECT id, nombre, activo, status_condominio FROM condominios;

-- Notes:
-- - The 'activo' boolean field is kept for backward compatibility but is deprecated
-- - New code should use the 'status_condominio' field instead
-- - The status_condominio field has a CHECK constraint to ensure only valid values
