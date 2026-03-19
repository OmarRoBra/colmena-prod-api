-- Add unique payment reference to units for bank transfer identification
ALTER TABLE unidades ADD COLUMN referencia_unica VARCHAR(20);

-- Backfill existing units: generate reference from condominium name prefix + unit number
UPDATE unidades u
SET referencia_unica = UPPER(LEFT(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]', '', 'g'), 3)) || '-' || u.numero
FROM condominios c WHERE u.condominium_id = c.id;
