/**
 * Default Supabase bridge credentials for the CIF locked-data tables.
 *
 * These are the PUBLISHABLE (anon, read-only) credentials shared by the
 * maintainer for the consumer app — by design they ship to every browser
 * (RLS enforces SELECT-only; writes require the service_role key which never
 * lives here). Environment variables override them.
 */
export const SUPABASE_DEFAULTS = {
  url: "https://uqtvjerhgvwoxiejvrli.supabase.co",
  publishableKey: "sb_publishable_I1cuZB_Tehkh6N4_1LgCDg_fRXH9rfg",
} as const;
