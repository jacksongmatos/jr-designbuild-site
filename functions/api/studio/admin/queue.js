// GET /api/studio/admin/queue — pending suppliers, pending items, recent leads.
// Admin session required.

import { json, preflight, configured, sb, readAdmin } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("GET,OPTIONS");

export async function onRequestGet({ request, env }) {
  if (!(await readAdmin(env, request))) return json({ ok: false, error: "unauthorized" }, 401);
  if (!configured(env)) return json({ ok: true, suppliers: [], items: [], leads: [] });

  const [supRes, itemRes, leadRes] = await Promise.all([
    sb(env, "studio_suppliers?status=eq.pending&select=id,company_name,contact_name,email,phone,created_at&order=created_at.asc"),
    sb(env, "studio_catalog_items?status=eq.pending&select=id,name,description,image_path,swatch_color,price_note,studio_material_categories(name),studio_suppliers(company_name)&order=created_at.asc"),
    sb(env, "studio_leads?select=id,client_name,client_email,client_phone,summary_json,created_at&order=created_at.desc&limit=50"),
  ]);

  const publicUrl = (p) => p ? `${env.SUPABASE_URL}/storage/v1/object/public/studio-catalog/${p}` : null;
  const items = (itemRes.ok ? await itemRes.json() : []).map((it) => ({
    id: it.id, name: it.name, description: it.description, swatch_color: it.swatch_color, price_note: it.price_note,
    category: it.studio_material_categories?.name || null,
    supplier: it.studio_suppliers?.company_name || null,
    image_url: publicUrl(it.image_path),
  }));

  return json({
    ok: true,
    suppliers: supRes.ok ? await supRes.json() : [],
    items,
    leads: leadRes.ok ? await leadRes.json() : [],
  });
}
