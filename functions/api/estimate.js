// Cloudflare Pages Function — POST /api/estimate
// Vision-grounded construction estimate for JR Design Build.
// Requires secret ANTHROPIC_API_KEY. If SUPABASE_URL + SUPABASE_KEY (service
// role, server-side only) are set, the estimate is grounded on JR's REAL ERP
// data: project_type_benchmarks + recent projects.cost by city/scope.

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are the senior cost estimator for JR Design Build, a CSLB-licensed
(#1083248) design-build general contractor in the San Francisco Bay Area.

Your ONLY job is to produce a realistic construction cost ESTIMATE for the
project described. You never chat, never answer off-topic questions, never give
legal/contractual commitments. If photos are provided, analyze them for scope,
condition, and red flags (water damage, dated systems, structural concerns).

If JR benchmark/past-project data is provided, calibrate your numbers to it.
Otherwise use typical current Bay Area ranges. Always give a sensible low–high
range, not a single number, and state your key assumptions.

Respond with ONLY a valid minified JSON object (no markdown, no prose) of EXACTLY
this shape:
{"rangeLow":<int usd>,"rangeHigh":<int usd>,"confidence":"low|medium|high",
"lineItems":[{"label":<string>,"amount":<int usd>}],
"assumptions":[<string>],"summary":<string ~2 sentences>,
"disclaimer":"Non-binding estimate. Your free JR consultation provides exact, fixed numbers."}`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
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

// Map the website project type to a free-text scope keyword used in projects.scope
function scopeKeyword(t) {
  return (
    {
      adu: "adu",
      kitchen: "kitchen",
      bathroom: "bath",
      bath: "bath",
      addition: "addition",
      "whole-home remodel": "remodel",
      whole: "remodel",
    }[(t || "").toLowerCase()] || ""
  );
}

async function buildGrounding(env, projectType, city) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return "";
  const sb = (path) =>
    fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: env.SUPABASE_KEY, authorization: `Bearer ${env.SUPABASE_KEY}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);

  const kw = scopeKeyword(projectType);
  const [bench, projs] = await Promise.all([
    sb(
      "project_type_benchmarks?select=type,scope_min,scope_max,avg_weeks,markup_pct,labor_pct,rough_pct,sample_count",
    ),
    sb("projects?select=city,zip,scope,cost&cost=gt.0&order=updated_at.desc&limit=80"),
  ]);

  const lines = [];
  if (Array.isArray(bench) && bench.length) {
    lines.push("JR benchmarks by type (scope $ range, typical weeks, sample size):");
    for (const b of bench) {
      lines.push(`- ${b.type}: $${b.scope_min}–$${b.scope_max}, ~${b.avg_weeks}w (n=${b.sample_count})`);
    }
  }
  const matched = (Array.isArray(projs) ? projs : [])
    .filter((p) => p && p.cost && (!kw || (p.scope || "").toLowerCase().includes(kw)))
    .slice(0, 12);
  const sample = matched.length ? matched : (Array.isArray(projs) ? projs.slice(0, 10) : []);
  if (sample.length) {
    lines.push("Recent JR projects (real totals — calibrate to these):");
    for (const p of sample) {
      lines.push(
        `- ${p.city || "?"}${p.zip ? " " + p.zip : ""}: $${Math.round(p.cost)} — ${(p.scope || "").slice(0, 70)}`,
      );
    }
  }
  return lines.join("\n");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ai_unconfigured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const { projectType, finish, city, size, notes } = body || {};
  const images = Array.isArray(body && body.images) ? body.images.slice(0, 6) : [];

  let grounding = "";
  try {
    grounding = await buildGrounding(env, projectType, city);
  } catch {
    /* best effort */
  }

  const content = [];
  for (const im of images) {
    if (im && im.data) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: im.media_type || "image/jpeg", data: im.data },
      });
    }
  }
  content.push({
    type: "text",
    text:
      `Project type: ${projectType || "(unspecified)"}\n` +
      `Finish level: ${finish || "(unspecified)"}\n` +
      `City: ${city || "(unspecified)"}\n` +
      `Approx. size: ${size ? size + " sqft" : "(unspecified)"}\n` +
      `Client notes: ${notes || "(none)"}\n\n` +
      (grounding ? grounding + "\n\n" : "") +
      "Produce one estimate as the required JSON object.",
  });

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, messages: [{ role: "user", content }] }),
    });
  } catch (e) {
    return json({ error: "network", detail: String(e).slice(0, 300) }, 502);
  }

  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: "upstream", status: resp.status, detail: t.slice(0, 500) }, 502);
  }

  const data = await resp.json();
  const txt = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let estimate;
  try {
    const m = txt.match(/\{[\s\S]*\}/);
    estimate = JSON.parse(m ? m[0] : txt);
  } catch {
    return json({ error: "parse", raw: txt.slice(0, 800) }, 502);
  }

  return json({ estimate, grounded: grounding.length > 0 }, 200);
}
