// Cloudflare Pages Function — POST /api/report
// Property Intelligence Report orchestrator.
// Works with ZERO secrets (deterministic heuristics + a clearly-labeled MOCK
// property snapshot). Enriches "similar projects" from the real JR ERP when
// SUPABASE_URL/KEY are set. Swap the mock snapshot for a licensed property
// provider (Regrid/Rentcast/ATTOM) in /api/property/resolve later.

const CITY_INDEX = {
  "san francisco": 1.25, burlingame: 1.2, hillsborough: 1.25, millbrae: 1.18,
  "san mateo": 1.15, "redwood city": 1.15, "palo alto": 1.3, "san carlos": 1.15,
  "south san francisco": 1.1, "san bruno": 1.08, "daly city": 1.08, pacifica: 1.05,
  "san jose": 1.05, hayward: 1.0,
};

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

// deterministic pseudo-random from a string (stable per address)
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
const pick = (r, a, b) => Math.round(a + r * (b - a));
const usd = (n) => Math.round(n);

function parseCity(address) {
  const m = String(address || "").match(/,\s*([A-Za-z .'-]+?)\s*,?\s*(CA|California)?\s*\d{0,5}\s*$/);
  let c = m && m[1] ? m[1] : "";
  if (!c) {
    const parts = String(address || "").split(",");
    c = parts.length > 1 ? parts[parts.length - 2] : parts[0] || "";
  }
  return c.trim();
}

// MOCK property snapshot (deterministic). Replace with provider lookup.
function mockSnapshot(address) {
  const r = hash(address.toLowerCase());
  const r2 = hash(address.toLowerCase() + "x");
  const city = parseCity(address) || "Bay Area";
  const buildingSqft = pick(r, 1100, 2600);
  const lotSqft = pick(r2, 3500, 9000);
  const yearBuilt = pick(hash(address + "y"), 1940, 2005);
  const idx = CITY_INDEX[city.toLowerCase()] || 1.1;
  const estValue = usd((900 + r * 700) * 1000 * idx); // ~$0.9M–1.9M * city index
  return {
    address,
    city,
    jurisdiction: city,
    zoning: "R-1 (single-family, typical)",
    lotSqft,
    buildingSqft,
    beds: pick(hash(address + "b"), 2, 5),
    baths: pick(hash(address + "ba"), 1, 3) + (r > 0.5 ? 0.5 : 0),
    yearBuilt,
    estValue,
  };
}

function yearRisk(year) {
  const items = [];
  if (year < 1950) items.push({ risk: "Knob-and-tube wiring", why: "Common in homes built before ~1950; often needs replacement for safety and insurability." });
  if (year >= 1965 && year <= 1973) items.push({ risk: "Aluminum branch wiring", why: "Used ~1965–73; connections can loosen and overheat — remediation often advised." });
  if (year < 1960) items.push({ risk: "Galvanized water piping", why: "Corrodes internally over decades, reducing pressure and water quality." });
  if (year < 1980) items.push({ risk: "Cast-iron sewer lateral", why: "Reaches end of life around 50–75 years; scoping recommended before a remodel." });
  if (year < 1986) items.push({ risk: "Asbestos-containing materials", why: "Possible in flooring, popcorn ceilings, ducting; test before demo." });
  if (year < 1978) items.push({ risk: "Lead-based paint", why: "Banned for residential use in 1978; RRP-safe practices required during work." });
  if (year < 1980) items.push({ risk: "Seismic / soft-story vulnerability", why: "Pre-1980 framing may lack modern shear and foundation bolting." });
  let score = "Low";
  if (items.length >= 4) score = "High";
  else if (items.length >= 2) score = "Medium";
  return { score, items };
}

function potential(s) {
  const footprint = s.buildingSqft * 0.45;
  const freeLand = Math.max(0, s.lotSqft - footprint);
  const c = (cond, type, approxSize, complexity) => ({ type, feasible: !!cond, approxSize, complexity });
  return [
    c(s.lotSqft >= 3000, "Detached ADU", `up to ${Math.min(1200, Math.round(freeLand * 0.25 / 10) * 10)} sqft`, s.lotSqft >= 5000 ? "Low" : "Medium"),
    c(true, "Junior ADU (within home)", "≤ 500 sqft", "Low"),
    c(true, "Garage conversion", "~400–600 sqft", "Low"),
    c(s.lotSqft >= 4000 && s.buildingSqft < 2400, "Second-story addition", "+600–1,000 sqft", "High"),
    c(freeLand > 900, "Rear addition", `+${Math.min(900, Math.round(freeLand * 0.2 / 10) * 10)} sqft`, "Medium"),
    c(false, "Basement conversion", "rare in Bay Area soils", "High"),
  ];
}

function costRanges(s) {
  const idx = CITY_INDEX[s.city.toLowerCase()] || 1.1;
  const base = { Kitchen: [350, 220], Bathroom: [480, 80], "Whole-home remodel": [260, 1600], Addition: [420, 400], ADU: [360, 600], "Garage conversion": [280, 480] };
  return Object.entries(base).map(([type, [psf, sqft]]) => {
    const avg = psf * idx * sqft;
    return { type, low: usd(avg * 0.78), avg: usd(avg), premium: usd(avg * 1.5) };
  });
}

function timelines() {
  // weeks: design, engineering, permitting, construction
  return [
    { type: "Kitchen", design: 3, engineering: 1, permitting: 4, construction: 8 },
    { type: "Bathroom", design: 2, engineering: 1, permitting: 3, construction: 5 },
    { type: "ADU", design: 5, engineering: 3, permitting: 12, construction: 18 },
    { type: "Addition", design: 5, engineering: 3, permitting: 10, construction: 16 },
    { type: "Whole-home remodel", design: 6, engineering: 3, permitting: 8, construction: 24 },
  ];
}

function roi(s) {
  const idx = CITY_INDEX[s.city.toLowerCase()] || 1.1;
  const projectCost = usd(360 * idx * 700); // ~700sqft ADU
  const rent = usd((2600 + (idx - 1) * 4000));
  const valueAdd = usd(projectCost * 1.4);
  const afterValue = usd(s.estValue + valueAdd);
  const equity = usd(afterValue - s.estValue - projectCost);
  const payback = +(projectCost / (rent * 12)).toFixed(1);
  return { projectCost, afterValue, equity, aduRentMonthly: rent, paybackYears: payback, tenYear: usd(rent * 12 * 10) };
}

function scores(s, risk, pot) {
  const age = Math.max(0, Math.min(30, (2025 - s.yearBuilt) / 3));
  const riskPenalty = { Low: 5, Medium: 15, High: 28 }[risk.score];
  const health = Math.max(35, Math.round(100 - age - riskPenalty));
  const expansion = Math.min(98, 40 + pot.filter((p) => p.feasible).length * 11 + (s.lotSqft > 5000 ? 10 : 0));
  const investment = Math.min(97, 50 + (s.estValue > 1300000 ? 18 : 8) + Math.round((CITY_INDEX[s.city.toLowerCase()] || 1.1) * 18));
  const riskScore = { Low: 22, Medium: 55, High: 80 }[risk.score];
  return { health, expansion, investment, risk: riskScore };
}

async function similar(env, city) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return [];
  try {
    const url =
      `${env.SUPABASE_URL}/rest/v1/projects?select=client,city,scope,cost` +
      `&cost=gt.0&city=ilike.*${encodeURIComponent(city)}*&order=updated_at.desc&limit=4`;
    const r = await fetch(url, {
      headers: { apikey: env.SUPABASE_KEY, authorization: `Bearer ${env.SUPABASE_KEY}` },
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map((p) => ({ city: p.city, cost: usd(p.cost), scope: (p.scope || "").slice(0, 80) }));
  } catch {
    return [];
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const address = (body && body.address ? String(body.address) : "").trim();
  if (!address) return json({ error: "no_address" }, 400);

  const snapshot = mockSnapshot(address);
  const risk = yearRisk(snapshot.yearBuilt);
  const pot = potential(snapshot);
  const report = {
    snapshotIsMock: true,
    snapshot,
    potential: pot,
    risk,
    cost: costRanges(snapshot),
    timeline: timelines(),
    roi: roi(snapshot),
    scores: scores(snapshot, risk, pot),
    similar: await similar(env, snapshot.city),
    disclaimer:
      "Preview report. Property details are estimated until a licensed data provider is connected; construction figures are non-binding. Your free JR consultation provides exact numbers.",
  };
  return json(report, 200);
}
