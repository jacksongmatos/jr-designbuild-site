// Shared helpers for the Studio Pages Functions. All Supabase access is
// server-side with the service-role key (env.SUPABASE_KEY) — never the client.

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

export function preflight(methods = "POST,OPTIONS") {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": methods,
      "access-control-allow-headers": "content-type",
    },
  });
}

export function configured(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_KEY);
}

// PostgREST call (tables/views under /rest/v1).
export function sb(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${env.SUPABASE_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// Storage Object API (/storage/v1).
export function storage(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${env.SUPABASE_KEY}`,
      ...(init.headers || {}),
    },
  });
}

// Public URL for an object in a public bucket.
export function publicUrl(env, bucket, path) {
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function randomToken(n = 24) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// GoTrue (Supabase Auth) call. apikey = service key works for otp/verify.
export function auth(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${env.SUPABASE_KEY}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// ── Signed session cookie (HMAC) — our own session so we never juggle Supabase
// token refresh in the browser. Payload: { uid, exp }. ────────────────────────
const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
};
function secret(env) { return env.STUDIO_SESSION_SECRET || env.SUPABASE_KEY || "dev-secret"; }
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u.enc(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

export async function signSession(env, uid, ttlSec = 60 * 60 * 24 * 30) {
  const payload = b64u.enc(new TextEncoder().encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + ttlSec })));
  return `${payload}.${await hmac(env, payload)}`;
}
export async function readSession(env, request) {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)jr_sup=([^;]+)/);
  if (!m) return null;
  const [payload, sig] = decodeURIComponent(m[1]).split(".");
  if (!payload || !sig || (await hmac(env, payload)) !== sig) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64u.dec(payload)));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data; // { uid, exp }
  } catch { return null; }
}
export function sessionCookie(value, maxAge = 60 * 60 * 24 * 30) {
  const base = `jr_sup=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return value ? `${base}; Max-Age=${maxAge}` : `jr_sup=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// ── Admin session (shared STUDIO_ADMIN_KEY -> signed jr_adm cookie) ───────────
export async function signAdmin(env, ttlSec = 60 * 60 * 12) {
  const payload = b64u.enc(new TextEncoder().encode(JSON.stringify({ role: "admin", exp: Math.floor(Date.now() / 1000) + ttlSec })));
  return `${payload}.${await hmac(env, "adm:" + payload)}`;
}
export async function readAdmin(env, request) {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)jr_adm=([^;]+)/);
  if (!m) return false;
  const [payload, sig] = decodeURIComponent(m[1]).split(".");
  if (!payload || !sig || (await hmac(env, "adm:" + payload)) !== sig) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64u.dec(payload)));
    return data.role === "admin" && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
export function adminCookie(value, maxAge = 60 * 60 * 12) {
  const base = `jr_adm=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return value ? `${base}; Max-Age=${maxAge}` : `jr_adm=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
