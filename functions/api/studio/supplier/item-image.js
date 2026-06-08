// POST /api/studio/supplier/item-image (multipart, field "file")
// Uploads a supplier item photo/swatch to the public studio-catalog bucket and
// returns the storage path. Auth required.

import { json, preflight, configured, storage, readSession, randomToken } from "../../../_lib/studio.js";

const MAX_BYTES = 8 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  const sess = await readSession(env, request);
  if (!sess) return json({ ok: false, authenticated: false }, 401);

  let file;
  try { const f = await request.formData(); file = f.get("file"); } catch { return json({ ok: false, error: "bad_form" }, 400); }
  if (!file || typeof file === "string") return json({ ok: false, error: "no_file" }, 400);
  const type = file.type || "";
  const ext = EXT[type];
  if (!ext) return json({ ok: false, error: "unsupported_type", detail: type }, 415);
  if (file.size > MAX_BYTES) return json({ ok: false, error: "too_large" }, 413);

  if (!configured(env)) return json({ ok: true, stored: false, path: null });

  const path = `item/${sess.uid.slice(0, 8)}/${Date.now()}-${randomToken(5)}.${ext}`;
  try {
    const r = await storage(env, `object/studio-catalog/${path}`, {
      method: "POST",
      headers: { "content-type": type, "cache-control": "3600", "x-upsert": "true" },
      body: file.stream ? file.stream() : await file.arrayBuffer(),
    });
    if (!r.ok) return json({ ok: false, error: "storage", detail: (await r.text()).slice(0, 300) }, 502);
  } catch (e) {
    return json({ ok: false, error: "network", detail: String(e).slice(0, 200) }, 502);
  }
  return json({ ok: true, stored: true, path });
}
