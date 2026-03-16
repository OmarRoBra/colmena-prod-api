CREATE TABLE IF NOT EXISTS automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid REFERENCES condominios(id) ON DELETE CASCADE,
  tipo varchar(50) NOT NULL DEFAULT 'sweep',
  estado varchar(30) NOT NULL DEFAULT 'running',
  summary json,
  error text,
  started_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
