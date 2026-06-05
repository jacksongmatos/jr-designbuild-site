# JR Design Build — Property Intelligence Platform (PIP)

> **What this is.** A build-ready architecture for turning jr-designbuild from a
> brochure into a **decision-making engine**: a homeowner / investor / Realtor
> enters an address and leaves knowing *what they can build, what it costs, how
> long it takes, the risks, the ROI, financing, and which JR projects are like
> theirs* — before any human talks to them.
>
> Grounded in the assets that already exist: **Cloudflare Pages + Functions**,
> **Vite/React SPA**, the **JR ERP on Supabase** (287 projects, 147 permits,
> `project_type_benchmarks`, `estimates`, `leads`), and **Claude Opus 4.8**.

---

## 0. Executive summary & the honest data-source reality check

The platform is **3 engines on top of one data spine**:

| Engine | What powers it | Source |
|---|---|---|
| **Property engine** | snapshot, lot/zoning, value, what-can-I-build | **3rd-party API (vendor decision)** + CA ADU law rules |
| **Construction-intelligence engine** | cost, timeline, ROI, risk, similar projects | **JR ERP (Supabase) — real data we already have** |
| **AI engine** | report narration, consultant chat, finish matcher | **Claude Opus 4.8** + retrieval over JR data |

**Three external decisions are unavoidable — flagging them up front so nothing is oversold:**

1. **Property data needs a licensed provider.** Lot size, beds/baths, year built, zoning, AVM (value) are **not** things we can invent or scrape. Options below. **Zillow has no public property API**, and scraping Zillow pages violates their ToS — so "Paste a Zillow link" must be implemented as **URL→address parsing** (we read the address out of the URL slug, which is just string parsing) and then resolve via a *licensed* provider. We never scrape the Zillow page.
2. **Similar-project matching needs an embeddings model.** Anthropic has no embeddings endpoint. Use **Cloudflare Workers AI (`bge`)** or **Voyage AI** → store vectors in **Supabase pgvector**.
3. **Photorealistic renderings need an image-generation model** (Feature 13 "future phase"). Claude does **vision (analysis)**, not image generation. The finish-*matcher* (analyze → suggest styles/materials/palettes) ships without it; *renders* are a separate vendor (e.g. an image model) in V3.

### Property data provider options

| Provider | Strength | Notes |
|---|---|---|
| **Regrid** | Parcels, **zoning**, lot geometry (GeoJSON), 150M+ parcels | Best for "what can I build" + map; per-lookup or tile licensing |
| **ATTOM Data** | Characteristics + **AVM** + permits + sales history | Rich; per-report pricing; strong for ROI/value |
| **Estated / Realie / Rentcast** | Cheaper characteristics + AVM + **rent estimates** | Good MVP cost/coverage; Rentcast great for ADU rent |
| **CoreLogic / Black Knight** | Enterprise depth | Expensive; later |
| **Census / county GIS / ArcGIS** | Free zoning/parcel for some CA counties | Patchy; good supplement |

**Recommended MVP combo:** **Regrid** (parcel + zoning + geometry) **+ Rentcast or Estated** (characteristics + AVM + ADU rent), aggressively **cached** in Supabase to control cost. Upgrade to ATTOM for V2 depth.

---

## 1. Information Architecture

