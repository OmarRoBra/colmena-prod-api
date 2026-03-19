-- Late fees (mora) and partial payment support
ALTER TABLE pagos ADD COLUMN monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN mora DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN porcentaje_mora DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN mora_calculada_at TIMESTAMP;
