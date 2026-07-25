import { createClient } from '@supabase/supabase-js';

// Singleton real — una sola instancia de GoTrueClient para toda la app.
// Antes esta función llamaba createClient() en cada invocación, y como se
// invoca dentro del cuerpo de cada componente (no en useEffect/useMemo), cada
// re-render de cada página que la usa creaba un cliente nuevo. Con 15 páginas/
// componentes llamándola así, una sesión con varias interacciones terminaba
// con decenas de instancias de GoTrueClient compitiendo por la misma sesión
// de auth en el mismo tab — exactamente lo que advierte el warning de
// Supabase, y fuente probable de refetches/estado inconsistente no
// determinístico en cualquier pantalla, no solo /compras.
const client = createClient(
  'https://ngawmyhrfgdckjyynhbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYXdteWhyZmdkY2tqeXluaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTM3MzQsImV4cCI6MjA4NTE4OTczNH0.Drp40nu7XyRz6dWmlbgGBiqdSxlwPzubj-lX48N6JSs'
);

export function getSupabaseClient() {
  return client;
}
