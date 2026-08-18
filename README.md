# intent

# CIF · Forensic Intelligence

> Strategic Co-Pilot for advanced crypto users. Raw data in → **viral, evidence-backed content** out.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style UI · cmdk · React Flow · ECharts · Drizzle ORM · Vercel AI SDK**.

## Dokumentasi (baca duluan untuk sesi/developer baru)

| Doc | Isi |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Aturan main: branch/push, run & test, konvensi, pitfall lingkungan |
| [`docs/CONTEXT.md`](./docs/CONTEXT.md) | Tujuan platform, positioning, trust rules, relasi ke repo upstream |
| [`docs/CODE-STRUCTURE.md`](./docs/CODE-STRUCTURE.md) | Peta kode + "ubah apa di mana" |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Status selesai, prioritas next-session, guardrails |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Runbook Vercel + domain real + verifikasi & fix RLS Supabase |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Posture & audit: 0 critical/0 high, hardening, residual risk |
| [`docs/PRODUCTION-READINESS.md`](./docs/PRODUCTION-READINESS.md) | Gap analysis production/enterprise: blocker, fitur, UI/UX, security, prioritas |
| [`docs/API.md`](./docs/API.md) | AuthN/RBAC/API keys/cron/CSRF/rate-limit (enterprise model) |
| [`docs/GOOGLE-OAUTH.md`](./docs/GOOGLE-OAUTH.md) | Sign in with Google: implementasi + runbook approval consent screen |
| [`docs/MARKETING.md`](./docs/MARKETING.md) | Marketing kit: konteks produk penuh, diferensiator, value per tier, messaging, playbook launch |
| [`openapi.yaml`](./openapi.yaml) | Spesifikasi API (v1 + auth + health) · `perf/load-test.js` untuk k6 |
| `/upgrade` (alias `/pricing`) | Halaman langganan production-grade ala platform besar: judul tier + kalimat nilai, matriks fitur Gratis vs Pro (✓ / —), kartu checkout sticky (Stripe / PayPal / USDT ETH & Solana), FAQ. Uji coba 30 hari; aktivasi otomatis setelah pembayaran terkonfirmasi. Tier: Pro $49 & Ultimate $189 (multi-market: saham, AI & Tech, komoditas) |
| Support widget | "Rara" — human-feel, full platform knowledge, grounding akun live, eskalasi tiket |

---

## Brand

| Token | Value |
|---|---|
| `cif-bg` | `#0B0E11` |
| `cif-surface` | `#161B22` |
| `cif-blue` | `#2563EB` |
| `cif-amber` | `#F59E0B` |
| Fonts | Inter + JetBrains Mono |

## Modules (dynamic, DB-backed)

Every card, chart and number is fetched at runtime — no hardcoded UI data.

| Module | Route | Data flow |
|---|---|---|
| **The Sentinel** | `/` | `useQuery(["anomalies"])` → `/api/anomalies` (refetch 1h) · click row → deviation side-panel (`/api/anomalies/[id]`: 30d μ/σ chart, analog link, knowledge) · **Acknowledge** + **Create Alert** (watchlist) · skeletons |
| **The Mirror** | `/mirror` | `useQuery(["mirror", target])` → `/api/mirror` (`services/similarity-engine.ts`, persisted `feature_vectors`) · analog cards click → `/project/[slug]` · composite **Mirror Verdict** |
| **The Origin** | `/origin` | `/api/actors` (claims-based credibility) · actor click → full claim-history modal · `/api/narratives` Truth Matrix (heatmap merah→hijau, 24h refresh) |
| **The Multiverse** | `/multiverse` | `/api/multiverse` decision chain → React Flow (◆ decision amber · ▬ catalyst · ● outcome) · node click → dossier · **Add Branch** (counter-factual) |
| **The Edge** | `/edge` | Pro-gated sandbox: variable dropdown + slider → `/api/edge/simulate` (1,000 paths live) · **Apply Simulation** → saved + shareable (`/api/edge/simulations`) |
| **Content Studio** | `/studio` | split-screen · stream via Vercel AI SDK / local composer · **Regenerate** · tones: professional / casual / controversial · Truth Cards · quota badge |
| **Project Detail** | `/project/[slug]` | 7 tabs: Overview · Multiverse · Mirror · Origin · Timeline · Knowledge · Signals — all from `/api/projects/[slug]` |

### Architecture

```
src/services/          # backend domain services (error handling + logging)
  anomaly-detection.ts   scanAnomalies() · acknowledge · detail · scan logs
  similarity-engine.ts   findAnalogProject() over 500 persisted vectors
  actor-credibility.ts   getActorCredibility() from actor_claims
  truth-matrix.ts        getTruthMatrix() · refreshTruthMatrix() (24h)
  decision-chain.ts      getDecisionChain() · addBranch()
  simulator.ts           runSimulation(variable, value) · save/list sims
  content-generator.ts   prepareGeneration() · createLocalStream()
  project-detail.ts      deep-dive aggregator
src/stores/            # zustand: useSentinelStore · useMirrorStore · useEdgeStore
@tanstack/react-query  # all lists/cards via useQuery + skeletons
*.test.ts              # vitest — `npm test` (22 tests)
```

