// Shared lead handling for JR Design Build website.
//  - persistLead:  writes a row into the Supabase `leads` table (if configured)
//  - notifyDialpad: sends an SMS to the owner via the Dialpad API (if configured)
//  - saveAndNotify: does both, independently, and never throws.
//
// Everything degrades gracefully: when a given integration's env vars are
// missing the step is skipped and reported as `false`, so the front-end flow
// never breaks while secrets are still being configured.
//
// Required Cloudflare env / secrets:
//   Supabase (storage):   SUPABASE_URL, SUPABASE_KEY (service-role)
//   Dialpad  (SMS alert): DIALPAD_API_KEY, DIALPAD_USER_ID, DIALPAD_TO_NUMBER
//     - DIALPAD_API_KEY   : API token from the Dialpad admin / ERP integration
//     - DIALPAD_USER_ID   : numeric Dialpad user id the text is sent "from"
//     - DIALPAD_TO_NUMBER : E.164 number that should receive the alert (+1...)

// Build a normalized lead object from a loose request body.
export function normalizeLead(b = {}) {
  return {
    name: b.name || b.client_name || null,
    phone: b.phone || null,
    email: b.email || null,
    city: b.city || null,
    address: b.address || b.city || null,
    projectType: b.projectType || b.project || null,
    finish: b.finish || null,
    size: b.size != null ? b.size : null,
    estimate: typeof b.estimate === "number" ? b.estimate : null,
    score: b.score != null ? b.score : null,
    source: b.source || "Website",
    notes: b.notes || null,
  };
}

// One-line-per-field SMS body. Kept short; Dialpad segments long messages.
export function leadToSms(lead) {
  const lines = ["New JR website lead"];
  if (lead.name) lines.push(`Name: ${lead.name}`);
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.city) lines.push(`City: ${lead.city}`);
  if (lead.projectType) lines.push(`Project: ${lead.projectType}`);
  if (lead.notes) lines.push(`Notes: ${lead.notes}`);
  lines.push(`Source: ${lead.source}`);
  return lines.join("\n");
}

// Persist to Supabase `leads`. Returns true if stored.
export async function persistLead(env, lead) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return false;

  const noteParts = [];
  if (lead.projectType) noteParts.push(`Project: ${lead.projectType}`);
  if (lead.finish) noteParts.push(`Finish: ${lead.finish}`);
  if (lead.city) noteParts.push(`City: ${lead.city}`);
  if (lead.size) noteParts.push(`Size: ~${lead.size} sqft`);
  if (lead.score != null) noteParts.push(`Lead score: ${lead.score}`);
  if (lead.notes) noteParts.push(`Notes: ${lead.notes}`);

  const row = {
    lead_name: lead.name,
    client_name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    estimate_amount: lead.estimate,
    status: lead.source || "Website",
    notes: noteParts.join(" · ") || null,
  };

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${env.SUPABASE_KEY}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`supabase ${r.status}: ${t.slice(0, 200)}`);
  }
  return true;
}

// Send an SMS alert to the owner via Dialpad. Returns true if sent.
export async function notifyDialpad(env, text) {
  if (!env.DIALPAD_API_KEY || !env.DIALPAD_USER_ID || !env.DIALPAD_TO_NUMBER) {
    return false;
  }
  const to = String(env.DIALPAD_TO_NUMBER)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const r = await fetch("https://dialpad.com/api/v2/sms", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.DIALPAD_API_KEY}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      user_id: Number(env.DIALPAD_USER_ID),
      to_numbers: to,
      text,
      infer_country_code: true,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`dialpad ${r.status}: ${t.slice(0, 200)}`);
  }
  return true;
}

// Store + notify. Never throws; returns a status object with any errors.
export async function saveAndNotify(env, body) {
  const lead = normalizeLead(body);
  const out = { ok: true, stored: false, notified: false, errors: [] };

  try {
    out.stored = await persistLead(env, lead);
  } catch (e) {
    out.errors.push(String(e.message || e).slice(0, 200));
  }
  try {
    out.notified = await notifyDialpad(env, leadToSms(lead));
  } catch (e) {
    out.errors.push(String(e.message || e).slice(0, 200));
  }
  return out;
}
