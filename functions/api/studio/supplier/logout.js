// POST /api/studio/supplier/logout — clears the session cookie.
import { preflight, sessionCookie } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "set-cookie": sessionCookie("", 0) },
  });
}
