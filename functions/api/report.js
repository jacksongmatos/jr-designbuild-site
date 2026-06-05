// Cloudflare Pages Function — POST /api/report
// Property Intelligence Report orchestrator.
// Works with ZERO secrets (deterministic heuristics + a clearly-labeled MOCK
// property snapshot). Enriches "similar projects" from the real JR ERP when
// SUPABASE_URL/KEY are set. Swap the mock snapshot for a licensed property
// provider (Regrid/Rentcast/ATTOM) in /api/property/resolve later.

import { resolveProperty, CITY_INDEX } from "../_lib/property.js";

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

const usd = (n) => Math.round(Number(n) || 0);

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
  const rent = usd(s.rentEstimate || (2600 + (idx - 1) * 4000));
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

  const { snapshot, isMock } = await resolveProperty(env, address);
  const risk = yearRisk(snapshot.yearBuilt);
  const pot = potential(snapshot);
  const report = {
    snapshotIsMock: isMock,
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
