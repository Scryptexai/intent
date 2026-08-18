import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_DEFAULTS } from "@/lib/supabase/defaults";

/**
 * Supabase bridge (ApplicationBlueprint §10): the CIF source-of-truth repo
 * syncs its locked exports into shared, read-for-everyone tables. The app
 * reads them with the publishable (anon) key; writes happen only via the
 * upstream sync script with the service_role key.
 *
 * Client-side queries run in the user's browser (reachable from production
 * deployments); server-side usage falls back to the vendored snapshot when
 * the egress is blocked (e.g. this sandbox).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_DEFAULTS.url;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  SUPABASE_DEFAULTS.publishableKey;

export const isSupabaseConfigured = Boolean(url && key);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-cif-app": "intent" } },
    });
  }
  return _client;
}
