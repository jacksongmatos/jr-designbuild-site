// Cloudflare Pages Function — POST /api/lead
// Captures a website lead into JR's `leads` table (Supabase) AND texts the
// owner via Dialpad. Both steps degrade gracefully when their env vars are
// missing, so the front-end never breaks while secrets are configured.

import { saveAndNotify } from "../_lib/leads.js";

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

  const result = await saveAndNotify(env, b);
  return json(result);
}

// Temporary diagnostic: GET /api/lead lists Dialpad users so you can find the
// correct DIALPAD_USER_ID. Remove this once the env var is configured.
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DIALPAD_API_KEY) return json({ error: "no DIALPAD_API_KEY" }, 400);
  const r = await fetch("https://dialpad.com/api/v2/users", {
    headers: { authorization: `Bearer ${env.DIALPAD_API_KEY}`, accept: "application/json" },
  });
  const data = await r.json().catch(() => ({}));
  return json({ status: r.status, data });
}
