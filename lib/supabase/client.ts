import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseBrowserClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase authentication is not configured.');
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
