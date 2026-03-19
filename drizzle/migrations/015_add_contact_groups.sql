CREATE TABLE IF NOT EXISTS grupos_contacto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nombre varchar(200) NOT NULL,
  descripcion text NOT NULL,
  miembros integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grupos_contacto_condominio_id
  ON grupos_contacto(condominio_id);
