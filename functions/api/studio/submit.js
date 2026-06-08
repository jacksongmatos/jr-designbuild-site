// POST /api/studio/submit — turns a Studio combination into an ERP lead.
// Body: {
//   project: { client_name, client_email, client_phone, title, base_image_path },
//   applications: [ { catalog_item_id, region_json, opacity, blend_mode } ]
// }
// Creates studio_projects (submitted) + studio_applications, snapshots the
// chosen items/suppliers into studio_leads.summary_json (which the ERP reads
// via studio_leads_unified). All server-side with the service role.

import { json, preflight, configured, sb, randomToken } from "../../_lib/studio.js";

export function onRequestOptions() {
  return preflight("POST,OPTIONS");
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const p = b.project || {};
  const apps = Array.isArray(b.applications) ? b.applications : [];
  if (!p.base_image_path) return json({ ok: false, error: "missing_base_image" }, 400);
  if (!p.client_email && !p.client_phone) return json({ ok: false, error: "missing_contact" }, 400);

  if (!configured(env)) return json({ ok: true, stored: false });

  try {
    // 1) project
    const projRes = await sb(env, "studio_projects", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        client_name: p.client_name || null,
        client_email: p.client_email || null,
        client_phone: p.client_phone || null,
        base_image_path: p.base_image_path,
        title: p.title || null,
        edit_token: randomToken(),
        status: "submitted",
      }),
    });
    if (!projRes.ok) return json({ ok: false, error: "supabase_project", detail: (await projRes.text()).slice(0, 300) }, 502);
    const project = (await projRes.json())[0];

    // 2) applications
    const rows = apps
      .filter((a) => a && a.region_json)
      .map((a) => ({
        project_id: project.id,
        catalog_item_id: a.catalog_item_id || null,
        region_json: a.region_json,
        opacity: typeof a.opacity === "number" ? a.opacity : 1,
        blend_mode: a.blend_mode || "multiply",
      }));
    if (rows.length) {
      const appRes = await sb(env, "studio_applications", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify(rows),
      });
      if (!appRes.ok) return json({ ok: false, error: "supabase_apps", detail: (await appRes.text()).slice(0, 300) }, 502);
    }

    // 3) snapshot the applied items for the lead summary
    const ids = [...new Set(rows.map((r) => r.catalog_item_id).filter(Boolean))];
    let items = [];
    if (ids.length) {
      const itemRes = await sb(env, `studio_catalog_items?id=in.(${ids.join(",")})&select=id,name,swatch_color,is_jr_product,studio_material_categories(name),studio_suppliers(company_name)`);
      if (itemRes.ok) {
        const data = await itemRes.json();
        items = data.map((it) => ({
          name: it.name,
          category: it.studio_material_categories?.name || null,
          supplier: it.studio_suppliers?.company_name || (it.is_jr_product ? "JR Design Build" : null),
          swatch_color: it.swatch_color || null,
        }));
      }
    }
    const suppliers = [...new Set(items.map((i) => i.supplier).filter(Boolean))];
    const summary = { base_image_path: p.base_image_path, title: p.title || null, item_count: items.length, items, suppliers };

    // 4) lead (what the ERP consumes)
    const leadRes = await sb(env, "studio_leads", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        project_id: project.id,
        client_name: p.client_name || null,
        client_email: p.client_email || null,
        client_phone: p.client_phone || null,
        summary_json: summary,
      }),
    });
    if (!leadRes.ok) return json({ ok: false, error: "supabase_lead", detail: (await leadRes.text()).slice(0, 300) }, 502);
    const lead = (await leadRes.json())[0];

    return json({ ok: true, stored: true, project_id: project.id, lead_id: lead.id });
  } catch (e) {
    return json({ ok: false, error: "network", detail: String(e).slice(0, 200) }, 502);
  }
}
