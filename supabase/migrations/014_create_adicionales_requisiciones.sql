-- ============================================
-- Bitácora Obra Premium - Adicionales & Requisiciones
-- ============================================

-- 1. TABLA: adicionales
-- Gestión de trabajos adicionales por proyecto
-- ============================================

CREATE TABLE IF NOT EXISTS adicionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(14, 2) NOT NULL DEFAULT 0,
  solicitado_por TEXT,
  estado TEXT NOT NULL DEFAULT 'SOLICITUD_CLIENTE'
    CHECK (estado IN (
      'SOLICITUD_CLIENTE',
      'APROBADO_GERENCIA',
      'PAGO_50_CONFIRMADO',
      'EN_EJECUCION',
      'FINALIZADO',
      'SALDO_PENDIENTE'
    )),
  -- Fechas del timeline
  fecha_solicitud TIMESTAMPTZ DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_pago_50 TIMESTAMPTZ,
  fecha_inicio_trabajo TIMESTAMPTZ,
  fecha_finalizacion TIMESTAMPTZ,
  fecha_saldo TIMESTAMPTZ,
  -- Monto del saldo pendiente
  saldo_pendiente NUMERIC(14, 2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_adicionales_proyecto ON adicionales(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_adicionales_estado ON adicionales(estado);
CREATE INDEX IF NOT EXISTS idx_adicionales_created_at ON adicionales(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER trigger_adicionales_updated_at
  BEFORE UPDATE ON adicionales
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE adicionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo adicionales"
  ON adicionales FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================

-- 2. TABLA: requisiciones
-- Requisiciones de materiales por apartamento
-- ============================================

CREATE TABLE IF NOT EXISTS requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL,
  apartamento TEXT NOT NULL,
  tipo_material TEXT NOT NULL DEFAULT 'Otros'
    CHECK (tipo_material IN (
      'Preliminares',
      'Enchapes',
      'Estuco y Pintura',
      'Instalaciones',
      'Drywall',
      'Otros'
    )),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unidad TEXT DEFAULT 'und',
  estado TEXT NOT NULL DEFAULT 'SOLICITADO'
    CHECK (estado IN (
      'SOLICITADO',
      'APROBADO_COMPRA',
      'COMPRADO',
      'RECIBIDO'
    )),
  -- Personas y fechas workflow
  solicitado_por TEXT,
  aprobado_por TEXT,
  fecha_solicitud TIMESTAMPTZ DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_compra TIMESTAMPTZ,
  fecha_entrega_estimada DATE,
  fecha_recepcion TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_requisiciones_proyecto ON requisiciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_estado ON requisiciones(estado);
CREATE INDEX IF NOT EXISTS idx_requisiciones_apartamento ON requisiciones(apartamento);
CREATE INDEX IF NOT EXISTS idx_requisiciones_tipo ON requisiciones(tipo_material);
CREATE INDEX IF NOT EXISTS idx_requisiciones_created_at ON requisiciones(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER trigger_requisiciones_updated_at
  BEFORE UPDATE ON requisiciones
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE requisiciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso completo requisiciones"
  ON requisiciones FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE adicionales IS 'Trabajos adicionales con flujo de aprobación y pago';
COMMENT ON TABLE requisiciones IS 'Requisiciones de material por apartamento con flujo de compra';
