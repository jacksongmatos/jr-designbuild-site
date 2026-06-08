// GET /api/studio/supplier/me — current supplier profile + their items.
// Identity comes from the signed session cookie.

import { json, preflight, configured, sb, readSession } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("GET,OPTIONS");

export async function onRequestGet({ request, env }) {
  const sess = await readSession(env, request);
  if (!sess) return json({ ok: false, authenticated: false }, 401);
  if (!configured(env)) return json({ ok: true, authenticated: true, supplier: null, items: [] });

  const sres = await sb(env, `studio_suppliers?user_id=eq.${sess.uid}&select=id,company_name,contact_name,email,phone,status&limit=1`);
  const supplier = (sres.ok ? await sres.json() : [])[0] || null;

  let items = [];
  if (supplier) {
    const ires = await sb(env, `studio_catalog_items?supplier_id=eq.${supplier.id}&select=id,name,description,category_id,image_path,swatch_color,price_note,status&order=created_at.desc`);
    items = ires.ok ? await ires.json() : [];
  }
  return json({ ok: true, authenticated: true, supplier, items });
}
