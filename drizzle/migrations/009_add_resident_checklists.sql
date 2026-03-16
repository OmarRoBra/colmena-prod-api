CREATE TABLE IF NOT EXISTS residente_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  residente_id uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  tipo varchar(30) NOT NULL,
  titulo varchar(200) NOT NULL,
  descripcion text,
  estado varchar(30) NOT NULL DEFAULT 'pendiente',
  due_at timestamp,
  completed_at timestamp,
  metadata json,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
