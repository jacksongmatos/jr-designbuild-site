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

Your job has two parts:
1) Help with JR's services: whole-home remodels, ADUs, additions, kitchens,
   baths, design-build; rough cost ranges and what drives them (steer to the
   instant estimator / a consultation for exact numbers); financing via HFS
   Financial (no home equity required); how JR works (transparent schedules,
   Matterport documentation, client portal, licensed & insured).
2) INTAKE — this is important. Naturally and warmly collect, over the course
   of the conversation: the visitor's name, a phone number (preferred) or
   email, their city, and a short description of the project. Ask for one or
   two things at a time; don't interrogate. Once you have at least a name,
   one way to reach them (phone or email), and some idea of the project,
   call the submit_lead tool with everything you have. After the tool runs,
   confirm warmly that the JR team will reach out shortly, and offer to keep
   answering questions.

Rules:
- If asked anything off-topic, briefly and warmly steer back to their project.
- Never give a binding price or legal/contractual commitment. Always offer the
  free consultation for exact figures.
- Be concise (2–5 sentences), professional, genuinely helpful. No emoji spam.
- Serve the whole Bay Area; do not invent a single fixed office city.
- Only call submit_lead once per conversation unless the visitor gives new or
  corrected contact details.`;

const TOOLS = [
  {
    name: "submit_lead",
    description:
      "Save the visitor as a lead and alert the JR Design Build team. Call this once you have at least a name, a phone or email, and a sense of the project. Include every field you have gathered.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Visitor's full name" },
        phone: { type: "string", description: "Phone number, if given" },
        email: { type: "string", description: "Email address, if given" },
        city: { type: "string", description: "Bay Area city for the project" },
        project: {
          type: "string",
          description:
            "Short description of what they want to build/remodel (type, scope, timeline, budget if mentioned).",
        },
      },
      required: ["name", "project"],
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
