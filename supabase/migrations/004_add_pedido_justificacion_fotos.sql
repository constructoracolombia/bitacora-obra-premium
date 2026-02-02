-- Añadir justificación y fotos a pedidos de material
ALTER TABLE pedidos_material
  ADD COLUMN IF NOT EXISTS justificacion TEXT,
  ADD COLUMN IF NOT EXISTS fotos_url TEXT[] DEFAULT '{}';
