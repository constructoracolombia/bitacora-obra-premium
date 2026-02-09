-- Extender bitacora_diaria con clima, actividades_realizadas, reportado_por, updated_at
ALTER TABLE bitacora_diaria
  ADD COLUMN IF NOT EXISTS clima TEXT,
  ADD COLUMN IF NOT EXISTS actividades_realizadas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reportado_por TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger para updated_at en bitacora_diaria
CREATE OR REPLACE FUNCTION update_bitacora_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bitacora_updated_at ON bitacora_diaria;
CREATE TRIGGER trigger_bitacora_updated_at
  BEFORE UPDATE ON bitacora_diaria
  FOR EACH ROW
  EXECUTE PROCEDURE update_bitacora_updated_at();
