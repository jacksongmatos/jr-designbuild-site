// POST /api/studio/upload — accepts a client's room photo (multipart/form-data,
// field "file") and stores it in the private studio-photos bucket via the
// service role. Returns the storage path. The browser never touches Supabase.
// When Supabase isn't configured, returns stored:false so the UI keeps working
// with the local image (no persistence).

import { json, preflight, configured, storage, randomToken } from "../../_lib/studio.js";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function onRequestOptions() {
  return preflight("POST,OPTIONS");
}

export async function onRequestPost({ request, env }) {
  let file;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return json({ ok: false, error: "bad_form" }, 400);
  }
  if (!file || typeof file === "string") return json({ ok: false, error: "no_file" }, 400);

  const type = file.type || "";
  const ext = EXT[type];
  if (!ext) return json({ ok: false, error: "unsupported_type", detail: type }, 415);
  if (file.size > MAX_BYTES) return json({ ok: false, error: "too_large" }, 413);

  if (!configured(env)) return json({ ok: true, stored: false, path: null });

  const path = `client/${Date.now()}-${randomToken(6)}.${ext}`;
  try {
    const r = await storage(env, `object/studio-photos/${path}`, {
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
