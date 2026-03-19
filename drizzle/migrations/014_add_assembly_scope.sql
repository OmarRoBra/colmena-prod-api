ALTER TABLE asambleas
ADD COLUMN scope varchar(20) NOT NULL DEFAULT 'general',
ADD COLUMN comite_id uuid REFERENCES comites(id) ON DELETE SET NULL;
