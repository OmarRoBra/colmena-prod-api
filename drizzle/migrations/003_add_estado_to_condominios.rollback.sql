-- Rollback Migration: Remove status_condominio field from condominios table
-- Created: 2025-12-30
-- Description: Removes the status_condominio column from the condominios table
--              WARNING: This will permanently delete all status_condominio data

-- ==========================================================================
-- PART 1: Remove the index
-- ==========================================================================

DROP INDEX IF EXISTS idx_condominios_status_condominio;

-- ==========================================================================
-- PART 2: Remove the status_condominio column
-- ==========================================================================

ALTER TABLE condominios
DROP COLUMN IF EXISTS status_condominio;

-- ==========================================================================
-- PART 3: Remove comment
-- ==========================================================================

-- Comment is automatically removed when the column is dropped

-- ==========================================================================
-- Rollback completed
-- ==========================================================================

-- To verify the rollback:
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'condominios' AND column_name = 'status_condominio';
-- (Should return no rows)

-- Notes:
-- - After rollback, the application will rely on the 'activo' boolean field
-- - Any status_condominio values ('activo', 'inactivo', 'archivado') will be lost
