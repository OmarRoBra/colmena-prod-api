-- ============================================================
-- Migración: Sistema de Facturación Electrónica CFDI 4.0
-- Fecha: 2026-03-07
-- Descripción: Agrega campos fiscales a tablas existentes y
--              crea nuevas tablas para facturación con Facturapi
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Campos fiscales en condominios (EMISOR del CFDI)
-- ────────────────────────────────────────────────────────────
ALTER TABLE condominios
  ADD COLUMN IF NOT EXISTS rfc varchar(13),
  ADD COLUMN IF NOT EXISTS razon_social varchar(300),
  ADD COLUMN IF NOT EXISTS regimen_fiscal varchar(10),
  ADD COLUMN IF NOT EXISTS codigo_postal_fiscal varchar(10),
  ADD COLUMN IF NOT EXISTS facturapi_key varchar(200);

COMMENT ON COLUMN condominios.rfc IS 'RFC del condominio como emisor de CFDI 4.0';
COMMENT ON COLUMN condominios.razon_social IS 'Razón social exacta según SAT';
COMMENT ON COLUMN condominios.regimen_fiscal IS 'Código SAT del régimen fiscal del emisor';
COMMENT ON COLUMN condominios.codigo_postal_fiscal IS 'CP fiscal del emisor requerido en CFDI 4.0';
COMMENT ON COLUMN condominios.facturapi_key IS 'API key de Facturapi por condominio (multi-tenant)';
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 2. Campos fiscales en proveedores (para CFDIs recibidos)
-- ────────────────────────────────────────────────────────────
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS razon_social varchar(300),
  ADD COLUMN IF NOT EXISTS regimen_fiscal varchar(10),
  ADD COLUMN IF NOT EXISTS uso_cfdi varchar(10) DEFAULT 'G03',
  ADD COLUMN IF NOT EXISTS codigo_postal_fiscal varchar(10),
  ADD COLUMN IF NOT EXISTS facturapi_cliente_id varchar(100);

-- Ajustar longitud de RFC si es necesario (era 50, ahora 13)
-- Solo aplica si la columna ya existe con longitud mayor
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proveedores' AND column_name = 'rfc'
  ) THEN
    ALTER TABLE proveedores ALTER COLUMN rfc TYPE varchar(13);
  END IF;
END $$;
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 3. Campos fiscales en residentes (RECEPTOR del CFDI interno)
-- ────────────────────────────────────────────────────────────
ALTER TABLE residentes
  ADD COLUMN IF NOT EXISTS rfc varchar(13),
  ADD COLUMN IF NOT EXISTS razon_social varchar(300),
  ADD COLUMN IF NOT EXISTS regimen_fiscal varchar(10) DEFAULT '616',
  ADD COLUMN IF NOT EXISTS uso_cfdi varchar(10) DEFAULT 'S01',
  ADD COLUMN IF NOT EXISTS codigo_postal_fiscal varchar(10),
  ADD COLUMN IF NOT EXISTS facturapi_cliente_id varchar(100);

