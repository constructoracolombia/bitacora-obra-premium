-- ============================================
-- Bitácora Obra Premium - Schema SQL
-- Supabase Migration
-- ============================================

-- 1. ENUM TYPES
-- ============================================

CREATE TYPE pedido_material_estado AS ENUM (
  'PENDING',
  'APPROVED',
  'DELIVERED',
  'CONSUMED'
);

CREATE TYPE gantt_actividad_estado AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'DELAYED'
);

-- 2. TABLES
-- ============================================

-- Tabla principal de proyectos (referenciada por proyecto_id en otras tablas)
CREATE TABLE hoja_vida_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre TEXT,
  presupuesto_id UUID,
  lista_actividades JSONB DEFAULT '[]'::jsonb,
  renders_url TEXT[] DEFAULT '{}',
  planos_url TEXT[] DEFAULT '{}',
  fecha_inicio DATE,
  fecha_entrega_estimada DATE,
  porcentaje_avance NUMERIC(5, 2) DEFAULT 0 CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla bitácora diaria
CREATE TABLE bitacora_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES hoja_vida_proyecto(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  novedades TEXT,
  personal_count INTEGER DEFAULT 0,
  fotos_url TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proyecto_id, fecha)
);

-- Tabla pedidos de material
CREATE TABLE pedidos_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES hoja_vida_proyecto(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  cantidad NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unidad TEXT,
  estado pedido_material_estado DEFAULT 'PENDING',
  costo_estimado NUMERIC(12, 2),
  presupuesto_original NUMERIC(12, 2),
  solicitado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla programación Gantt
CREATE TABLE programacion_gantt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES hoja_vida_proyecto(id) ON DELETE CASCADE,
  actividad TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado gantt_actividad_estado DEFAULT 'PENDING',
  hito_critico BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

-- 3. ÍNDICES
-- ============================================

-- hoja_vida_proyecto
CREATE INDEX idx_hoja_vida_proyecto_presupuesto ON hoja_vida_proyecto(presupuesto_id);
CREATE INDEX idx_hoja_vida_proyecto_fecha_inicio ON hoja_vida_proyecto(fecha_inicio);
CREATE INDEX idx_hoja_vida_proyecto_cliente ON hoja_vida_proyecto(cliente_nombre);

-- bitacora_diaria
CREATE INDEX idx_bitacora_diaria_proyecto ON bitacora_diaria(proyecto_id);
CREATE INDEX idx_bitacora_diaria_fecha ON bitacora_diaria(fecha);
CREATE INDEX idx_bitacora_diaria_proyecto_fecha ON bitacora_diaria(proyecto_id, fecha);

-- pedidos_material
CREATE INDEX idx_pedidos_material_proyecto ON pedidos_material(proyecto_id);
CREATE INDEX idx_pedidos_material_estado ON pedidos_material(estado);
CREATE INDEX idx_pedidos_material_proyecto_estado ON pedidos_material(proyecto_id, estado);
CREATE INDEX idx_pedidos_material_created_at ON pedidos_material(created_at DESC);

-- programacion_gantt
CREATE INDEX idx_programacion_gantt_proyecto ON programacion_gantt(proyecto_id);
CREATE INDEX idx_programacion_gantt_estado ON programacion_gantt(estado);
CREATE INDEX idx_programacion_gantt_fechas ON programacion_gantt(fecha_inicio, fecha_fin);
CREATE INDEX idx_programacion_gantt_hito ON programacion_gantt(hito_critico) WHERE hito_critico = true;

-- 4. TRIGGER para updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedidos_material_updated_at
  BEFORE UPDATE ON pedidos_material
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE hoja_vida_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE programacion_gantt ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados (acceso completo)
-- Ajusta según tu modelo de permisos (ej: por organización, por usuario asignado)

CREATE POLICY "Usuarios autenticados pueden ver proyectos"
  ON hoja_vida_proyecto FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear proyectos"
  ON hoja_vida_proyecto FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar proyectos"
  ON hoja_vida_proyecto FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar proyectos"
  ON hoja_vida_proyecto FOR DELETE
  TO authenticated
  USING (true);

-- bitacora_diaria
CREATE POLICY "Usuarios autenticados pueden ver bitácora"
  ON bitacora_diaria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear bitácora"
  ON bitacora_diaria FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar bitácora"
  ON bitacora_diaria FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar bitácora"
  ON bitacora_diaria FOR DELETE
  TO authenticated
  USING (true);

-- pedidos_material
CREATE POLICY "Usuarios autenticados pueden ver pedidos"
  ON pedidos_material FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pedidos"
  ON pedidos_material FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pedidos"
  ON pedidos_material FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pedidos"
  ON pedidos_material FOR DELETE
  TO authenticated
  USING (true);

-- programacion_gantt
CREATE POLICY "Usuarios autenticados pueden ver gantt"
  ON programacion_gantt FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gantt"
  ON programacion_gantt FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar gantt"
  ON programacion_gantt FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar gantt"
  ON programacion_gantt FOR DELETE
  TO authenticated
  USING (true);

-- 6. COMENTARIOS (opcional, documentación)
-- ============================================

COMMENT ON TABLE hoja_vida_proyecto IS 'Información principal de cada proyecto de obra';
COMMENT ON TABLE bitacora_diaria IS 'Registro diario de novedades y actividades por proyecto';
COMMENT ON TABLE pedidos_material IS 'Pedidos de materiales asociados a proyectos';
COMMENT ON TABLE programacion_gantt IS 'Actividades y cronograma Gantt por proyecto';
