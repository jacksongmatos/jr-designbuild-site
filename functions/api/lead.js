// Cloudflare Pages Function — POST /api/lead
// Captures a website lead into JR's real `leads` table (Supabase).
// No-op (still returns ok) until SUPABASE_URL + SUPABASE_KEY are configured,
// so the front-end never breaks. Uses the service-role key (server-side only).

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

export async function onRequestPost(context) {
  const { request, env } = context;

  let b;
  try {
    b = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  // Persist only when configured; otherwise acknowledge so the UI flows.
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return json({ ok: true, stored: false });
  }

  const noteParts = [];
  if (b.source) noteParts.push(`Source: ${b.source}`);
  if (b.projectType) noteParts.push(`Project: ${b.projectType}`);
  if (b.finish) noteParts.push(`Finish: ${b.finish}`);
  if (b.city) noteParts.push(`City: ${b.city}`);
  if (b.size) noteParts.push(`Size: ~${b.size} sqft`);
  if (b.score != null) noteParts.push(`Lead score: ${b.score}`);
  if (b.notes) noteParts.push(`Notes: ${b.notes}`);

  const row = {
    lead_name: b.name || b.client_name || null,
    client_name: b.name || b.client_name || null,
    phone: b.phone || null,
    email: b.email || null,
    address: b.address || b.city || null,
    estimate_amount: typeof b.estimate === "number" ? b.estimate : null,
    status: "Website",
    notes: noteParts.join(" · ") || null,
  };

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_KEY,
        authorization: `Bearer ${env.SUPABASE_KEY}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ ok: false, error: "supabase", detail: t.slice(0, 300) }, 502);
    }
  } catch (e) {
    return json({ ok: false, error: "network", detail: String(e).slice(0, 200) }, 502);
  }

  return json({ ok: true, stored: true });
}
