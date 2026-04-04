-- Agrega proveedor, precio por item y fecha estimada de entrega por requisición
ALTER TABLE requisicion_items
  ADD COLUMN IF NOT EXISTS proveedor text,
  ADD COLUMN IF NOT EXISTS precio integer;

ALTER TABLE requisiciones
  ADD COLUMN IF NOT EXISTS fecha_estimada_entrega date;
