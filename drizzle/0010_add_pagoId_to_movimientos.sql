-- Migration: Add pagoId to movimientos_bancarios for automatic conciliation
-- Date: 2026-03-10

ALTER TABLE movimientos_bancarios
  ADD COLUMN IF NOT EXISTS pago_id uuid REFERENCES pagos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_pago
  ON movimientos_bancarios(pago_id)
  WHERE pago_id IS NOT NULL;
