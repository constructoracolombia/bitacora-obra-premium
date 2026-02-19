ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS fecha_solicitada TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS fecha_aprobada TIMESTAMPTZ;
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS fecha_comprada TIMESTAMPTZ;
ALTER TABLE requisiciones ADD COLUMN IF NOT EXISTS fecha_recibida TIMESTAMPTZ;

UPDATE requisiciones
SET fecha_solicitada = COALESCE(fecha_solicitada, created_at)
WHERE fecha_solicitada IS NULL;
