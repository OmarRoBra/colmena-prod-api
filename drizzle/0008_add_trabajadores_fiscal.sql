-- Migration: Add fiscal fields and tipo to trabajadores
-- Also add trabajador_id to facturas_emitidas for empresa_externa receptor type

-- 1. Agregar tipo y datos fiscales a trabajadores
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) NOT NULL DEFAULT 'empleado',
  ADD COLUMN IF NOT EXISTS rfc VARCHAR(13),
  ADD COLUMN IF NOT EXISTS razon_social VARCHAR(300),
  ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR(10),
  ADD COLUMN IF NOT EXISTS uso_cfdi VARCHAR(10) DEFAULT 'G03',
  ADD COLUMN IF NOT EXISTS codigo_postal_fiscal VARCHAR(10),
  ADD COLUMN IF NOT EXISTS facturapi_cliente_id VARCHAR(100);

-- Check constraint para tipo
ALTER TABLE trabajadores
  ADD CONSTRAINT trabajadores_tipo_check CHECK (tipo IN ('empleado', 'empresa_externa'));

-- 2. Agregar trabajador_id a facturas_emitidas
ALTER TABLE facturas_emitidas
  ADD COLUMN IF NOT EXISTS trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL;

-- 3. Actualizar check constraint de receptor_tipo en facturas_emitidas
-- (PostgreSQL no permite DROP CONSTRAINT IF EXISTS directamente, primero obtenemos el nombre)
DO $$
BEGIN
  -- Eliminar constraint anterior si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'facturas_emitidas'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%receptor_tipo%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE facturas_emitidas DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'facturas_emitidas'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%receptor_tipo%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE facturas_emitidas
  ADD CONSTRAINT facturas_emitidas_receptor_tipo_check
    CHECK (receptor_tipo IN ('residente', 'externo', 'empresa_externa', 'publico_general'));

-- 4. Índice para búsqueda por tipo en trabajadores
CREATE INDEX IF NOT EXISTS idx_trabajadores_tipo ON trabajadores(tipo);
CREATE INDEX IF NOT EXISTS idx_trabajadores_rfc ON trabajadores(rfc) WHERE rfc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_trabajador_id ON facturas_emitidas(trabajador_id) WHERE trabajador_id IS NOT NULL;
