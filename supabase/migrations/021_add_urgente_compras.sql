-- 021_add_urgente_compras.sql
-- Marcado de urgencia por ítem en /compras

ALTER TABLE compras ADD COLUMN IF NOT EXISTS urgente BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_compras_urgente ON compras(urgente);
