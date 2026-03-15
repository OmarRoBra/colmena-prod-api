-- Migration: Fix facturacion constraints and create missing tables
-- Date: 2026-03-10
-- Issues fixed:
--   1. chk_receptor constraint did not allow empresa_externa receptor type
--   2. audit_logs table was missing from the database

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Drop the old chk_receptor constraint (doesn't allow empresa_externa)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE facturas_emitidas DROP CONSTRAINT IF EXISTS chk_receptor;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Add updated receptor check constraint (includes empresa_externa)
--    empresa_externa requires trabajador_id
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'facturas_emitidas'
      AND constraint_name = 'chk_receptor_v2'
  ) THEN
    ALTER TABLE facturas_emitidas
      ADD CONSTRAINT chk_receptor_v2 CHECK (
        (receptor_tipo = 'residente'       AND residente_id IS NOT NULL)
        OR (receptor_tipo = 'externo'      AND proveedor_externo_id IS NOT NULL)
        OR (receptor_tipo = 'empresa_externa' AND trabajador_id IS NOT NULL)
        OR  receptor_tipo = 'publico_general'
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Create audit_logs table if it doesn't exist
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  condominio_id uuid,
  usuario_id  uuid,
  accion      varchar(100) NOT NULL,
  entidad     varchar(100) NOT NULL,
  entidad_id  uuid,
  detalles    json,
  ip_address  varchar(50),
  created_at  timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_condominio ON audit_logs(condominio_id) WHERE condominio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario    ON audit_logs(usuario_id)    WHERE usuario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidad    ON audit_logs(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created    ON audit_logs(created_at);
