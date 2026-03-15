-- Migración: Renombrar clientes_externos → proveedores_externos
-- Fecha: 2026-03-08

ALTER TABLE clientes_externos RENAME TO proveedores_externos;

ALTER INDEX IF EXISTS idx_clientes_externos_condominio RENAME TO idx_proveedores_externos_condominio;
ALTER INDEX IF EXISTS idx_clientes_externos_rfc_condo  RENAME TO idx_proveedores_externos_rfc_condo;

ALTER TABLE facturas_emitidas
  RENAME COLUMN cliente_externo_id TO proveedor_externo_id;
