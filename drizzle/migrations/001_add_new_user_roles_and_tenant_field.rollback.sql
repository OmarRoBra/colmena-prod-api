-- Rollback Migration: Revert new user roles and tenant field
-- Created: 2025-12-30
-- Description: This rollback script reverts the changes made in 001_add_new_user_roles_and_tenant_field.sql
--              WARNING: This will revert role names and remove the tenant field

-- ==========================================================================
-- PART 1: Remove inquilino_id (tenant) field from unidades table
-- ==========================================================================

-- Drop the index
DROP INDEX IF EXISTS idx_unidades_inquilino_id;

-- Drop the foreign key constraint
ALTER TABLE unidades
DROP CONSTRAINT IF EXISTS fk_unidades_inquilino;

-- Drop the column
ALTER TABLE unidades
DROP COLUMN IF EXISTS inquilino_id;

-- ==========================================================================
-- PART 2: Revert usuarios roles to old values
-- ==========================================================================

-- WARNING: This will revert condoAdmin back to gerente and owner back to residente
-- Any users with roles: tenant, worker, serviceProvider will be set to 'residente'

-- Revert condoAdmin to gerente
UPDATE usuarios
SET rol = 'gerente'
WHERE rol = 'condoAdmin';

-- Revert owner to residente
UPDATE usuarios
SET rol = 'owner'
WHERE rol = 'owner';

-- Handle new roles by setting them to default 'residente'
UPDATE usuarios
SET rol = 'residente'
WHERE rol IN ('tenant', 'worker', 'serviceProvider');

-- ==========================================================================
-- PART 3: Remove comments
-- ==========================================================================

COMMENT ON COLUMN usuarios.rol IS NULL;
COMMENT ON COLUMN unidades.propietario_id IS NULL;

-- ==========================================================================
-- Rollback completed
-- ==========================================================================

-- To verify the rollback:
-- SELECT COUNT(*), rol FROM usuarios GROUP BY rol;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'unidades';