```
PUBLIC (value-first, no gate)
├── Home (hero → "Enter your address")
├── Property Intelligence Report      [FEATURE 1]  ← the hero product
│     ├── Snapshot
│     ├── Construction Potential       [FEATURE 3 inline]
│     ├── Home-Age Risk Analysis       [FEATURE 11 risk]
│     ├── Cost Intelligence            [FEATURE 6 inline]
│     ├── Timeline Intelligence
│     ├── ROI Intelligence
│     ├── Property Health Score        [FEATURE 11]
│     └── Similar JR Projects          [FEATURE 10]
├── What Can I Build?                  [FEATURE 3]
├── Cost Database (public)             [FEATURE 6]
├── Project Configurator (Tesla-style) [FEATURE 7] → PDF
├── Investor Mode                      [FEATURE 8]
│     ├── Flip / ARV / Profit / Deal analyzers
│     └── Permit Timeline Predictor
├── Live Permit Map                    [FEATURE 5]
├── Calculators
│     ├── Remodel vs Move              [FEATURE 4]
│     └── Cost of Waiting              [FEATURE 12]
├── AI Consultant (JR-trained)         [FEATURE 9]  ← global, also embedded
├── AI Finish Matcher                  [FEATURE 13]
├── Neighborhood Intelligence /city/*  [FEATURE 14]  ← programmatic SEO
├── Portfolio / Similar projects gallery
├── Company (About, DNA, JR Group, Process, Reviews)
└── Contact / Book

AUTH (light, optional — “save your report”)
├── My Reports
├── Saved properties / configurations
└── Investor dashboard (V2)

INTERNAL (feeds JR Vision ERP)
└── Lead inbox + lead scoring + report analytics
```

**Progressive disclosure law:** every report shows headline numbers first; details expand on demand; the *only* gate is the **PDF / "Pro Property Review"**, captured with an email after value is delivered.

---

## 2. Sitemap

```
/                                 Home + address bar
/report?address=…                 Property Intelligence Report (sharable, OG image)
/build                            What Can I Build
/cost                             Public Cost Database (filter by city/type)
/cost/:city                       Cost DB per city (SEO)
/configure                        Project Configurator → /configure/summary (PDF)
/investor                         Investor Mode hub
/investor/flip|arv|deal           Investor tools
/map                              Live Permit & Project Map
/calculators/remodel-vs-move
/calculators/cost-of-waiting
/ai                               JR AI Consultant (full-page) + floating everywhere
/finish-matcher
/cities                           Index of all city pages (SEO hub)
/cities/:city                     Neighborhood Intelligence (San Mateo, Burlingame, …)
/projects  /projects/:slug        Portfolio + case studies
/about /dna /group /process /reviews /contact
/legal/privacy /legal/terms /legal/data-sources
/r/:shortId                       Short link to a saved report
/me  /me/reports                  (auth) saved reports
sitemap.xml  (split: core + /cities/* + /cost/* + /projects/*)
robots.txt   ai.txt(llms.txt)
```

---

## 3. Database Schema (Supabase — new `pip_*` tables alongside the ERP)

> Keep the ERP untouched. PIP tables are additive, `pip_`-prefixed, RLS-on,
> reachable only through Functions (service role) or strict anon policies.
> Requires the **pgvector** extension for similarity.

```sql
-- Property lookups, cached to control provider cost
create table pip_property_cache (
  id            bigint generated always as identity primary key,
  address_key   text unique not null,         -- normalized "123-main-st-san-mateo-ca-94401"
  formatted     text, lat double precision, lng double precision,
  apn           text, jurisdiction text, zoning text,
  lot_sqft      numeric, building_sqft numeric, beds int, baths numeric,
  year_built    int, est_value numeric, rent_estimate numeric,
  provider      text, raw jsonb,
  fetched_at    timestamptz default now()
);

-- A generated report (snapshot of everything we computed/AI-narrated)
create table pip_reports (
  id            uuid primary key default gen_random_uuid(),
  short_id      text unique,                  -- /r/:short_id
  address_key   text references pip_property_cache(address_key),
  snapshot      jsonb,  potential jsonb,  risk jsonb,
  cost          jsonb,  timeline  jsonb,  roi  jsonb,
  scores        jsonb,                        -- {health, expansion, investment, risk}
  similar       jsonb,                        -- matched project ids + meta
  lead_id       bigint references leads(id),  -- ties to the real ERP leads table
  created_at    timestamptz default now()
);

-- Public cost database, seeded from ERP aggregates + benchmarks, refreshed nightly
create table pip_cost_models (
  id bigint generated always as identity primary key,
  city text, project_type text,
  low numeric, avg numeric, premium numeric,
  unit text default 'project',                -- or '$/sqft'
  sample_count int, source text, updated_at timestamptz default now(),
  unique (city, project_type)
);

-- Vector index over real JR projects for "similar project matching"
create table pip_project_embeddings (
  project_id bigint primary key references projects(id),
  scope_text text, city text, cost numeric,
  embedding  vector(768)                      -- bge-base-en
);
create index on pip_project_embeddings using ivfflat (embedding vector_cosine_ops);

-- Programmatic city/SEO content
create table pip_city_pages (
  city text primary key, slug text unique,
  stats jsonb,                                -- {projects, permits, avg_cost, top_types}
  intro text, faq jsonb, updated_at timestamptz default now()
);

-- Product analytics events (or send to PostHog instead)
create table pip_events (
  id bigint generated always as identity primary key,
  session_id text, type text, props jsonb, created_at timestamptz default now()
);
```

