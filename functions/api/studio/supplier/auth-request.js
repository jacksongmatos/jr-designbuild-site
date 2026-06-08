// POST /api/studio/supplier/auth-request { email }
// Sends a one-time login code via Supabase Auth (magic-link OTP). Requires
// SMTP configured in Supabase and the Magic Link email template to include the
// {{ .Token }} code. See docs/STUDIO_PORTAL.md.

import { json, preflight, configured, auth } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!b.email) return json({ ok: false, error: "missing_email" }, 400);
  if (!configured(env)) return json({ ok: true, sent: false });

  const r = await auth(env, "otp", { method: "POST", body: JSON.stringify({ email: b.email, create_user: true }) });
  if (!r.ok) return json({ ok: false, error: "auth", detail: (await r.text()).slice(0, 300) }, 502);
  return json({ ok: true, sent: true });
}
