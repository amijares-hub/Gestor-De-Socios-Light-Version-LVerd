import { createClient } from '@supabase/supabase-js';

// URL y Anon Key por defecto para evitar colapsos en Vercel
const DEFAULT_URL = 'https://chhlemxyddpqwpwotbpl.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaGxlbXh5ZGRwcXdwd290YnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg5ODU4NzQsImV4cCI6MjAyNDU2MTzgNzR9.PLACEHOLDER';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);