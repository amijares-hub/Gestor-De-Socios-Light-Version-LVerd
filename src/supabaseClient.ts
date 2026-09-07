import { createClient } from '@supabase/supabase-js';

// URL y Clave por defecto con sanitización estricta
const DEFAULT_URL = 'https://chhlemxyddpqwpwotbpl.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaGxlbXh5ZGRwcXdwd290YnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg5ODU4NzQsImV4cCI6MjAyNDU2MTzgNzR9.PLACEHOLDER';

const sanitizeUrl = (url?: string): string => {
  if (!url) return DEFAULT_URL;
  let clean = url.trim().replace(/^["']|["']$/g, '');
  if (!clean) return DEFAULT_URL;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean;
};

const sanitizeKey = (key?: string): string => {
  if (!key) return DEFAULT_KEY;
  const clean = key.trim().replace(/^["']|["']$/g, '');
  return clean || DEFAULT_KEY;
};

const supabaseUrl = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);