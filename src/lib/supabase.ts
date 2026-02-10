import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Cliente Supabase singleton optimizado.
 * Reutiliza la misma instancia en todo el ciclo de vida de la aplicación.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

/**
 * Nombre de la tabla de proyectos.
 * Intenta "proyectos_maestro" (tabla compartida con Finanzas).
 * Fallback a "hoja_vida_proyecto" (tabla original de Bitácora).
 */
let resolvedTable: string | null = null;

export async function getProyectosTable(): Promise<string> {
  if (resolvedTable) return resolvedTable;

  const supabase = getSupabase();
  const { error } = await supabase
    .from("proyectos_maestro")
    .select("id")
    .limit(1);

  if (error) {
    console.warn("proyectos_maestro no disponible, usando hoja_vida_proyecto");
    resolvedTable = "hoja_vida_proyecto";
  } else {
    resolvedTable = "proyectos_maestro";
  }

  return resolvedTable;
}
