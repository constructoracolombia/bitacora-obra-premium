-- Código legible para cada requisición: REQ-2026-001
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS codigo text UNIQUE;

-- Función que genera el código automáticamente al insertar
CREATE OR REPLACE FUNCTION generar_codigo_requisicion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  anio text := to_char(NOW(), 'YYYY');
  seq  integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(codigo, '-', 3) AS integer)), 0
  ) + 1
  INTO seq
  FROM requisiciones
  WHERE codigo LIKE 'REQ-' || anio || '-%';

  NEW.codigo := 'REQ-' || anio || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_codigo_requisicion ON requisiciones;
CREATE TRIGGER trigger_codigo_requisicion
  BEFORE INSERT ON requisiciones
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL)
  EXECUTE FUNCTION generar_codigo_requisicion();

-- Backfill requisiciones existentes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM requisiciones
  WHERE codigo IS NULL
)
UPDATE requisiciones r
SET codigo = 'REQ-2026-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE r.id = n.id;
