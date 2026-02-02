-- Añadir checklist de control de calidad a hoja_vida_proyecto
-- Estructura: [{ id, descripcion, terminado, evidencias: [{ url, fecha }] }]
ALTER TABLE hoja_vida_proyecto
  ADD COLUMN IF NOT EXISTS checklist_calidad JSONB DEFAULT '[]'::jsonb;
