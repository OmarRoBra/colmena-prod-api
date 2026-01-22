-- Rollback Migration: Remove thumbnail field from condominios table
-- Created: 2025-12-30
-- Description: Removes the thumbnail column from the condominios table
--              WARNING: This will permanently delete all thumbnail data

-- ==========================================================================
-- PART 1: Remove the index
-- ==========================================================================

DROP INDEX IF EXISTS idx_condominios_thumbnail;

-- ==========================================================================
-- PART 2: Remove the thumbnail column
-- ==========================================================================

ALTER TABLE condominios
DROP COLUMN IF EXISTS thumbnail;

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
-- WHERE table_name = 'condominios' AND column_name = 'thumbnail';
-- (Should return no rows)