**Reused ERP tables (read-only, the credibility spine):** `projects` (cost/city/scope), `project_type_benchmarks` (scope $, weeks, markups), `permits` (jurisdiction proof), `estimates`, `labor_cost_refs`, `leads` (lead capture target).

**Deterministic rules tables (seeded, not AI):** home-age risk map (year → [knob-and-tube, galvanized, cast-iron, asbestos, lead-paint, seismic …]); CA ADU/JADU/SB-9 entitlement rules by lot type.

---

## 4. API Architecture (Cloudflare Pages Functions — `/functions/api/*`)

Edge-first, stateless, server-side keys only. Each is a Worker.

| Endpoint | Method | Does |
|---|---|---|
| `/api/property/resolve` | POST | `{address|zillowUrl}` → normalize, parse Zillow URL→address, fetch provider, **cache** in `pip_property_cache` |
| `/api/report` | POST | Orchestrator: property → zoning/ADU rules → JR cost/timeline/ROI → year-risk → similar (vector) → scores → AI narration → persist `pip_reports`, return full report |
| `/api/build` | POST | What-can-I-build (zoning + CA ADU law + lot math) |
| `/api/costdb` | GET | Public cost ranges from `pip_cost_models` (cached, CDN) |
| `/api/roi` `/api/remodel-vs-move` `/api/cost-of-waiting` | POST | Finance math (mostly pure; server for consistency + logging) |
| `/api/similar` | POST | pgvector match over `pip_project_embeddings` |
| `/api/map` | GET | GeoJSON of projects/permits (clustered) for the map |
| `/api/ai/consult` | POST | RAG chat (JR-trained), tool-calling into the above |
| `/api/ai/finish-match` | POST | Vision analysis of uploaded room → styles/materials/palette |
| `/api/configure/pdf` | POST | Render configurator summary → PDF |
| `/api/lead` | POST | **exists** — writes to real `leads`, with score |
| `/api/stats` | GET | Live ERP counters (projects/permits/cities) for trust UI |

**Cross-cutting:** Cloudflare **Turnstile** token required on the 2 expensive routes (`/report`, `/ai/*`); per-IP rate limit (KV); response cache (Cache API/KV) keyed by `address_key` + model version; structured JSON via Claude with strict server-side parse + fallback.

---

## 5. AI Architecture

```
                ┌──────────────── Retrieval (Supabase) ─────────────────┐
 user input ──► │ pgvector similar projects │ benchmarks │ permits │ cost │
                └───────────────────────────────────────────────────────┘
                                │ context (cached prefix)
                                ▼
            Claude Opus 4.8  (Messages API in a Function)
        ┌───────────────┬────────────────────┬────────────────────┐
        │ Report writer │ AI Consultant       │ Finish Matcher     │
        │ structured    │ RAG + tool calls    │ vision → JSON      │
        │ JSON sections │ locked to JR domain │ styles/materials   │
        └───────────────┴────────────────────┴────────────────────┘
```

