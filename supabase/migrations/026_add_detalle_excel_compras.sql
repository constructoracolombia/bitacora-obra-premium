-- Campos que traía el Excel "Control de compras proyectos" y que /compras no
-- guardaba: para cuándo se necesita, quién lo pidió, y notas de entrega.
-- Proyecto/Centro de Costos ya existen (proyecto_id) — no se duplican.

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS fecha_requerida DATE,
  ADD COLUMN IF NOT EXISTS solicitado_por  TEXT,
  ADD COLUMN IF NOT EXISTS observaciones   TEXT;

COMMENT ON COLUMN compras.fecha_requerida IS 'Fecha en que se necesita el material en obra (columna "Fecha Requerida" del Excel)';
COMMENT ON COLUMN compras.solicitado_por IS 'Quién pidió el material (columna "Solicitado por" del Excel)';
COMMENT ON COLUMN compras.observaciones IS 'Notas de entrega/instrucciones (columna "Observaciones" del Excel)';
