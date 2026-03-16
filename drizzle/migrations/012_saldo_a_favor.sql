-- Saldo a favor (credit balance) on units + credit tracking on payments
ALTER TABLE unidades ADD COLUMN saldo_a_favor DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN credito_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0;
