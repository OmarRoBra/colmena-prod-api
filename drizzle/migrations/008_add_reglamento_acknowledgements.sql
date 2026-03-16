CREATE TABLE IF NOT EXISTS reglamento_acuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reglamento_id uuid NOT NULL REFERENCES reglamentos(id) ON DELETE CASCADE,
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  residente_id uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  version varchar(20) NOT NULL,
  acknowledged_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);
