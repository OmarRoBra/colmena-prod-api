-- Reconciliation sessions
CREATE TABLE IF NOT EXISTS conciliaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  archivo_original VARCHAR(255),
  total_movimientos INTEGER NOT NULL DEFAULT 0,
  total_conciliados INTEGER NOT NULL DEFAULT 0,
  total_ignorados INTEGER NOT NULL DEFAULT 0,
  total_pendientes INTEGER NOT NULL DEFAULT 0,
  cerrado_por UUID REFERENCES usuarios(id),
  cerrado_at TIMESTAMP,
  notas TEXT,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bank statement movements within a reconciliation session
CREATE TABLE IF NOT EXISTS conciliacion_movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conciliacion_id UUID NOT NULL REFERENCES conciliaciones(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  referencia_banco VARCHAR(100),
  monto DECIMAL(12,2) NOT NULL,
  tipo VARCHAR(10) NOT NULL, -- ingreso, egreso
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente, conciliado, ignorado, nuevo_gasto
  confianza INTEGER,
  pago_id UUID REFERENCES pagos(id),
  gasto_id UUID REFERENCES gastos(id),
  confirmado_por UUID REFERENCES usuarios(id),
  confirmado_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
