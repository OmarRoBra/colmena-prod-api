-- Add reconciliation tracking to payments and expenses
ALTER TABLE pagos ADD COLUMN reconciliado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gastos ADD COLUMN reconciliado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gastos ADD COLUMN referencia_externa VARCHAR(100);
