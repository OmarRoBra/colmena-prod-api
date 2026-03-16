ALTER TABLE pagos
ADD COLUMN IF NOT EXISTS fecha_limite timestamp;
