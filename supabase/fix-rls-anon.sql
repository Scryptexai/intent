-- ─────────────────────────────────────────────────────────────────────────────
-- CIF: buka SELECT untuk role `anon` (data riset memang public-read by design).
-- Jalankan di Supabase Dashboard → SQL Editor (pakai kredensial dashboard).
-- TANPA ini, frontend dengan anon/publishable key tidak bisa membaca tabel
-- (gejala: data tidak ter-load). Alternatif tanpa SQL: pakai bridge server-side
-- /api/data/catalog dengan SUPABASE_SERVICE_ROLE_KEY (sudah di-implement).
-- Write TETAP tertutup: tidak ada policy INSERT/UPDATE/DELETE untuk anon.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.cif_projects   enable row level security;
alter table public.cif_patterns   enable row level security;
alter table public.cif_backtests  enable row level security;
alter table public.entities       enable row level security;
alter table public.evidence_items enable row level security;

drop policy if exists cif_public_read_projects   on public.cif_projects;
drop policy if exists cif_public_read_patterns   on public.cif_patterns;
drop policy if exists cif_public_read_backtests  on public.cif_backtests;
drop policy if exists cif_public_read_entities   on public.entities;
drop policy if exists cif_public_read_evidence   on public.evidence_items;

create policy cif_public_read_projects   on public.cif_projects   for select to anon, authenticated using (true);
create policy cif_public_read_patterns   on public.cif_patterns   for select to anon, authenticated using (true);
create policy cif_public_read_backtests  on public.cif_backtests  for select to anon, authenticated using (true);
create policy cif_public_read_entities   on public.entities       for select to anon, authenticated using (true);
create policy cif_public_read_evidence   on public.evidence_items for select to anon, authenticated using (true);
