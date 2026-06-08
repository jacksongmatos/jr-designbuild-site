// POST /api/studio/admin/login { key } — exchanges the shared STUDIO_ADMIN_KEY
// for a signed admin session cookie. Constant-time-ish compare.

import { json, preflight, signAdmin, adminCookie } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const expected = env.STUDIO_ADMIN_KEY;
  if (!expected) return json({ ok: false, error: "admin_not_configured" }, 503);
  if (!b.key || b.key.length !== expected.length || b.key !== expected) {
    return json({ ok: false, error: "invalid_key" }, 401);
  }
  const cookie = adminCookie(await signAdmin(env));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "set-cookie": cookie },
  });
}
