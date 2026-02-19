-- Extend actividades_proyecto with CPM (Critical Path Method) fields
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS duracion_dias INTEGER DEFAULT 1;
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS fecha_inicio_estimada DATE;
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS fecha_fin_estimada DATE;
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS es_critica BOOLEAN DEFAULT FALSE;
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS holgura_dias INTEGER DEFAULT 0;
ALTER TABLE actividades_proyecto ADD COLUMN IF NOT EXISTS predecesoras TEXT[] DEFAULT '{}';
