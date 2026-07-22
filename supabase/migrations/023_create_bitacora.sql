-- 023_create_bitacora.sql
-- Sección Bitácora: registro de avances y pendientes por proyecto, compartible al cliente.
--
-- DEUDA TÉCNICA: esta app aún no tiene Supabase Auth (usa anon key + clave estática vía
-- KeyGuard). RLS provisional TO public USING (true) — mismo nivel de exposición que el
-- resto de tablas de la app. Migrar a políticas por auth.uid() cuando se implemente Auth.

-- 1. TABLA: bitacora_entradas
-- Feed cronológico de avances por proyecto
-- ============================================

CREATE TABLE IF NOT EXISTS bitacora_entradas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID        NOT NULL REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
  titulo      TEXT        NOT NULL,
  descripcion TEXT,
  video_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_entradas_proyecto ON bitacora_entradas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_entradas_fecha    ON bitacora_entradas(proyecto_id, fecha DESC);

ALTER TABLE bitacora_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo bitacora_entradas"
  ON bitacora_entradas FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE bitacora_entradas IS 'Feed cronológico de avances de obra por proyecto (sección Bitácora)';

-- 2. TABLA: bitacora_fotos
-- Galería de fotos por entrada de avance
-- ============================================

CREATE TABLE IF NOT EXISTS bitacora_fotos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES bitacora_entradas(id) ON DELETE CASCADE,
  foto_url   TEXT NOT NULL,
  orden      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bitacora_fotos_entrada ON bitacora_fotos(entrada_id, orden);

ALTER TABLE bitacora_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo bitacora_fotos"
  ON bitacora_fotos FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE bitacora_fotos IS 'Fotos asociadas a una entrada de avance (bitacora_entradas). Storage: bucket alcance-imagenes, path bitacora/{entrada_id}/{n}.{ext}';

-- 3. TABLA: bitacora_tareas
-- Lista "Por Hacer" — tareas de ejecución de obra, interna (no visible en el portal público)
-- ============================================

CREATE TABLE IF NOT EXISTS bitacora_tareas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID        NOT NULL REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  descripcion TEXT        NOT NULL,
  hecha       BOOLEAN     NOT NULL DEFAULT false,
  orden       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_tareas_proyecto ON bitacora_tareas(proyecto_id, orden);
CREATE INDEX IF NOT EXISTS idx_bitacora_tareas_hecha     ON bitacora_tareas(hecha);

ALTER TABLE bitacora_tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo bitacora_tareas"
  ON bitacora_tareas FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE bitacora_tareas IS 'Tareas de ejecución de obra ("Por Hacer") por proyecto. Distinta de compras. Interna — no se expone en el portal público del cliente.';

-- 4. TABLA: bitacora_compartidos
-- Token no adivinable por proyecto para el portal público /obra/[token]
-- La lectura del portal se hace vía API route con service_role, no con anon key directa.
-- ============================================

CREATE TABLE IF NOT EXISTS bitacora_compartidos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID        NOT NULL REFERENCES proyectos_maestro(id) ON DELETE CASCADE,
  token       UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (proyecto_id),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_bitacora_compartidos_token ON bitacora_compartidos(token);

ALTER TABLE bitacora_compartidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo bitacora_compartidos"
  ON bitacora_compartidos FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE bitacora_compartidos IS 'Mapea token público único -> proyecto_id para /obra/[token]. Un token por proyecto (UNIQUE proyecto_id): reutilizable, no expira.';
