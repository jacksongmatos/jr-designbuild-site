// GET /api/studio/catalog — approved catalog items grouped by category, with
// supplier attribution. Server-side (service role); only status='approved'
// items are returned. Falls back to the default categories (empty items) when
// Supabase isn't configured so the Studio UI still renders.

import { json, preflight, configured, sb, publicUrl } from "../../_lib/studio.js";

const DEFAULT_CATEGORIES = [
  { name: "Flooring", slug: "flooring", sort: 10 },
  { name: "Wall Paint", slug: "wall-paint", sort: 20 },
  { name: "Cabinets", slug: "cabinets", sort: 30 },
  { name: "Countertop", slug: "countertop", sort: 40 },
  { name: "Backsplash", slug: "backsplash", sort: 50 },
  { name: "Tile", slug: "tile", sort: 60 },
  { name: "Lighting", slug: "lighting", sort: 70 },
  { name: "Hardware", slug: "hardware", sort: 80 },
];

export function onRequestOptions() {
  return preflight("GET,OPTIONS");
}

export async function onRequestGet({ env }) {
  if (!configured(env)) {
    return json({ ok: true, configured: false, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, items: [] })) });
  }

  try {
    const [catRes, itemRes] = await Promise.all([
      sb(env, "studio_material_categories?select=id,name,slug,sort&order=sort.asc"),
      sb(env, "studio_catalog_items?status=eq.approved&select=id,name,description,image_path,texture_path,swatch_color,price_note,is_jr_product,category_id,studio_suppliers(company_name)"),
    ]);
    if (!catRes.ok) return json({ ok: false, error: "supabase", detail: (await catRes.text()).slice(0, 300) }, 502);

    const cats = await catRes.json();
    const items = itemRes.ok ? await itemRes.json() : [];

    const withUrls = items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      swatch_color: it.swatch_color,
      price_note: it.price_note,
      is_jr_product: it.is_jr_product,
      category_id: it.category_id,
      supplier: it.studio_suppliers?.company_name || (it.is_jr_product ? "JR Design Build" : null),
      image_url: it.image_path ? publicUrl(env, "studio-catalog", it.image_path) : null,
      texture_url: it.texture_path ? publicUrl(env, "studio-catalog", it.texture_path) : null,
    }));

    const categories = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      items: withUrls.filter((it) => it.category_id === c.id),
    }));

    return json({ ok: true, configured: true, categories });
  } catch (e) {
    return json({ ok: false, error: "network", detail: String(e).slice(0, 200) }, 502);
  }
}