- **Model:** `claude-opus-4-8` (vision, 1M context, structured outputs). **Sonnet 4.6** as a cost lever for the high-volume consultant; **Haiku 4.5** for cheap classification (e.g., intent routing).
- **"Trained only on JR data" = RAG, not fine-tuning.** Retrieve JR projects/permits/benchmarks/FAQs and pass as grounded context; **prompt-cache** the stable JR knowledge prefix (huge cost saver). System prompts hard-lock scope ("only JR construction intelligence; refuse off-topic; never give binding quotes").
- **Determinism where it must be deterministic:** home-age risk, ADU entitlement math, ROI formulas are **rule engines** (auditable, no hallucination). AI writes the *explanations* and the *narrative*, not the numbers it shouldn't invent.
- **Embeddings:** Cloudflare Workers AI `@cf/baai/bge-base-en-v1.5` (cheap, on-platform) → `pip_project_embeddings`. Nightly job embeds new projects.
- **Tool use (consultant):** tools = `lookupCostByCity`, `permitStatsByCity`, `similarProjects`, `yearRisk`, `bookConsult`. The model composes them to answer "What would a 500 sqft addition cost in San Mateo?" with real numbers + a real comparable.
- **Agents (later):** Managed Agents for multi-step feasibility studies (the gated "Pro Property Review").

---

## 6. UX Wireframes (low-fi)

**Home**
```
┌───────────────────────────────────────────────┐
│  JR · Property Intelligence                ☰  │
│                                                │
│      What can your property become?            │
│   ┌───────────────────────────┐  [ Analyze ]   │
│   │ Enter your address…        │               │
│   └───────────────────────────┘  paste Zillow ↘│
│   287 projects · 147 permits · 60+ cities      │
└───────────────────────────────────────────────┘
```

**Report** (progressive disclosure; sticky right rail = scores + CTA)
```
┌──────────────────────────── Report: 123 Main St ───────────────┬─────────────┐
│ SNAPSHOT  lot 6,000 · 3bd/2ba · 1958 · ~$1.6M · R-1 · San Mateo │ Health  72  │
│ ───────────────────────────────────────────────────────────────│ Expand  85  │
│ CONSTRUCTION POTENTIAL                                          │ Invest  78  │
│  [ADU ✓ 1200sf] [JADU ✓] [Garage conv ✓] [2nd story ~] [rear ✓]│ Risk    Med │
│ HOME-AGE RISK  ●●●○○  galvanized · cast-iron · pre-78 lead      │             │
│ COST  Kitchen 45–120k · ADU 220–380k · Whole 180–450k          │ [ Talk to  ]│
│ TIMELINE  design▸eng▸permit▸build  (bars per type)             │ [ an expert]│
│ ROI  cost 300k → +value 520k → equity 220k · ADU rent $3.0k/mo │ [ Get PDF  ]│
│ SIMILAR JR PROJECTS  � ◐ ◑  (before/after cards, same city)     │             │
└────────────────────────────────────────────────────────────────┴─────────────┘
```

**Configurator (Tesla-style)** — left live preview/scope, right option chips → running budget/timeline; **Investor Mode** — deal inputs left, sensitivity table + profit waterfall right; **Map** — clustered pins, filter rail (city/type/year/permit); **City page** — hero stat band + cost table + gallery + FAQ schema.

---

## 7. Component Hierarchy

```
<App>
 ├─ <AddressBar/>            (autocomplete; the funnel entry, everywhere)
 ├─ <ReportView>
 │   ├─ <SnapshotCard/> <PotentialGrid/> <RiskMeter/>
 │   ├─ <CostRanges/> <TimelineBars/> <RoiDashboard/>
 │   ├─ <ScoreRail/>  <SimilarProjects/>  <ReportCTA/>
 ├─ <Configurator> <OptionGroup/> <LiveScope/> <BudgetMeter/> <ExportPdf/>
 ├─ <InvestorTools> <FlipAnalyzer/> <ArvCalc/> <DealAnalyzer/> <Sensitivity/>
 ├─ <PermitMap> <MapCanvas/> <FilterRail/> <PinCard/>
 ├─ <CostDB> <CityCostTable/>
 ├─ <Calculators> <RemodelVsMove/> <CostOfWaiting/>
 ├─ <AiConsultant/> (floating + full page)   <FinishMatcher/>
 ├─ <CityPage> <StatBand/> <CostTable/> <Gallery/> <Faq/>
 └─ primitives: <Card/> <Stat/> <Range/> <Chart/> <Chip/> <Reveal/> <ThemeToggle/>
```
Design system tokens: type scale (display serif + Inter/Archivo body), spacing, color (dark+light), motion. Charts: lightweight (visx/Recharts or hand-rolled SVG). Map: **MapLibre GL** (free) or Mapbox.

