# CODE-STRUCTURE — peta kode INTENT

Next.js 14 App Router · TypeScript strict · Tailwind (brand tokens) · TanStack Query ·
zustand · ECharts · React Flow · cmdk · @uiw/react-md-editor · Drizzle (opsional Neon) ·
@supabase/supabase-js · Vercel AI SDK (opsional OpenAI) · vitest.

```
src/
├── app/                      # App Router: pages + API routes
│   ├── page.tsx              # The Sentinel (home)
│   ├── mirror|origin|multiverse|edge|studio/
│   ├── project/[slug]/       # dossier 7 tab
│   └── api/
│       ├── anomalies[+ /id]  # Sentinel list/detail/acknowledge
│       ├── actors[+ /id]     # credibility ledger + claim history
│       ├── narratives        # truth matrix (refresh 24h)
│       ├── mirror            # similarity-engine
│       ├── multiverse        # decision chain GET + add-branch POST
│       ├── edge/{variables,simulate,simulations}
│       ├── generate-content  # streamText (OpenAI) / local composer
│       ├── drafts, share, plan, watchlist, projects[+ /slug]
│       ├── cif[+ /slug]      # locked dataset stats/dossier + entity search
│       ├── sentinel[/run]    # scan manual + scheduler status
│       └── og/truth-card     # next/og PNG branded (self-hosted fonts)
├── services/                 # backend domain logic (logger + ServiceError)
│   ├── anomaly-detection.ts  #   scanAnomalies (30d MA ±2σ + effect-size), logs
│   ├── similarity-engine.ts  #   findAnalogProject over feature_vectors
│   ├── vectors.ts            #   43-d vectors (category×3/fund/patterns×1.5/tags×1.2)
│   ├── actor-credibility.ts  #   hit-rate × sample − conflicts, dari actor_claims
│   ├── truth-matrix.ts       #   narrative_evidence + refresh 24h
│   ├── decision-chain.ts     #   getDecisionChain + addBranch
│   ├── simulator.ts          #   runSimulation(var,value) Monte-Carlo + save/list
│   ├── content-generator.ts  #   prepareGeneration (gating) + createLocalStream
│   ├── project-detail.ts     #   aggregator dossier per slug
│   ├── cif-loader.ts         #   load snapshot src/data/cif + merge store + probe SB
│   └── *.test.ts             #   vitest (27 tests)
├── lib/
│   ├── cif/types.ts          #   KONTRAK SKEMA LOCKED cif-export/1 (TS)
│   ├── supabase/{client,rows,defaults}.ts  # bridge live; defaults embed publishable
│   ├── data/seed.ts          #   demo universe deterministik (500 proyek, makeSeries)
│   ├── db/{schema,client}.ts #   Drizzle Postgres (Neon opsional) + migrasi drizzle/
│   ├── ai/{context,composer}.ts  # structured prompt + draft deterministik 3 tone
│   ├── jobs/scheduler.ts     #   BullMQ bila REDIS_URL, else interval (6h/24h)
│   └── domain.ts, prng.ts, utils.ts
├── hooks/use-cif-live.ts     # TanStack Query BROWSER-side ke 5 tabel Supabase
├── stores/{sentinel,mirror,edge}.ts   # zustand
├── components/
│   ├── shell/ (app-shell, query-provider, plan-context, upgrade-dialog, nav)
│   ├── ui/ (shadcn-style: button/badge/card/dialog/select/tabs/primitives)
│   ├── charts/echart.tsx · sentinel/ · mirror/ · origin/ · multiverse/ · edge/
│   ├── studio/studio-module.tsx · project/project-detail-module.tsx
├── data/cif/*.json           # SNAPSHOT LOCKED cif-export/1 (27 proyek · 289 DE ·
│                             #   1.154 entities · 915 knowledge · 16 patterns ·
│                             #   conflicts · qa · behavior · 3 backtests)
└── fonts/                    # Inter + JetBrains Mono variable (self-hosted)
```

## "Ubah apa di mana"

| Keinginan | Lokasi |
|---|---|
| Tambah modul/navigation | `components/shell/nav.ts` + folder `app/` + `components/<modul>` |
| Logika backend baru | `src/services/<x>.ts` (+ test) → route `src/app/api/<x>` |
| Kontrak data locked berubah | **JANGAN ubah sepihak** — upstream yang ganti; update `lib/cif/types.ts` + loader mengikuti ekspor baru |
| Tabel Postgres baru | `lib/db/schema.ts` → `npm run db:generate` |
| Gating Free/Pro | `lib/store.ts` (isProjectAccessible, generationsUsedToday) + `components/shell/upgrade-dialog` |
| Tone/template konten | `lib/ai/composer.ts` + seed `templates` (system prompt tersimpan di DB) |
| Warna/brand | `tailwind.config.ts` + `globals.css` |

## Konvensi

- Services: semua fungsi punya error handling + `logger.info/warn/error(scope,msg,meta)`;
  error API dilempar sebagai `ServiceError` → status HTTP benar.
- Client: semua list/card via `useQuery` + skeleton; invalidate via `useQueryClient`.
- Prioritas tampilan data: **Supabase live → snapshot vendored → demo sintetis**
  (lihat `AGENTS.md` §4). Field live yang null → jangan render placeholder palsu.
- Snapshot `src/data/cif` adalah *snapshot*: boleh direfresh manual dari repo
  upstream (`poc/*.json`) bila upstream sync baru — ganti file, jalankan test.
