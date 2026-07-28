-- Separa "ya lo compré" (comprado) de "ya lo cerré del tablero" (archivado).
-- Antes, marcar comprado movía el ítem de inmediato al historial. Ahora un
-- ítem puede quedar marcado Comprado y seguir visible arriba en Pendientes
-- hasta que alguien lo archive a propósito con el botón "Archivar".

ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_compras_archivado ON compras(archivado);

COMMENT ON COLUMN compras.archivado IS 'true = enviado al historial de Comprados. No se pone en true automáticamente al marcar comprado.';
