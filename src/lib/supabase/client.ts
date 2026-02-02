import { getSupabase } from "@/lib/supabase";

/**
 * @deprecated Use getSupabase() from "@/lib/supabase" instead.
 * Mantiene compatibilidad con imports existentes.
 */
export function createClient() {
  return getSupabase();
}
