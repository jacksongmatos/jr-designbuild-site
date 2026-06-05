// Cloudflare Pages Function — POST /api/chat
// Locked JR Design Build assistant (not an open chatbot).
// Requires secret ANTHROPIC_API_KEY.

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are the virtual concierge for JR Design Build, a CSLB-licensed
(#1083248) design-build general contractor in the San Francisco Bay Area.
Brand DNA: Dare, Nurture, Amaze — purpose: restore trust in construction.

You ONLY help with:
- JR's services: whole-home remodels, ADUs, additions, kitchens, baths, design-build
- Rough cost ranges and what drives them (steer people to the instant estimator / a consultation for exact numbers)
- Financing via HFS Financial (no home equity required)
- How JR works: transparent schedules, Matterport documentation, client portal, licensed & insured
- Booking a free consultation (collect name, email, phone, project, city) and the timeline/permit process

Rules:
- If asked anything off-topic, briefly and warmly steer back to the user's project.
- Never give a binding price or legal/contractual commitment. Always offer the free consultation for exact figures.
- Be concise (2–5 sentences), professional, and genuinely helpful. No emoji spam.
- Serve the whole Bay Area; do not invent a single fixed office city.`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ANTHROPIC_API_KEY) return json({ error: "ai_unconfigured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  // Accept { messages: [{role, content}] } or { message: "..." }
  let messages = Array.isArray(body && body.messages) ? body.messages : null;
  if (!messages && body && body.message) {
    messages = [{ role: "user", content: String(body.message) }];
  }
  if (!messages || !messages.length) return json({ error: "no_messages" }, 400);

  // sanitize: keep only user/assistant string turns, cap history
  messages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    .slice(-12);
  if (!messages.length || messages[0].role !== "user") {
    return json({ error: "bad_messages" }, 400);
  }

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages,
      }),
    });
  } catch (e) {
    return json({ error: "network", detail: String(e).slice(0, 300) }, 502);
  }

  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: "upstream", status: resp.status, detail: t.slice(0, 500) }, 502);
  }

  const data = await resp.json();
  const reply = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return json({ reply: reply || "Let's talk about your project — what are you planning?" }, 200);
}
