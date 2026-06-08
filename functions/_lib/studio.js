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
