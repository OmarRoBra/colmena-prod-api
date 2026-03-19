-- Payment system hardening: soft delete, rejection reason, approval audit
ALTER TABLE pagos ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE pagos ADD COLUMN motivo_rechazo VARCHAR(500);
ALTER TABLE pagos ADD COLUMN aprobado_por UUID REFERENCES usuarios(id);
ALTER TABLE pagos ADD COLUMN fecha_aprobacion TIMESTAMP;
