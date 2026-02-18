import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://korjxxpjnjsgbeznukhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvcmp4eHBqbmpzZ2Jlem51a2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTQzMzcsImV4cCI6MjA4NTYzMDMzN30.xw35oUfk7KybQiCl8B9ly84NQ5UUO2aYzwr8GZAbS1I';

export const supabase = createClient(supabaseUrl, supabaseKey);
