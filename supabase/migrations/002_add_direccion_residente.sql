-- Añadir columnas direccion y residente_asignado a hoja_vida_proyecto
ALTER TABLE hoja_vida_proyecto
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS residente_asignado TEXT;
