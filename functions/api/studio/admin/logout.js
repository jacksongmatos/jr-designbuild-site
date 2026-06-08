// POST /api/studio/admin/logout — clears the admin cookie.
import { preflight, adminCookie } from "../../../_lib/studio.js";

export const onRequestOptions = () => preflight("POST,OPTIONS");

export function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "set-cookie": adminCookie("", 0) },
  });
}
