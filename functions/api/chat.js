// Cloudflare Pages Function — POST /api/chat
// Locked JR Design Build concierge that ALSO runs intake: it gathers the
// visitor's name, contact, city and project, then calls the `submit_lead`
// tool. The tool handler stores the lead (Supabase) and texts the owner
// via Dialpad. Requires secret ANTHROPIC_API_KEY; lead delivery uses the
// Supabase / Dialpad env vars documented in functions/_lib/leads.js.

import { saveAndNotify } from "../_lib/leads.js";

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are the virtual concierge for JR Design Build, a CSLB-licensed
(#1083248) design-build general contractor in the San Francisco Bay Area.
Brand DNA: Dare, Nurture, Amaze — purpose: restore trust in construction.

Your job has two parts, IN THIS ORDER:

STEP 1 — INTAKE FIRST (required gate). In your very first reply, ask for
all four of these at once, and do NOT discuss costs, services, financing
or anything else until you have ALL FOUR:
  • Full name (first AND last name)
  • Phone number
  • Project address (street, city)
  • What they want to do (the project — e.g. kitchen, bathroom, ADU, addition, whole-home remodel)
Briefly reassure the visitor WHY: "I grab these first so the JR team has
your details even if the connection drops — then I'm all yours." Be warm
but firm: if the visitor tries to skip ahead, acknowledge warmly and say
you'll get right into it as soon as you have those four. If a name has only
one word, politely ask for the last name too.

As SOON as you have all four (full name + phone + address + project), call
the submit_lead tool immediately so the contact is saved even if the chat
ends. Then confirm: "Got it — you're saved, so we won't lose touch."

STEP 2 — THE PROJECT. Now help warmly: dig into the project details
(scope, timeline, budget if offered). You can answer rough cost ranges
(steer to the instant estimator / a free consultation for exact numbers),
financing via HFS Financial (no home equity required), and how JR works
(transparent schedules, Matterport documentation, client portal, licensed
& insured). If you learn meaningful new details, call submit_lead again to
update the lead.

Rules:
- Never give a binding price or legal/contractual commitment. Always offer the
  free consultation for exact figures.
- Be concise (2–5 sentences), professional, genuinely helpful. No emoji spam.
- Serve the whole Bay Area; do not invent a single fixed office city.
- If asked anything off-topic, warmly steer back to the intake or the project.`;

const TOOLS = [
  {
    name: "submit_lead",
    description:
      "Save the visitor as a lead and alert the JR Design Build team. Call this AS SOON as you have all four: full name, phone, address, and project. Include every field you have gathered.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's full name (first and last)" },
        phone: { type: "string", description: "Phone number" },
        address: { type: "string", description: "Project address — street and city" },
        email: { type: "string", description: "Email address, if given" },
        city: { type: "string", description: "Bay Area city for the project" },
        project: {
          type: "string",
          description:
            "Short description of what they want to build/remodel (type, scope, timeline, budget if mentioned).",
        },
      },
      required: ["name", "phone", "address", "project"],
    },
  },
];

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

async function callAnthropic(env, messages) {
  return fetch("https://api.anthropic.com/v1/messages", {
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
      tools: TOOLS,
      messages,
    }),
  });
}

function textFrom(content) {
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
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
  // Strip leading assistant turns (the UI prefills a greeting in local state)
     while (messages.length && messages[0].role !== "user") messages.shift();
     if (!messages.length || messages[0].role !== "user") {
    return json({ error: "bad_messages" }, 400);
  }

  let resp;
  try {
    resp = await callAnthropic(env, messages);
  } catch (e) {
    return json({ error: "network", detail: String(e).slice(0, 300) }, 502);
  }
  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: "upstream", status: resp.status, detail: t.slice(0, 500) }, 502);
  }

  let data = await resp.json();
  let captured = false;

  // Handle a single round of tool use (submit_lead).
  if (data.stop_reason === "tool_use") {
    const toolUses = (data.content || []).filter((b) => b.type === "tool_use");
    const results = [];
    for (const tu of toolUses) {
      if (tu.name === "submit_lead") {
        const i = tu.input || {};
        await saveAndNotify(env, {
          name: i.name,
          phone: i.phone,
          email: i.email,
          address: i.address,
          city: i.city,
          notes: i.project,
          projectType: i.project,
          source: "Website chat",
        });
        captured = true;
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: "Lead saved and the JR team has been notified.",
        });
      } else {
        results.push({ type: "tool_result", tool_use_id: tu.id, content: "Unknown tool." });
      }
    }

    const followup = [
      ...messages,
      { role: "assistant", content: data.content },
      { role: "user", content: results },
    ];
    try {
      const r2 = await callAnthropic(env, followup);
      if (r2.ok) data = await r2.json();
    } catch (_) {
      // fall through with a sensible confirmation below
    }
  }

  const reply =
    textFrom(data.content) ||
    (captured
      ? "Thank you — I've passed your details to the JR team and someone will reach out shortly."
      : "Let's talk about your project — what are you planning?");

  return json({ reply, captured }, 200);
}
