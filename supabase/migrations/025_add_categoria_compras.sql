-- 025_add_categoria_compras.sql
-- Categoriza cada ítem de compra para poder agrupar la lista en /compras.
-- 'Otros' como default: mismo valor que usa el formulario cuando el usuario
-- no elige categoría explícitamente, evita filas con categoria nula/inválida.

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Otros'
  CHECK (categoria IN (
    'Ferretería', 'Enchapes', 'Pinturas', 'Eléctrico',
    'Baños', 'Cocina y zona húmeda', 'Piedras y granitos',
    'Divisiones de vidrio y espejos', 'Otros'
  ));

CREATE INDEX IF NOT EXISTS idx_compras_categoria ON compras(categoria);

COMMENT ON COLUMN compras.categoria IS 'Categoría del ítem — agrupa la lista en /compras';
