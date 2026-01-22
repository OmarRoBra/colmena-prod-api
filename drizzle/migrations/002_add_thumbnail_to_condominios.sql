-- Migration: Add thumbnail field to condominios table
-- Created: 2025-12-30
-- Description: Adds an optional thumbnail/image URL field to the condominios table

-- ==========================================================================
-- PART 1: Add thumbnail column to condominios table
-- ==========================================================================

-- Add the thumbnail column
ALTER TABLE condominios
ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);

-- Add index for better query performance (optional, useful if filtering by thumbnail)
CREATE INDEX IF NOT EXISTS idx_condominios_thumbnail ON condominios(thumbnail) WHERE thumbnail IS NOT NULL;

-- ==========================================================================
-- PART 2: Add comment for documentation
-- ==========================================================================

COMMENT ON COLUMN condominios.thumbnail IS 'URL to condominium image/thumbnail (max 500 characters)';

-- ==========================================================================
-- Migration completed successfully
-- ==========================================================================

-- To verify the migration:
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'condominios' AND column_name = 'thumbnail';
