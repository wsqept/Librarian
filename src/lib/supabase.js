import { createClient } from '@supabase/supabase-js';

let client = null;

export function initSupabase() {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
  }

  client = createClient(url, key);
  return client;
}

export function getSupabase() {
  if (!client) {
    return initSupabase();
  }
  return client;
}
