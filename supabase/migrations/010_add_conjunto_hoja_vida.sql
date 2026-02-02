-- Añadir columna conjunto (opcional) a hoja_vida_proyecto
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS conjunto TEXT;
