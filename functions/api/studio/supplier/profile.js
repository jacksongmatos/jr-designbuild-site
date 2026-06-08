// POST /api/studio/supplier/profile { company_name, contact_name, email, phone }
// Creates or updates the signed-in supplier's profile. New profiles start
// 'pending' (the status guard would force it anyway); editing the profile never
// changes approval status.

import { json, preflight, configured, sb, readSession } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  const sess = await readSession(env, request);
  if (!sess) return json({ ok: false, authenticated: false }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!b.company_name) return json({ ok: false, error: "missing_company" }, 400);
  if (!configured(env)) return json({ ok: true, stored: false });

  const ex = await sb(env, `studio_suppliers?user_id=eq.${sess.uid}&select=id&limit=1`);
  const has = (ex.ok ? await ex.json() : []).length > 0;

  let r;
  if (has) {
    r = await sb(env, `studio_suppliers?user_id=eq.${sess.uid}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ company_name: b.company_name, contact_name: b.contact_name || null, email: b.email || null, phone: b.phone || null }),
    });
  } else {
    r = await sb(env, "studio_suppliers", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ user_id: sess.uid, company_name: b.company_name, contact_name: b.contact_name || null, email: b.email || null, phone: b.phone || null, status: "pending" }),
    });
  }
  if (!r.ok) return json({ ok: false, error: "supabase", detail: (await r.text()).slice(0, 200) }, 502);
  return json({ ok: true, stored: true });
}