COMMENT ON COLUMN residentes.regimen_fiscal IS '616 = Sin obligaciones fiscales (default)';
COMMENT ON COLUMN residentes.uso_cfdi IS 'S01 = Sin efectos fiscales (default cuando no piden factura)';
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 4. Campos de proveedor en gastos
-- ────────────────────────────────────────────────────────────
ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES proveedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tiene_factura boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_gastos_proveedor_id ON gastos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_gastos_tiene_factura ON gastos(tiene_factura);
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 5. Tabla: clientes_externos (receptor externo de CFDI)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre varchar(200) NOT NULL,
  razon_social varchar(300) NOT NULL,
  rfc varchar(13) NOT NULL,
  email varchar(255) NOT NULL,
  telefono varchar(20),
  regimen_fiscal varchar(10) NOT NULL DEFAULT '612',
  uso_cfdi varchar(10) NOT NULL DEFAULT 'G03',
  codigo_postal_fiscal varchar(10) NOT NULL,
  facturapi_cliente_id varchar(100),
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clientes_externos_condominio ON clientes_externos(condominio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_externos_rfc_condo ON clientes_externos(condominio_id, rfc) WHERE activo = true;

COMMENT ON TABLE clientes_externos IS 'Personas/empresas externas al condominio a quienes se emite CFDI (renta de espacios, venta de material, etc.)';
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 6. Tabla: facturas_emitidas (CFDI emitido por el condominio)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas_emitidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  -- Receptor
  receptor_tipo varchar(20) NOT NULL,          -- residente | externo | publico_general
  residente_id uuid REFERENCES residentes(id) ON DELETE SET NULL,
  cliente_externo_id uuid REFERENCES clientes_externos(id) ON DELETE SET NULL,
  -- Flujo de negocio
  flujo varchar(50) NOT NULL,                  -- mantenimiento|multa|amenidad|renta_espacio|venta_material|otro
  pago_id uuid REFERENCES pagos(id) ON DELETE SET NULL,
  -- Datos del CFDI
  facturapi_id varchar(100) UNIQUE,
  cfdi_uuid varchar(50) UNIQUE,
  serie varchar(10),
  folio varchar(20),
  fecha_emision timestamp,
  subtotal decimal(14,2) NOT NULL,
  iva decimal(14,2) NOT NULL DEFAULT 0,
  total decimal(14,2) NOT NULL,
  moneda varchar(10) NOT NULL DEFAULT 'MXN',
  tipo_cfdi varchar(5) NOT NULL DEFAULT 'I',   -- I=Ingreso, E=Egreso
  estado varchar(30) NOT NULL DEFAULT 'borrador', -- borrador|vigente|cancelada|en_proceso
  motivo_cancelacion varchar(10),              -- SAT: '01'|'02'|'03'|'04'
  pdf_url varchar(500),
  xml_url varchar(500),
  raw_response json,
  notas text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  -- Constraints
  CONSTRAINT chk_receptor CHECK (
    (receptor_tipo = 'residente' AND residente_id IS NOT NULL)
    OR (receptor_tipo = 'externo' AND cliente_externo_id IS NOT NULL)
    OR (receptor_tipo = 'publico_general')
  )
);

CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_condominio ON facturas_emitidas(condominio_id);
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_flujo ON facturas_emitidas(flujo);
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_estado ON facturas_emitidas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_residente ON facturas_emitidas(residente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_pago ON facturas_emitidas(pago_id);
CREATE INDEX IF NOT EXISTS idx_facturas_emitidas_fecha ON facturas_emitidas(fecha_emision);

COMMENT ON TABLE facturas_emitidas IS 'CFDI de ingreso emitidos por el condominio. Cubre: mantenimiento, multas, amenidades, renta de espacios a externos, venta de material.';
COMMENT ON COLUMN facturas_emitidas.flujo IS 'mantenimiento|multa|amenidad|renta_espacio|venta_material|otro';
COMMENT ON COLUMN facturas_emitidas.motivo_cancelacion IS 'SAT CFDI 4.0: 01=Con relación, 02=Sin relación, 03=No se llevó a cabo, 04=Operación nominativa';
--> statement-breakpoint

-- ────────────────────────────────────────────────────────────
-- 7. Tabla: facturas_recibidas (CFDI recibido de proveedor)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facturas_recibidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  proveedor_id uuid REFERENCES proveedores(id) ON DELETE SET NULL,
  gasto_id uuid REFERENCES gastos(id) ON DELETE SET NULL,
  -- UUID fiscal CFDI (único por ley)
  cfdi_uuid varchar(50) UNIQUE,
  serie varchar(10),
  folio varchar(20),
  -- Datos del emisor (el proveedor)
  emisor_rfc varchar(13) NOT NULL,
  emisor_razon_social varchar(300),
  fecha_emision timestamp NOT NULL,
  subtotal decimal(14,2) NOT NULL,
  iva decimal(14,2) NOT NULL DEFAULT 0,
  total decimal(14,2) NOT NULL,
  moneda varchar(10) NOT NULL DEFAULT 'MXN',
  descripcion text NOT NULL,
  categoria varchar(100),
  estado varchar(30) NOT NULL DEFAULT 'vigente', -- vigente | cancelada
  verificada boolean NOT NULL DEFAULT false,     -- Validada contra SAT
  xml_url varchar(500),
  pdf_url varchar(500),
  notas text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facturas_recibidas_condominio ON facturas_recibidas(condominio_id);
CREATE INDEX IF NOT EXISTS idx_facturas_recibidas_proveedor ON facturas_recibidas(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_recibidas_gasto ON facturas_recibidas(gasto_id);
CREATE INDEX IF NOT EXISTS idx_facturas_recibidas_fecha ON facturas_recibidas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_recibidas_emisor_rfc ON facturas_recibidas(emisor_rfc);

COMMENT ON TABLE facturas_recibidas IS 'CFDI recibidos de proveedores externos. El proveedor cobra al condominio y entrega su factura; se registra y vincula al gasto correspondiente.';
