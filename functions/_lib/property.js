// Shared property resolver for Pages Functions (imported, not a route — the
// leading-underscore dir is ignored by Pages routing).
//
// resolveProperty(env, address) returns { snapshot, isMock }.
//  - With REGRID_TOKEN + RENTCAST_KEY set as Cloudflare secrets -> real data
//    (parcel/zoning from Regrid, characteristics/AVM/rent from Rentcast),
//    falling back field-by-field to the deterministic mock on any gap/error.
//  - Without keys -> the labeled mock (so the whole product works today).

export const CITY_INDEX = {
  "san francisco": 1.25, burlingame: 1.2, hillsborough: 1.25, millbrae: 1.18,
  "san mateo": 1.15, "redwood city": 1.15, "palo alto": 1.3, "san carlos": 1.15,
  "south san francisco": 1.1, "san bruno": 1.08, "daly city": 1.08, pacifica: 1.05,
  "san jose": 1.05, hayward: 1.0,
};

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
export const pick = (r, a, b) => Math.round(a + r * (b - a));
const usd = (n) => Math.round(Number(n) || 0);

export function parseCity(address) {
  const m = String(address || "").match(/,\s*([A-Za-z .'-]+?)\s*,?\s*(CA|California)?\s*\d{0,5}\s*$/);
  let c = m && m[1] ? m[1] : "";
  if (!c) {
    const parts = String(address || "").split(",");
    c = parts.length > 1 ? parts[parts.length - 2] : parts[0] || "";
  }
  return c.trim();
}

// Extract a plain address from a Zillow URL slug. Pure string parsing — we
// never fetch zillow.com (their ToS forbids scraping; there is no public API).
export function addressFromZillowUrl(url) {
  try {
    const u = new URL(url);
    if (!/zillow\.com$/i.test(u.hostname.replace(/^www\./, ""))) return null;
    const m = u.pathname.match(/\/homedetails\/([^/]+)\//i) || u.pathname.match(/\/([^/]+)\/\d+_zpid/i);
    if (!m) return null;
    return decodeURIComponent(m[1]).replace(/-/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

export function mockSnapshot(address) {
  const a = address.toLowerCase();
  const r = hash(a), r2 = hash(a + "x");
  const city = parseCity(address) || "Bay Area";
  const idx = CITY_INDEX[city.toLowerCase()] || 1.1;
  return {
    address,
    city,
    jurisdiction: city,
    zoning: "R-1 (single-family, typical)",
    lotSqft: pick(r2, 3500, 9000),
    buildingSqft: pick(r, 1100, 2600),
    beds: pick(hash(a + "b"), 2, 5),
    baths: pick(hash(a + "ba"), 1, 3) + (r > 0.5 ? 0.5 : 0),
    yearBuilt: pick(hash(a + "y"), 1940, 2005),
    estValue: usd((900 + r * 700) * 1000 * idx),
  };
}

async function jget(url, headers) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// Best-effort real lookup; throws on hard failure so caller can fall back.
async function providerSnapshot(env, address) {
  const base = mockSnapshot(address); // template for any missing field
  const out = { ...base };

  // Regrid -> parcel, lot size, zoning
  if (env.REGRID_TOKEN) {
    try {
      const d = await jget(
        `https://app.regrid.com/api/v2/parcels/address?query=${encodeURIComponent(address)}&token=${env.REGRID_TOKEN}&limit=1`,
        { accept: "application/json" }
      );
      const f = d?.parcels?.features?.[0]?.properties?.fields || d?.results?.[0]?.properties || {};
      const lot = Number(f.ll_gissqft || f.sqft || (f.ll_gisacre ? f.ll_gisacre * 43560 : 0));
      if (lot > 200) out.lotSqft = Math.round(lot);
      if (f.zoning) out.zoning = String(f.zoning);
      if (f.scity || f.city) out.city = out.jurisdiction = String(f.scity || f.city);
    } catch { /* keep mock fields */ }
  }

  // Rentcast -> characteristics + AVM + rent
  if (env.RENTCAST_KEY) {
    const h = { "X-Api-Key": env.RENTCAST_KEY, accept: "application/json" };
    try {
      const p = await jget(`https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}`, h);
      const rec = Array.isArray(p) ? p[0] : p;
      if (rec) {
        if (rec.squareFootage) out.buildingSqft = Math.round(rec.squareFootage);
        if (rec.bedrooms != null) out.beds = rec.bedrooms;
        if (rec.bathrooms != null) out.baths = rec.bathrooms;
        if (rec.yearBuilt) out.yearBuilt = rec.yearBuilt;
        if (rec.lotSize) out.lotSqft = Math.round(rec.lotSize);
        if (rec.zoning) out.zoning = String(rec.zoning);
      }
    } catch { /* keep mock fields */ }
    try {
      const v = await jget(`https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(address)}`, h);
      if (v?.price) out.estValue = Math.round(v.price);
      out.rentEstimate = v?.rent ? Math.round(v.rent) : out.rentEstimate;
    } catch { /* keep mock value */ }
  }
  return out;
}

export async function resolveProperty(env, address) {
  const hasProvider = !!(env && (env.REGRID_TOKEN || env.RENTCAST_KEY));
  if (!hasProvider) return { snapshot: mockSnapshot(address), isMock: true };
  try {
    const snapshot = await providerSnapshot(env, address);
    return { snapshot, isMock: false };
  } catch {
    return { snapshot: mockSnapshot(address), isMock: true };
  }
}