New tables (migration `0001`): `anomaly_logs`, `actor_claims`, `narratives`,
`narrative_evidence`, `feature_vectors`, `simulations`.

## CIF locked-data integration (`cif-export/1`)

The product blueprint of the upstream Crypto Intelligence Framework repo is still
evolving, but its **data schema is locked**. INTENT therefore adapts to the data,
not vice-versa: a vendored snapshot of the locked machine exports lives in
`src/data/cif/*.json` (27 curated projects · 289 Decision Events · 1,154 entities ·
915 knowledge items · 16 registry patterns · conflicts · QA · behavior · 3 backtests).

- `src/lib/cif/types.ts` — TypeScript contracts of the locked schema (DecisionEvent
  causal chain incl. Hidden factors & 8-POV reactions, entities, knowledge with
  citation trail, patterns with `scope`/`confidence`, conflicts A/B, QA dimensions).
- `src/services/cif-loader.ts` — loads & merges the catalog into the store
  (idempotent; links existing slugs, adds unseen projects), plus dossier/stats helpers.
- `GET /api/cif` (+ `?q=` entity search) and `GET /api/cif/[slug]` (full dossier).
- UI surfaces: Sentinel catalog chip · Project Detail (CIF badge, CIF Score sebagai
  *research completeness* dengan 6 dimensi, behavioral intelligence, conflict center,
  causal dossier Decision Events dengan side-panel kausal lengkap, timeline historis,
  entity graph, knowledge + evidenceText citations) · Mirror (registry P-codes dengan
  confidence & scope) · Origin (entity graph explorer).

### Supabase bridge (live)

`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.local`)
menghubungkan frontend ke tabel CIF-owned yang read-for-everyone: `cif_projects`,
`cif_patterns`, `cif_backtests`, `entities`, `evidence_items` (skema live dikonfirmasi
di ApplicationBlueprint §10.1). `src/lib/supabase/client.ts` + `src/hooks/use-cif-live.ts`
meng-query dari **browser** (deploy produksi & live preview dapat menjangkau Supabase);
server memakai probe ber-cache (`supabaseServerStatus`) dan fallback snapshot bila
egress diblok. Sentinel chip, Origin entity explorer, dan Mirror registry patterns
otomatis menampilkan sumber LIVE bila bridge terjangkau. Writes tetap hanya via
sync script upstream (service_role) — app ini read-only terhadap bridge.

## AI Content Studio (killer feature)

`POST /api/generate-content`

```json
{ "sourceType": "airdrop", "sourceId": "p-blur", "templateId": "tpl-thread-analyst", "tone": "professional" }
```

1. Fetches source data (airdrop stats + POV Matrix + Decision Events + patterns + knowledge) → clean JSON.
2. Loads the template's **system prompt from the DB** (`content_templates`).
3. With `OPENAI_API_KEY`: streams via Vercel AI SDK `streamText` (`@ai-sdk/openai`). Without it: a deterministic local composer streams a real data-anchored draft so the full loop works offline.
4. Draft persists to `content_drafts`; sharing records a `share_url` + **"Powered by CIF"** badge.

Templates shipped: **Thread Analyst**, **TL;DR**, **Data Drop**, **LinkedIn Brief**.

## Viral loop

- **Truth Cards** — `/api/og/truth-card?stat=38%25&label=...` renders a 1200×630 branded PNG server-side via `next/og` (the App-Router successor of `@vercel/og`); downloadable from the Studio.
- **Free tier**: 2 demo projects (Blur, Arbitrum), 3 AI generations/day.
- **Pro tier**: 500+ universe, unlimited generations, watchlist, The Edge. Toggle in the topbar (checkout simulated).

## Running

```bash
npm install
npm run dev        # http://localhost:3000
```

No credentials needed — the app boots on a deterministic in-memory seed (500 projects, 16 patterns, 1,039 knowledge items, POV matrices, causal trees).

### Optional production wiring (`.env.local`, see `.env.example`)

| Var | Activates |
|---|---|
| `DATABASE_URL` | Neon Postgres via Drizzle ORM (`npm run db:generate` / `db:push` with drizzle-kit; schema in `src/lib/db/schema.ts`) |
| `REDIS_URL` | BullMQ queue + worker for The Sentinel (6h repeatable job) |
| `OPENAI_API_KEY` | Real AI generation via Vercel AI SDK |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | Direct Post to X (OAuth placeholder — UI is fully wired) |

## Data model (Drizzle, Postgres)

Core: `users`, `projects`, `entities`, `events`, `signals`, `knowledge_items`, `conflicts`, `patterns`
Studio: `content_templates`, `content_drafts`
Subscription & ops: `watchlists`, `alerts`, `usage_events`
