// Tipos y helpers compartidos entre /bitacora y la sección "Alcance" del
// detalle de proyecto — ambos leen/escriben las mismas bitacora_entradas,
// no dos registros paralelos.

export const BITACORA_BUCKET = "alcance-imagenes";

export interface Foto {
  id: string;
  foto_url: string;
  orden: number;
}

export interface EntradaBase {
  id: string;
  proyecto_id: string;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  fotos: Foto[];
}

export function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BITACORA_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}
