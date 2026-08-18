import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_DEFAULTS } from "@/lib/supabase/defaults";

/**
 * Server-side Supabase client (service_role) — TIDAK PERNAH diekspos ke browser.
 * Frontend membaca data lewat /api/data/catalog (route server), sehingga data
 * ter-load walau policy SELECT untuk role `anon` belum ada (RLS §10.4 upstream).
 * Tanpa SUPABASE_SERVICE_ROLE_KEY → route jatuh ke snapshot vendored.
 */
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_DEFAULTS.url;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
