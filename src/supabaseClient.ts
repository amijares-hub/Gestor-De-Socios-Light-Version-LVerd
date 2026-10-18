import { createClient } from '@supabase/supabase-js';

// URL y Clave por defecto de respaldo
const DEFAULT_URL = 'https://chhlemxyddpqwpwotbpl.supabase.co';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaGxlbXh5ZGRwcXdwd290YnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg5ODU4NzQsImV4cCI6MjAyNDU2MTzgNzR9.PLACEHOLDER';

const sanitizeUrl = (url?: string): string => {
  if (!url) return DEFAULT_URL;
  let clean = url.trim().replace(/^["']|["']$/g, '');
  if (!clean) return DEFAULT_URL;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  // Elimina barras diagonales al final para evitar rutas duplicadas
  return clean.replace(/\/+$/, '');
};

const sanitizeKey = (key?: string): string => {
  if (!key) return DEFAULT_KEY;
  const clean = key.trim().replace(/^["']|["']$/g, '');
  return clean || DEFAULT_KEY;
};

const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;

const envKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    : undefined;

const supabaseUrl = sanitizeUrl(envUrl);
const supabaseAnonKey = sanitizeKey(envKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});