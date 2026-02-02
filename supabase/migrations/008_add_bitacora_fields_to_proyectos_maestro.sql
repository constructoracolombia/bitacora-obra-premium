-- Añadir campos opcionales de Bitácora a proyectos_maestro (tabla compartida con Finanzas)
-- Estos campos permiten a la App Bitácora extender proyectos con datos específicos
-- NOTA: La tabla proyectos_maestro debe existir (creada por la App de Finanzas)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proyectos_maestro') THEN
    RAISE NOTICE 'Tabla proyectos_maestro no existe. Crea la tabla desde la App de Finanzas antes de ejecutar esta migración.';
    RETURN;
  END IF;

  -- lista_actividades: JSONB para alcance cerrado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proyectos_maestro' AND column_name = 'lista_actividades'
  ) THEN
    ALTER TABLE proyectos_maestro ADD COLUMN lista_actividades JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- planos_url: array de URLs de planos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proyectos_maestro' AND column_name = 'planos_url'
  ) THEN
    ALTER TABLE proyectos_maestro ADD COLUMN planos_url TEXT[] DEFAULT '{}';
  END IF;

  -- renders_url: array de URLs de renders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proyectos_maestro' AND column_name = 'renders_url'
  ) THEN
    ALTER TABLE proyectos_maestro ADD COLUMN renders_url TEXT[] DEFAULT '{}';
  END IF;

  -- checklist_calidad: JSONB para control de calidad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proyectos_maestro' AND column_name = 'checklist_calidad'
  ) THEN
    ALTER TABLE proyectos_maestro ADD COLUMN checklist_calidad JSONB DEFAULT '[]'::jsonb;
  END IF;
END;
$$;
