-- 020_create_compras.sql
-- Lista global de compras transversal a todos los proyectos
--
-- ON DELETE CASCADE: las compras son operativas, no históricas con valor contable.
-- Si se elimina un proyecto sus compras pendientes pierden sentido. Si en el futuro
-- se necesita historial financiero, se puede cambiar a RESTRICT y archivar en lugar
-- de eliminar proyectos.

CREATE TABLE IF NOT EXISTS compras (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item        TEXT        NOT NULL,
  cantidad    NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unidad      TEXT        NOT NULL DEFAULT 'und',
  proyecto_id UUID        NOT NULL REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  comprado    BOOLEAN     NOT NULL DEFAULT false,
  comprado_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compras_proyecto ON compras(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_compras_comprado ON compras(comprado);
CREATE INDEX IF NOT EXISTS idx_compras_created  ON compras(created_at DESC);

CREATE TRIGGER trigger_compras_updated_at
  BEFORE UPDATE ON compras
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo compras"
  ON compras FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE compras IS 'Lista global de ítems a comprar por proyecto. Un ítem por fila aunque sea el mismo material para distintas obras.';
