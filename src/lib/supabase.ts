import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://obwygaccpfekzjmutjeo.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_jGCCysVbb0ljd0m8NEJOFA_eFZ3NRll';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[HIMU Supabase] Missing Supabase environment variables. Falling back to local offline mode.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
