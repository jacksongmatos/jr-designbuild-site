// POST /api/studio/supplier/auth-verify { email, code }
// Verifies the OTP code with Supabase Auth, then issues our own signed,
// HttpOnly session cookie (so the browser never holds Supabase tokens).

import { json, preflight, configured, auth, sb, signSession, sessionCookie } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!b.email || !b.code) return json({ ok: false, error: "missing" }, 400);
  if (!configured(env)) return json({ ok: false, error: "not_configured" }, 503);

  const r = await auth(env, "verify", { method: "POST", body: JSON.stringify({ type: "email", email: b.email, token: b.code }) });
  if (!r.ok) return json({ ok: false, error: "invalid_code", detail: (await r.text()).slice(0, 200) }, 401);
  const data = await r.json();
  const uid = data.user?.id || data.id;
  if (!uid) return json({ ok: false, error: "no_user" }, 502);

  const sres = await sb(env, `studio_suppliers?user_id=eq.${uid}&select=id,company_name,status&limit=1`);
  const rows = sres.ok ? await sres.json() : [];

  const cookie = sessionCookie(encodeURIComponent(await signSession(env, uid)));
  return new Response(
    JSON.stringify({ ok: true, needsProfile: rows.length === 0, supplier: rows[0] || null, email: b.email }),
    { status: 200, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "set-cookie": cookie } }
  );
}
