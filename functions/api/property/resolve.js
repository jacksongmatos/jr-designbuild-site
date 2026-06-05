// POST /api/property/resolve  { address } | { zillowUrl }
// Returns a property snapshot. Real when provider keys are set, mock otherwise.
// Caches in Supabase table `pip_property_cache` when Supabase is configured so
// provider cost scales with unique addresses, not page views.

import { resolveProperty, addressFromZillowUrl, parseCity } from "../../_lib/property.js";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

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

const keyOf = (a) => a.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();

async function cacheGet(env, k) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return null;
  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/pip_property_cache?address_key=eq.${encodeURIComponent(k)}&select=snapshot,is_mock&limit=1`,
      { headers: { apikey: env.SUPABASE_KEY, authorization: `Bearer ${env.SUPABASE_KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function cachePut(env, k, snapshot, isMock) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY || isMock) return; // don't cache mocks
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/pip_property_cache?on_conflict=address_key`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_KEY,
        authorization: `Bearer ${env.SUPABASE_KEY}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ address_key: k, snapshot, is_mock: isMock, updated_at: new Date().toISOString() }),
    });
  } catch { /* non-fatal */ }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  let address = body && body.address ? String(body.address).trim() : "";
  if (!address && body && body.zillowUrl) address = addressFromZillowUrl(String(body.zillowUrl)) || "";
  if (!address) return json({ error: "no_address" }, 400);

  const k = keyOf(address);
  const cached = await cacheGet(env, k);
  if (cached) return json({ snapshot: cached.snapshot, isMock: cached.is_mock, cached: true });

  const { snapshot, isMock } = await resolveProperty(env, address);
  if (!snapshot.city) snapshot.city = parseCity(address);
  await cachePut(env, k, snapshot, isMock);
  return json({ snapshot, isMock, cached: false });
}