---

## 8. Page Hierarchy

Tier 1 (conversion): `/`, `/report`, `/cities/:city`, `/configure`, `/investor`.
Tier 2 (tools): `/build`, `/cost`, `/map`, `/calculators/*`, `/ai`, `/finish-matcher`.
Tier 3 (trust/company): `/projects/*`, `/about /dna /group /process /reviews`, `/legal/*`.

---

## 9. Feature Prioritization (impact × effort × data-readiness)

| Feature | Impact | Effort | Data ready today? | Phase |
|---|---|---|---|---|
| 6 Cost DB / 12 Cost-of-waiting / 4 Remodel-vs-move | High | Low | ✅ ERP | **MVP** |
| 10 Similar projects / 15 Track-record | High | Med | ✅ ERP (+embeddings) | **MVP** |
| 1 Property Report (core) | **Highest** | High | ⛔ needs provider | **MVP** |
| 11 Health/Risk score (year-based) | High | Low | ✅ rules | **MVP** |
| 9 AI Consultant (RAG) | High | Med | ✅ ERP + key | **MVP** |
| 14 Neighborhood SEO pages | High (growth) | Med | ✅ ERP | **MVP→V2** |
| 3 What-can-I-build (zoning) | High | High | ⛔ Regrid zoning | **V2** |
| 7 Configurator + PDF | High | High | ✅ | **V2** |
| 8 Investor Mode | Med-High | High | partial | **V2** |
| 5 Live Permit Map | Med | Med | ✅ + geocode | **V2** |
| 2 Zillow-link | Med | Low | URL parse + provider | **V2** |
| 13 Finish Matcher (analyze) | Med | Med | key | **V2** |
| 13 AI renderings | Med | High | ⛔ image-gen vendor | **V3** |

---

## 10/11/12. Roadmaps

**MVP (≈4–6 weeks) — "Address → Report":**
- `/report`: provider snapshot (Regrid+Rentcast) → JR-grounded **cost/timeline/ROI** + **year-risk** + **health score** + **similar projects** + AI narration; sharable + OG image.
- Public **Cost DB** + **Cost-of-waiting** + **Remodel-vs-move** (real ERP numbers).
- **AI Consultant** (RAG) global.
- **10 seed city pages** (SEO) from ERP stats. Lead capture → real `leads` with score.
- Wins immediately on data you already own; only new dependency = property provider + Anthropic key.

**V2 (next):** What-can-I-build (Regrid zoning + CA ADU law), Configurator + PDF, Investor Mode, Live Permit Map, Zillow-link parsing, finish-matcher (analysis), full programmatic city pages (60+), dark/light, light auth + saved reports.

**V3:** AI photorealistic renderings (image-gen vendor), ATTOM/MLS depth + true AVM, Realtor & Investor portals, partner API, automated permit-feed intelligence, native mobile, multi-market expansion.

---

## 13. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Hosting | **Cloudflare Pages + Functions** | already in place; edge; cheap |
| Frontend | **Vite + React + TypeScript**, **real React Router** (drop hash routing) | SEO + deep links |
| **SEO/content rendering** | **Prerender city/report shells at build** (vite SSG plugin) — or migrate public/content pages to **Astro** (React islands) | programmatic SEO needs HTML, not a CSR SPA |
| Styling/UI | Tailwind + a small token system; Radix primitives | speed + a11y |
| Charts/Maps | visx/Recharts + **MapLibre GL** (free tiles / Protomaps) | cost control |
| DB | **Supabase Postgres + pgvector** (existing) | one source of truth w/ ERP |
| AI | **Claude Opus 4.8** (Messages API), **Workers AI** embeddings | grounded, on-platform |
| Property data | **Regrid + Rentcast/Estated** (→ ATTOM V2) | parcels/zoning/AVM/rent |
| Auth (V2) | Supabase Auth or Clerk | saved reports |
| PDF | Workers + `@react-pdf` or headless render | configurator export |
| Queue/cron | Cloudflare Queues + Cron Triggers | nightly cost/embeddings refresh |
| Bot/abuse | Cloudflare **Turnstile** + WAF + KV rate-limit | protect paid calls |

