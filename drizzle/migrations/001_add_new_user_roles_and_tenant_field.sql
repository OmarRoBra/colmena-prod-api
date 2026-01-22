-- Migration: Add new user roles and tenant field to unidades
-- Created: 2025-12-30
-- Description: This migration adds new user roles (condoAdmin, owner, tenant, worker, serviceProvider)
--              and adds an inquilino_id (tenant) field to the unidades table

-- ==========================================================================
-- PART 1: Update usuarios table to support new roles
-- ==========================================================================

-- First, update existing 'gerente' roles to 'condoAdmin'
UPDATE usuarios
SET rol = 'condoAdmin'
WHERE rol = 'gerente';

-- Update existing 'residente' roles to 'owner'
UPDATE usuarios
SET rol = 'owner'
WHERE rol = 'residente';

-- Note: The rol column is already a VARCHAR(50), so no need to modify the column type
-- The application code now validates: admin, condoAdmin, owner, tenant, worker, serviceProvider

-- ==========================================================================
-- PART 2: Add inquilino_id (tenant) field to unidades table
-- ==========================================================================

-- Add the new column for tenant/renter relationship
ALTER TABLE unidades
ADD COLUMN IF NOT EXISTS inquilino_id UUID;

-- Add foreign key constraint
ALTER TABLE unidades
ADD CONSTRAINT fk_unidades_inquilino
FOREIGN KEY (inquilino_id)
REFERENCES usuarios(id)
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_unidades_inquilino_id ON unidades(inquilino_id);

-- ==========================================================================
-- PART 3: Add comments for documentation
-- ==========================================================================

COMMENT ON COLUMN usuarios.rol IS 'User role: admin, condoAdmin, owner, tenant, worker, serviceProvider';
COMMENT ON COLUMN unidades.propietario_id IS 'Property owner (usuario ID)';
COMMENT ON COLUMN unidades.inquilino_id IS 'Property tenant/renter (usuario ID)';

-- ==========================================================================
-- Migration completed successfully
-- ==========================================================================

-- To verify the migration:
-- SELECT COUNT(*), rol FROM usuarios GROUP BY rol;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'unidades';
