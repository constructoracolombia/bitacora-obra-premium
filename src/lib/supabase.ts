import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngawmyhrfgdckjyynhbr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYXdteWhyZmdkY2tqeXluaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTM3MzQsImV4cCI6MjA4NTE4OTczNH0.Drp40nu7XyRz6dWmlbgGBiqdSxlwPzubj-lX48N6JSs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
