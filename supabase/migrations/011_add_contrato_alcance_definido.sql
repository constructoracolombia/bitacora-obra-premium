-- Añadir columnas para contrato y alcance definido
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS contrato_url TEXT;
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS alcance_definido BOOLEAN DEFAULT false;
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS alcance_text TEXT;
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS proyecto_nombre TEXT;
