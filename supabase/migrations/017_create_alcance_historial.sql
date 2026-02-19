CREATE TABLE IF NOT EXISTS alcance_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_alcance_historial_proyecto ON alcance_historial(proyecto_id);

ALTER TABLE alcance_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alcance_historial_full_access" ON alcance_historial FOR ALL USING (true) WITH CHECK (true);
