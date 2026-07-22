-- 024_add_recibido_compras.sql
-- Agrega el paso "Recibido" al flujo de compras: Pendiente → Comprado → Recibido.
-- Un ítem solo puede marcarse recibido si ya está comprado (se valida en la app,
-- no aquí — mismo criterio que el resto de la tabla, sin CHECK constraints extra).

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS recibido    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recibido_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_compras_recibido ON compras(recibido);

COMMENT ON COLUMN compras.recibido IS 'Paso posterior a comprado: el ítem llegó a obra/bodega';
COMMENT ON COLUMN compras.recibido_at IS 'Fecha/hora en que se marcó recibido';
