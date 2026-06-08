// POST /api/studio/supplier/item — create or edit one of the signed-in
// supplier's catalog items. Only approved suppliers may add items; every write
// lands as 'pending' for JR review. Identity/ownership enforced server-side.

import { json, preflight, configured, sb, readSession } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

async function getSupplier(env, uid) {
  const r = await sb(env, `studio_suppliers?user_id=eq.${uid}&select=id,status&limit=1`);
  return (r.ok ? await r.json() : [])[0] || null;
}

export async function onRequestPost({ request, env }) {
  const sess = await readSession(env, request);
  if (!sess) return json({ ok: false, authenticated: false }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!configured(env)) return json({ ok: true, stored: false });

  const sup = await getSupplier(env, sess.uid);
  if (!sup) return json({ ok: false, error: "no_profile" }, 403);
  if (sup.status !== "approved") return json({ ok: false, error: "not_approved" }, 403);
  if (!b.name || !b.category_id) return json({ ok: false, error: "missing" }, 400);

  const row = {
    supplier_id: sup.id,
    category_id: b.category_id,
    name: b.name,
    description: b.description || null,
    image_path: b.image_path || null,
    texture_path: b.texture_path || b.image_path || null,
    swatch_color: b.swatch_color || null,
    price_note: b.price_note || null,
    status: "pending",
  };

  let r;
  if (b.id) {
    r = await sb(env, `studio_catalog_items?id=eq.${b.id}&supplier_id=eq.${sup.id}`, {
      method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify(row),
    });
  } else {
    r = await sb(env, "studio_catalog_items", {
      method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify(row),
    });
  }
  if (!r.ok) return json({ ok: false, error: "supabase", detail: (await r.text()).slice(0, 200) }, 502);
  return json({ ok: true, stored: true });
}
