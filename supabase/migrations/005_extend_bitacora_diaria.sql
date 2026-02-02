-- Extender bitacora_diaria para Mañana/Tarde, Oficiales/Ayudantes, tipo novedad
ALTER TABLE bitacora_diaria
  ADD COLUMN IF NOT EXISTS oficiales_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ayudantes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fotos_manana TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fotos_tarde TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS novedad_tipo TEXT;
