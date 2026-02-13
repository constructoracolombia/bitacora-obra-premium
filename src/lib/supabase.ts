import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      'https://korjxxpjnjsgbeznukhx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvcmp4eHBqbmpzZ2Jlem51a2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTQzMzcsImV4cCI6MjA4NTYzMDMzN30.xw35oUfk7KybQiCl8B9ly84NQ5UUO2aYzwr8GZAbS1I'
    );
  }
  return supabaseInstance;
}
