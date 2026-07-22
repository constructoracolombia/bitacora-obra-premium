// Lógica de programación de obra compartida entre /calendario (lista global,
// detalle de fila manual) y la sección "Cronograma" del detalle de proyecto
// en Bitácora. No la dupliques en más archivos — importa desde aquí.

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularDiasHabiles } from "@/lib/festivos-colombia";

export { calcularDiasHabiles };

export interface ProgramacionProyecto {
  fechaInicio: string;
  fechaFin: string;
  notas: string | null;
  fuente: "calendario" | "maestro";
  calendarioId: string | null;
}

export function calcularProgreso(inicio: string, fin: string): number {
  const hoy = new Date();
  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);

  if (hoy < fechaInicio) return 0;
  if (hoy > fechaFin) return 100;

  const total = fechaFin.getTime() - fechaInicio.getTime();
  const transcurrido = hoy.getTime() - fechaInicio.getTime();
  return Math.round((transcurrido / total) * 100);
}

export function calcularDiasRestantes(fin: string): number {
  const hoy = new Date();
  const fechaFin = new Date(fin);
  const diff = fechaFin.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Resuelve la programación de UN proyecto con el mismo criterio de
 * conciliación que usa /calendario (lista global): si existe una fila
 * manual en calendario_proyectos, esa manda; si no, se deriva de los
 * campos contractuales de proyectos_maestro (llenados por Finanzas al
 * extraer el contrato). Devuelve null si no hay datos de ninguna fuente.
 */
export async function obtenerProgramacionProyecto(
  supabase: SupabaseClient,
  proyectoId: string
): Promise<ProgramacionProyecto | null> {
  const { data: cal } = await supabase
    .from("calendario_proyectos")
    .select("id, fecha_acta_inicio, fecha_entrega_programada, notas")
    .eq("proyecto_id", proyectoId)
    .maybeSingle();

  if (cal) {
    return {
      fechaInicio: cal.fecha_acta_inicio,
      fechaFin: cal.fecha_entrega_programada,
      notas: cal.notas,
      fuente: "calendario",
      calendarioId: cal.id,
    };
  }

  const { data: maestro } = await supabase
    .from("proyectos_maestro")
    .select("fecha_acta_inicio, fecha_inicio, fecha_entrega_contractual")
    .eq("id", proyectoId)
    .maybeSingle();

  const fechaInicio = maestro?.fecha_acta_inicio || maestro?.fecha_inicio;
  if (maestro && fechaInicio && maestro.fecha_entrega_contractual) {
    return {
      fechaInicio,
      fechaFin: maestro.fecha_entrega_contractual,
      notas: null,
      fuente: "maestro",
      calendarioId: null,
    };
  }

  return null;
}
