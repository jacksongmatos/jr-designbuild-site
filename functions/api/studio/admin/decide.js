// POST /api/studio/admin/decide { kind: "supplier"|"item", id, status }
// Approves/rejects a supplier or catalog item. Service role bypasses the status
// guard, so this is the only path that can set an approved status. Admin only.

import { json, preflight, configured, sb, readAdmin } from "../../../_lib/studio.js";

const SUPPLIER_STATUS = ["pending", "approved", "rejected", "suspended"];
const ITEM_STATUS = ["pending", "approved", "rejected"];

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  if (!(await readAdmin(env, request))) return json({ ok: false, error: "unauthorized" }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!b.id || !b.kind || !b.status) return json({ ok: false, error: "missing" }, 400);
  if (!configured(env)) return json({ ok: true, stored: false });

  const table = b.kind === "supplier" ? "studio_suppliers" : b.kind === "item" ? "studio_catalog_items" : null;
  const allowed = b.kind === "supplier" ? SUPPLIER_STATUS : ITEM_STATUS;
  if (!table || !allowed.includes(b.status)) return json({ ok: false, error: "bad_request" }, 400);

  const r = await sb(env, `${table}?id=eq.${b.id}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ status: b.status }),
  });
  if (!r.ok) return json({ ok: false, error: "supabase", detail: (await r.text()).slice(0, 200) }, 502);
  return json({ ok: true, stored: true });
}
