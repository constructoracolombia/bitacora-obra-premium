-- Campos para marcar pedido como consumido
ALTER TABLE pedidos_material
  ADD COLUMN IF NOT EXISTS cantidad_real NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS costo_real NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS factura_url TEXT,
  ADD COLUMN IF NOT EXISTS fecha_consumo DATE,
  ADD COLUMN IF NOT EXISTS notas_consumo TEXT;