> **Note on the current build:** today it's a single-file hash-routed SPA — perfect for the brochure, **not** for a programmatic-SEO platform. The MVP's first refactor is **real routes + prerendering**; the existing tools (Plan page, AI widget) port in as components.

---

## 14. Scalability Plan

- **Edge-native**: Functions scale to zero/∞ automatically; no servers to size.
- **Cache layers**: CDN for static + Cost DB; **KV** for property lookups (TTL 30–90d) — a viral report on the same address costs **one** provider call.
- **DB**: read replicas / Supabase connection pooling (PgBouncer) for `/api/stats`, cost, map; vector index (ivfflat/HNSW) for similarity.
- **Cost guardrails**: Turnstile + per-IP/day report cap + provider-call budget alarms.
- **Async heavy work**: PDF, embeddings, nightly cost recompute via Queues/Cron.
- **Model routing**: Haiku for intent → Sonnet for chat → Opus for full reports.

---

## 15. Cloudflare Deployment Strategy

- **Pages** project `jr-designbuild` (already live) — production branch `main`, **wrangler-action** (already switched) compiles `functions/`.
- **Bindings**: `KV` (cache + rate limit), **Workers AI** (embeddings), **Queues** (PDF/embeddings), **Cron Triggers** (nightly refresh), **D1** optional for edge counters.
- **Secrets**: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` (service role), `REGRID_TOKEN`, `RENTCAST_KEY`, `TURNSTILE_SECRET` — all server-side env, never shipped to client.
- **Preview deployments** per PR (CI) → staging review before `main`.
- **Observability**: Cloudflare Logpush + Web Analytics; per-function error reporting.

---

## 16. Cost Estimates (order-of-magnitude, monthly)

| Item | Light (1k reports/mo) | Growth (20k/mo) |
|---|---|---|
| Cloudflare (Pages+Workers+KV+AI+Queues) | ~$5–20 | ~$50–200 |
| Supabase (existing Pro) | ~$25 | ~$25–100 |
| **Property provider** (Regrid+Rentcast, **cached**) | ~$50–300 | ~$500–3,000 (cache-dependent) |
| **Claude** (reports+chat, prompt-cached) | ~$100–300 | ~$1,500–4,000 |
| Maps (MapLibre free / Mapbox) | ~$0 | ~$0–250 |
| **Total** | **~$200–650/mo** | **~$2.5k–7.5k/mo** |

Per **report**: ~$0.15–0.50 (provider + Opus, before cache). Caching + Sonnet routing can cut AI 40–60%. This is a **lead-gen engine** — one closed remodel dwarfs a year of platform cost.

---

## 17. Security Architecture

- **Keys server-side only** (Functions env). The browser never sees provider/Anthropic/service keys.
- **Supabase**: RLS **on** for every `pip_*` table; public reads go through Functions (service role) or tightly-scoped anon policies; **fix the existing `finish_material_invoices` RLS gap**.
- **Abuse/cost protection**: Turnstile on `/report` + `/ai/*`; KV per-IP/day caps; provider budget alarms; cache by `address_key`.
- **PII**: addresses + contact are personal data. Encrypt at rest (Supabase), explicit retention policy, a `/legal/privacy` + data-source disclosure, and a delete path (CCPA). Don't store raw provider payloads longer than needed.
- **Input/output hardening**: validate address inputs; treat all model/provider output as untrusted (parse + sanitize); never execute model output; prompt-injection-resistant system prompts; CORS locked to the site origin.
- **Supply chain**: pinned deps, Dependabot, least-privilege API tokens.

---

## 18. SEO Architecture (the growth engine)

- **Programmatic pages**: `/cities/:city` × project-type = hundreds of long-tail targets ("ADU cost San Mateo", "kitchen remodel Burlingame") — each **prerendered HTML** with real JR stats.
- **Structured data**: `LocalBusiness` + `Service` + `FAQPage` + `BreadcrumbList` + per-project `Project`/`ImageObject`; `AggregateRating` from reviews.
- **Report sharability**: each report = a clean URL + dynamic **OG image** (address + scores) → social/Realtor sharing = organic distribution.
- **Technical**: split sitemaps (core / cities / cost / projects), canonical tags, fast LCP (edge + prerender), `llms.txt`/`ai.txt` for AI-search visibility, internal linking hub at `/cities`.
- **Content moat**: "Construction insights" per city powered by *real* permit/cost data nobody else has.

---

## 19. Analytics Architecture

- **Privacy-first web**: Cloudflare Web Analytics (free, no cookies).
- **Product funnel**: PostHog (cloud or self-host on Workers) — events: `address_entered → report_generated → section_expanded → cta_view → lead_submitted → consult_booked`; cohort by source/city/project-type.
- **Server events** logged to `pip_events` (or piped to PostHog) for funnels the client can't see (provider hits, cache ratio, AI cost per report).
- **Dashboards**: report→lead conversion, cost-per-lead, top cities/types, AI cost, cache hit-rate, provider spend.

---

## 20. Conversion Optimization Strategy

- **Value before ask.** Full report renders **without** a form. The only gate is the **PDF / "Pro Property Review" / "Feasibility Study"**, captured with email after the aha-moment.
- **Three escalating CTAs** (your wording): *Get a Professional Property Review* → *Speak With a JR Expert* → *Receive a Detailed Feasibility Study* — shown contextually by **lead score** (invisible scoring already started).
- **Trust scaffolding everywhere**: 287/147/60+, CSLB badge (verifiable), real similar projects, real permit proof — credibility *before* contact.
- **Loops**: sharable reports + city SEO = top-of-funnel; retargeting pixel on report viewers; "save your report" email; lead → **JR Vision ERP** with score so the team calls the hottest first.
- **Experimentation**: PostHog A/B on hero copy, CTA order, gate placement; measure report→lead and lead→booked.

---

## Appendix — Feature → Phase quick map

| # | Platform feature | Phase | Hard dependency |
|---|---|---|---|
| 1 | Property Intelligence Report | MVP | property provider |
| 2 | Paste a Zillow link | V2 | URL parse → provider (no scraping) |
| 3 | What can I build | V2 | Regrid zoning + CA ADU law |
| 4 | Remodel vs Move | MVP | — (ERP + finance math) |
| 5 | Live Permit Map | V2 | geocoding + map lib |
| 6 | Live Cost Database | MVP | ERP aggregates |
| 7 | Project Configurator + PDF | V2 | PDF render |
| 8 | Investor Mode | V2 | AVM (ATTOM) for accuracy |
| 9 | JR AI Consultant | MVP | Anthropic key + RAG |
| 10 | Similar Project Matching | MVP | embeddings + pgvector |
| 11 | Property Health Score | MVP | rules + provider |
| 12 | Cost of Waiting | MVP | ERP |
| 13 | AI Finish Matcher (analyze) | V2 | vision key |
| 13b | AI Renderings | V3 | image-gen vendor |
| 14 | Neighborhood Intelligence | MVP→V2 | ERP + prerender SEO |

---

### The 3 decisions that unblock the MVP
1. **Property data provider** — recommend **Regrid + Rentcast** to start.
2. **Anthropic + Supabase secrets** in Cloudflare (already specified).
3. **SEO rendering** — approve moving public/content pages to **real routes + prerender** (or Astro) so city pages actually rank.

> Everything in the *construction-intelligence engine* (cost, timeline, ROI, risk, similar projects, track record) ships on **data JR already owns**. The property snapshot is the one piece that needs a licensed feed — pick the provider and the MVP is unblocked.
