# Studio + Supplier Portal — architecture & build log

Two-sided hub inside the JR Design Build site:
- **Demand:** a client uploads a photo of their space, applies JR / supplier
  finishes over it, and submits → creates a **lead** the ERP consumes.
- **Supply:** suppliers self-register and upload item photos that (after JR
  approval) appear as selectable options in the Studio.

Implemented in phases, small commits. This doc tracks decisions + status.

## Key decisions reconciled with the real codebase

| Spec said | Reality | What we did |
|-----------|---------|-------------|
| `workerSupabaseFetch()` Worker proxy | No such helper. The repo uses **Cloudflare Pages Functions** (`functions/api/*.js`) that call `${SUPABASE_URL}/rest/v1/...` with `env.SUPABASE_KEY` (service role) server-side. | Follow that exact pattern — all Supabase access server-side, service key never in the client. |
| Tables `suppliers`, `catalog_items`, `material_categories` | **`public.suppliers` already exists** in the shared ERP (269 vendor rows); `public.leads` too (209 rows). | **Namespaced everything `studio_*`** to avoid clobbering production. |
| "Supabase Auth, 3 roles" + "never call Supabase from the browser" | The anon key is safe in the browser by design, but the house rule is server-side-only. | Phase 1 client Studio is **anonymous** (no login) — lead creation is server-side like `/api/lead`. Supplier/admin auth comes in later phases, Worker-mediated. |

## Data model (all `public.studio_*`)

`studio_suppliers`, `studio_material_categories`, `studio_catalog_items`,
`studio_projects`, `studio_applications`, `studio_leads`, and the ERP-facing
view `studio_leads_unified` (security_invoker). Full DDL:
`supabase/migrations/20260608_studio_portal_phase1.sql`.

### Security posture (RLS verified via advisors)
- RLS on all 6 tables.
- **Approval is unforgeable:** `studio_lock_supplier_status` /
  `studio_lock_item_status` triggers force `status` back to `pending`/unchanged
  for any non-`service_role` writer. Only Pages Functions (service key) approve.
- Editing a catalog item re-sets it to `pending` (re-review).
- `studio_projects` / `studio_applications` / `studio_leads` have **no
  anon/auth policies** → service-role only. Anonymous client ownership is
  enforced by a Worker-issued `edit_token`.
- Catalog: anyone reads `status='approved'`; a supplier also reads their own.
- Buckets: `studio-catalog` (public read — product swatches), `studio-photos`
  (private — client room photos, read via signed URLs from the Worker).

## renderEngine extension point (Phase 1 → Phase 2 AI)

The Studio is coupled only to a `RenderEngine` interface, never an
implementation:

```
RenderEngine.apply(baseImage, region, item, opts) -> RenderedLayer
```

- Phase 1: `Overlay2DEngine` — canvas/CSS, clips the region and paints the
  item's `swatch_color` or tiled `texture_path` with a blend mode + opacity.
- Phase 2 (gancho only): `AIEngine` — sends photo + region + a material prompt
  to a generative image API and swaps in the returned layer. No Studio rewrite.

## Build status

- [x] **Phase 1 — schema**: tables, RLS, status-guard triggers, view, buckets,
      seeded categories. Applied + advisor-clean (only intentional
      `rls_enabled_no_policy` INFO on the service-role-only tables).
- [x] **Phase 2 — Pages Functions**: `GET /api/studio/catalog`,
      `POST /api/studio/upload`, `POST /api/studio/submit`. Service-role,
      graceful no-op when env unset.
- [x] **Phase 3 — Studio client UI** (`/studio`, `src/studio-app.jsx`): upload →
      outline region → apply finish (Overlay2DEngine behind RenderEngine) →
      manage layers → Request quote → lead. Seeded 15 approved JR catalog items
      so the catalog is populated out of the box. (Finish-visualizer demo moved
      to `/studio-demo`; region marker stays at `/studio-editor`.)
- [x] **Phase 4 — Supplier portal** (`/suppliers`): magic-link OTP login
      (Worker-mediated, signed HttpOnly cookie), profile → approval gate →
      add items (always land `pending`). Endpoints under
      `functions/api/studio/supplier/*`.
- [x] **Phase 5 — Admin** (`/admin-studio`): key-gated approvals for suppliers
      and items + recent leads. Endpoints under `functions/api/studio/admin/*`.
      The ERP stays the source of truth for leads (`studio_leads_unified`).

### Env / config needed (Cloudflare Pages + Supabase)
| Var / setting | Enables | Without it |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_KEY` (service role) | All persistence | Studio/portal run in preview (no writes) |
| `STUDIO_ADMIN_KEY` | Admin login at `/admin-studio` | Admin returns `admin_not_configured` |
| `STUDIO_SESSION_SECRET` (optional) | Dedicated HMAC for session cookies | Falls back to `SUPABASE_KEY` |
| Supabase **SMTP** + Magic Link email template containing `{{ .Token }}` | Supplier OTP codes | No login codes are sent |

### Routes
- `/studio` — client Studio (upload → mark → apply → quote).
- `/suppliers` — supplier portal (footer link).
- `/admin-studio` — JR approvals (unlisted; key-gated).
- `/studio-demo` — finish-visualizer demo. `/studio-editor` — region marker.

### Not tested live
Supplier auth + admin endpoints are wired to GoTrue/Storage but were not
exercised against a live project (env unset in this environment). First
real run: set the env vars above, then sign up a test supplier and approve it.
