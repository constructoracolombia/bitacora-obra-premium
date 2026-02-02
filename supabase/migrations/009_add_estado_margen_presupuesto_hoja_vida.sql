-- Añadir columnas para modo independiente de Bitácora
-- estado, margen_objetivo, presupuesto_total

ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'ACTIVO';
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS margen_objetivo NUMERIC(5, 2) DEFAULT 20;
ALTER TABLE hoja_vida_proyecto ADD COLUMN IF NOT EXISTS presupuesto_total NUMERIC(14, 2);

-- Constraint para estado (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hoja_vida_proyecto_estado_check'
  ) THEN
    ALTER TABLE hoja_vida_proyecto ADD CONSTRAINT hoja_vida_proyecto_estado_check
      CHECK (estado IN ('ACTIVO', 'EN_PAUSA', 'TERMINADO'));
  END IF;
END $$;

-- Actualizar proyectos existentes sin estado
UPDATE hoja_vida_proyecto SET estado = 'ACTIVO' WHERE estado IS NULL;
