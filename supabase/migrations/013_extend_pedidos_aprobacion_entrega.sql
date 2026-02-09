-- Extender pedidos_material con campos de aprobación y entrega
ALTER TABLE pedidos_material
  ADD COLUMN IF NOT EXISTS aprobado_por TEXT,
  ADD COLUMN IF NOT EXISTS fecha_solicitud DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion DATE,
  ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
  ADD COLUMN IF NOT EXISTS notas TEXT;
