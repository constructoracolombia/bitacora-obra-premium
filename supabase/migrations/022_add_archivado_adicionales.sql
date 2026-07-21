-- 022_add_archivado_adicionales.sql
-- Archivado de adicionales (solo oculta de la vista activa, no borra nada)

ALTER TABLE adicionales ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_adicionales_archivado ON adicionales(archivado);
