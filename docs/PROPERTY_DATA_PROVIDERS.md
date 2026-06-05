# Property Data Providers — Comparison & Recommendation

The one piece the Property Intelligence Report can't get from JR's own ERP is the
**property snapshot** (lot size, beds/baths, year built, zoning, value, rent).
This requires a **licensed data feed**. This doc compares the realistic options,
maps each report field to a source, and recommends an MVP combo.

> **Hard constraint:** **Zillow has no public property API.** Bridge/MLS access
> is gated behind brokerage/MLS membership, and **scraping zillow.com violates
> their ToS**. So "Paste a Zillow link" = parse the address out of the URL slug
> (pure string parsing, legal) and resolve via a licensed provider below. We
> never fetch/scrape the Zillow page.

---

## What the report needs vs. who supplies it

| Report field | Best source(s) |
|---|---|
| Normalized address + geocode (lat/lng) | Google/Mapbox/Census geocoder, or Regrid |
| Parcel (APN), **lot size**, lot geometry | **Regrid** (best), county GIS |
| **Zoning** | **Regrid** (zoning layer), county GIS/ArcGIS |
| Building sqft, **beds/baths**, **year built** | ATTOM, Estated, Rentcast, CoreLogic |
| **Estimated value (AVM)** | ATTOM, CoreLogic, Estated, Rentcast |
| **Rent estimate** (for ADU ROI) | **Rentcast** (best), HUD FMR (free, coarse) |
| Sales history / comps | ATTOM, CoreLogic |
| Permit history (3rd-party) | ATTOM permits — *but JR already has 147 real permits* |

---

## Provider comparison

| Provider | Coverage strength | CA coverage | Pricing model (ballpark) | Notes / constraints |
|---|---|---|---|---|
| **Regrid** | **Parcels + zoning + lot geometry** (150M+ parcels, GeoJSON) | Excellent | Tile/API subscription; ~$X/mo tiers + per-call; bulk county licensing | Best for *"what can I build"* + the map. Zoning normalization varies by county. |
| **Rentcast** | Characteristics + **AVM + rent estimate** + comps | Good | Pay-as-you-go, **cheap** (cents/call), generous free tier | Great MVP value; excellent for **ADU rent / ROI**. Lighter on zoning. |
| **Estated** | Characteristics + AVM + deeds | Good | Per-lookup, low cost; subscription tiers | Solid budget characteristics/AVM; coverage gaps on some parcels. |
| **ATTOM Data** | **Deep**: characteristics, AVM, sales, **permits**, schools, hazards | Excellent | Per-report / volume contract; **mid–high** | The V2 depth pick (true AVM + comps + sales). Heavier integration. |
| **CoreLogic / Black Knight** | Enterprise-grade everything | Excellent | **Enterprise** contracts, $$$$ | Overkill until scale; long sales cycle. |
| **County GIS / ArcGIS / Census** | Parcels/zoning (per county), ACS demographics | Varies | **Free** | Patchy, inconsistent schemas; good *supplement*, not a backbone. |
| **Realie / Rentcast / HouseCanary** | Modern AVM/analytics APIs | Good | API tiers | HouseCanary strong on AVM/forecast (pricier); Realie cheap & modern. |

> Exact prices change and are quote-based above a few thousand calls — treat the
> "$" columns as relative. Always confirm **caching rights** in the license (we
> cache aggressively, so per-call cost ≠ per-report cost).

---

## Recommended combos

**MVP (cheapest path to a real report):**
- **Regrid** → parcel, lot size, zoning, geometry (drives *What can I build* + map)
- **Rentcast** → characteristics (beds/baths/sqft/year), AVM, **rent estimate**
- **Geocoding** → Mapbox or Google (or Regrid's own)
- Everything else (cost, timeline, ROI calibration, similar projects, permits proof) = **JR ERP** (already have it)

**V2 (depth & accuracy):**
- Add **ATTOM** for true AVM, sales comps, and hazard/permit enrichment.
- Keep Regrid for zoning/geometry; Rentcast for rent.

**V3 (scale):** evaluate CoreLogic/HouseCanary enterprise if volume justifies it.

---

## Cost control (critical)

A single property can be viewed/shared many times. **Cache every lookup** in
`pip_property_cache` keyed by normalized address (`address_key`), TTL 30–90 days.
With caching, provider cost scales with **unique addresses**, not page views — a
viral report on one home costs **one** call. Add Cloudflare Turnstile + per-IP/day
caps on `/api/property/resolve` to stop scrapers from running up the bill.

---

## Integration shape (already scaffolded)

```
POST /api/property/resolve { address | zillowUrl }
  1. parse Zillow URL → address (string only; no page fetch)
  2. normalize + geocode
  3. cache hit? → return cached
  4. else: Regrid (parcel/zoning) + Rentcast (characteristics/AVM/rent)
  5. upsert pip_property_cache, return snapshot
        │
        ▼
POST /api/report { address }  ← already built; today uses a labeled MOCK
  snapshot. Swap mockSnapshot() for the resolver output and the whole report
  (cost/timeline/ROI/risk/scores/similar) becomes real with zero UI changes.
```

**The only code change to go live:** in `functions/api/report.js`, replace the
`mockSnapshot(address)` call with a `fetch('/api/property/resolve')` result once
a provider key (`REGRID_TOKEN`, `RENTCAST_KEY`) is set as a Cloudflare secret.

---

## Recommendation in one line

**Start with Regrid + Rentcast** (cheap, fast, covers parcel/zoning/AVM/rent),
cache hard, and upgrade to **ATTOM** for AVM/comps depth in V2. JR's ERP already
supplies the expensive, defensible half (cost, timeline, ROI, permits, similar
projects) — the provider only fills the property snapshot.
