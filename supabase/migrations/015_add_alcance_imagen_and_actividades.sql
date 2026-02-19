-- Add alcance_imagen column to proyectos_maestro
ALTER TABLE proyectos_maestro ADD COLUMN IF NOT EXISTS alcance_imagen TEXT;

-- Create actividades_proyecto table for Kanban board
CREATE TABLE IF NOT EXISTS actividades_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  porcentaje NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'PENDIENTE',
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividades_proyecto_id ON actividades_proyecto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_actividades_estado ON actividades_proyecto(estado);

ALTER TABLE actividades_proyecto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actividades_full_access" ON actividades_proyecto FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_actividades_updated_at
  BEFORE UPDATE ON actividades_proyecto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
