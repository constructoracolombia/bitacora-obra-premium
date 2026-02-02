-- Añadir porcentaje de avance a programacion_gantt
ALTER TABLE programacion_gantt
  ADD COLUMN IF NOT EXISTS porcentaje_avance NUMERIC(5, 2) DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100);
