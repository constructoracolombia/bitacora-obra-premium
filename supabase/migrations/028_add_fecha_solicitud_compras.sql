-- "Fecha Solicitud" pasa de ser solo una vista de created_at (inmutable) a un
-- campo editable — el residente puede corregirla igual que hacía en el Excel.
-- Se separa de created_at para no tocar el timestamp real de creación del
-- registro, que sigue sirviendo para auditoría/orden de inserción.

ALTER TABLE compras ADD COLUMN IF NOT EXISTS fecha_solicitud DATE;

-- Backfill: las filas existentes toman la fecha de su created_at real, para
-- no perder el orden "más antiguo primero" que ya tenían.
UPDATE compras SET fecha_solicitud = created_at::date WHERE fecha_solicitud IS NULL;

ALTER TABLE compras ALTER COLUMN fecha_solicitud SET DEFAULT CURRENT_DATE;
ALTER TABLE compras ALTER COLUMN fecha_solicitud SET NOT NULL;

COMMENT ON COLUMN compras.fecha_solicitud IS 'Fecha del pedido, editable por el usuario (columna "Fecha Solicitud" del Excel) — distinta de created_at';
