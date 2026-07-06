import React, { useEffect, useRef, useState } from "react";
import { navigate } from "./nav";

/*
 * Floating AI assistant for JR Design Build.
 *  - "Estimate" tab: upload room photos + a few fields -> POST /api/estimate
 *    (Claude Opus 4.8 vision). Returns a structured price range.
 *  - "Ask JR" tab: locked concierge chat -> POST /api/chat.
 * Degrades gracefully: if ANTHROPIC_API_KEY isn't set yet (503) or the
 * functions aren't deployed, it shows a friendly fallback to the instant
 * tools / consultation instead of erroring.
 *
 * Opens on its own button, or when any code dispatches:
 *   window.dispatchEvent(new CustomEvent("jr:ai", { detail: { tab, ...prefill } }))
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const CITY_GROUPS = [
  {
    label: "Peninsula — San Mateo County",
    cities: [
      "South San Francisco", "Daly City", "Colma", "Brisbane", "San Bruno",
      "Millbrae", "Burlingame", "Hillsborough", "San Mateo", "Foster City",
      "Belmont", "San Carlos", "Redwood City", "Emerald Hills", "Menlo Park",
      "Atherton", "Woodside", "Portola Valley", "East Palo Alto", "Pacifica",
      "Half Moon Bay", "El Granada", "Moss Beach", "Montara",
    ],
  },
  { label: "San Francisco", cities: ["San Francisco"] },
  {
    label: "South Bay — Santa Clara County",
    cities: [
      "Palo Alto", "Mountain View", "Los Altos", "Los Altos Hills", "Sunnyvale",
      "Cupertino", "Santa Clara", "San Jose", "Campbell", "Saratoga",
      "Los Gatos", "Milpitas",
    ],
  },
  {
    label: "East Bay",
    cities: [
      "Oakland", "Berkeley", "Alameda", "Emeryville", "Piedmont", "San Leandro",
      "Castro Valley", "Hayward", "Union City", "Newark", "Fremont",
      "Richmond", "El Cerrito", "Walnut Creek", "Concord", "Lafayette",
      "Orinda", "Moraga", "Danville", "San Ramon", "Dublin", "Pleasanton",
      "Livermore",
    ],
  },
  {
    label: "North Bay",
    cities: [
      "Sausalito", "Mill Valley", "Tiburon", "Corte Madera", "Larkspur",
      "San Rafael", "Novato", "Petaluma", "Santa Rosa", "Napa", "Vallejo",
      "Fairfield",
    ],
  },
  { label: "Elsewhere", cities: ["Other Bay Area"] },
];
const CITIES = CITY_GROUPS.flatMap((g) => g.cities);
const TYPES = ["ADU", "Kitchen", "Bathroom", "Addition", "Whole-Home Remodel"];
// Slider range + sensible default size (sqft) per project type
const SIZE_BY_TYPE = {
  "ADU": { min: 150, max: 1200, step: 10, def: 600 },
  "Kitchen": { min: 40, max: 500, step: 5, def: 180 },
  "Bathroom": { min: 20, max: 200, step: 5, def: 60 },
  "Addition": { min: 100, max: 1500, step: 10, def: 400 },
  "Whole-Home Remodel": { min: 500, max: 5000, step: 50, def: 1800 },
};
const sizeRange = (t) => SIZE_BY_TYPE[t] || { min: 20, max: 4000, step: 10, def: 400 };
const clampSize = (n, t) => {
  const r = sizeRange(t);
  return Math.min(r.max, Math.max(r.min, Number(n) || r.def));
};
const FINISHES = ["Standard", "Premium", "Luxury"];
const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();

function fileToImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      const s = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", 0.82);
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = reject;
    img.src = url;
  });
}

const st = {
  fab: {
    position: "fixed", right: 22, bottom: 22, zIndex: 80,
    display: "flex", alignItems: "center", gap: 10,
    background: GOLD, color: INK, border: "none", borderRadius: 40,
    padding: "14px 20px", fontSize: 12, letterSpacing: 1.5, fontWeight: 700,
    textTransform: "uppercase", cursor: "pointer",
    boxShadow: "0 14px 36px -10px rgba(201,162,94,.6)",
  },
  panel: {
    position: "fixed", right: 18, bottom: 18, zIndex: 81,
    width: "min(400px, calc(100vw - 36px))", maxHeight: "min(76vh, 680px)",
    display: "flex", flexDirection: "column",
    background: "#100d0a", border: "1px solid #c9a25e33", borderRadius: 14,
    boxShadow: "0 30px 80px #000000cc", overflow: "hidden",
    fontFamily: "'Archivo', system-ui, sans-serif",
  },
  head: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", borderBottom: "1px solid #ffffff12",
    background: "radial-gradient(120% 120% at 80% 0%, #1a140b, #100d0a)",
  },
  tabs: { display: "flex", gap: 6 },
  tab: (a) => ({
    padding: "7px 14px", borderRadius: 20, fontSize: 11, letterSpacing: 1,
    textTransform: "uppercase", cursor: "pointer",
    border: "1px solid " + (a ? GOLD : "#ffffff22"),
    background: a ? GOLD : "transparent", color: a ? INK : "#ece6db",
  }),
  body: { padding: 16, overflowY: "auto", flex: 1 },
  label: {
    display: "block", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
    color: "#c9b48a", margin: "0 0 6px",
  },
  input: {
    width: "100%", background: "#ffffff0c", border: "1px solid #ffffff22",
    borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14,
    outline: "none", marginBottom: 12,
  },
  btn: {
    background: GOLD, color: INK, border: "none", borderRadius: 4,
    padding: "12px 18px", fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
    textTransform: "uppercase", cursor: "pointer", width: "100%",
  },
  ghost: {
    background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e88",
    borderRadius: 4, padding: "11px 16px", fontSize: 11, letterSpacing: 1.5,
    fontWeight: 600, textTransform: "uppercase", cursor: "pointer",
    textDecoration: "none", display: "inline-block",
  },
  big: { fontFamily: "'Bodoni Moda', serif", fontSize: 34, color: GOLD, lineHeight: 1.1 },
  note: { fontSize: 12.5, color: "#c9b48a", lineHeight: 1.6 },
  msgUser: {
    alignSelf: "flex-end", background: GOLD, color: INK, borderRadius: "12px 12px 2px 12px",
    padding: "9px 13px", fontSize: 14, maxWidth: "85%",
  },
  msgBot: {
    alignSelf: "flex-start", background: "#ffffff0e", color: "#f2ece0",
    borderRadius: "12px 12px 12px 2px", padding: "9px 13px", fontSize: 14,
    maxWidth: "90%", lineHeight: 1.5,
  },
};

function Fallback({ err }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 4px" }}>
      <div style={{ fontSize: 30 }}>✨</div>
      <p style={{ ...st.note, margin: "10px 0 16px" }}>
        {err === "ai_unconfigured"
          ? "The AI assistant isn't active yet (missing API key)."
          : "The AI assistant is unavailable right now."}{" "}
        In the meantime, use the instant estimator or book your free consultation.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <a href="/tools" onClick={(e) => { e.preventDefault(); navigate("tools"); }} style={st.ghost}>Instant tools</a>
        <a href="/contact" onClick={(e) => { e.preventDefault(); navigate("contact"); }} style={{ ...st.ghost, background: GOLD, color: INK, border: "none" }}>
          Book a consult
        </a>
      </div>
    </div>
  );
}

function EstimateTab({ prefill }) {
  // Prefill may send a short label (e.g. "Whole-Home") — match it to a known type.
  const initialType =
    TYPES.find((t) => t === prefill.projectType) ||
    TYPES.find((t) => prefill.projectType && t.startsWith(prefill.projectType)) ||
    "ADU";
  const [type, setType] = useState(initialType);
  const [finish, setFinish] = useState(prefill.finish ? cap(prefill.finish) : "Premium");
  const [city, setCity] = useState(prefill.city || CITIES[0]);
  const [size, setSize] = useState(clampSize(prefill.size || sizeRange(initialType).def, initialType));
  const pickType = (t) => { setType(t); setSize(sizeRange(t).def); };
  const [notes, setNotes] = useState("");
  const [imgs, setImgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    const out = [];
    for (const f of files) {
      try { out.push(await fileToImage(f)); } catch (_) {}
    }
    setImgs(out);
  };

  const run = async () => {
    setLoading(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectType: type, finish: finish.toLowerCase(), city, size, notes,
          images: imgs.map((i) => ({ media_type: i.media_type, data: i.data })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data.error || "error"); return; }
      setRes(data.estimate);
    } catch (e) {
      setErr("network");
    } finally {
      setLoading(false);
    }
  };

  if (err) return <Fallback err={err} />;

  return (
    <div>
      <p style={{ ...st.note, marginTop: 0 }}>
        Add a few photos of the space — we read scope & condition and return a preliminary Bay Area range.
      </p>
      <span style={st.label}>Project</span>
      <select style={st.input} value={type} onChange={(e) => pickType(e.target.value)}>
        {TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <span style={st.label}>Finish</span>
          <select style={st.input} value={finish} onChange={(e) => setFinish(e.target.value)}>
            {FINISHES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <span style={st.label}>City</span>
          <select style={st.input} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITY_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.cities.map((c) => <option key={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <span style={st.label}>Approx. size — {size} sqft</span>
      <input type="range" min={sizeRange(type).min} max={sizeRange(type).max}
        step={sizeRange(type).step} value={size}
        onChange={(e) => setSize(Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, marginBottom: 12 }} />
      <span style={st.label}>Photos (up to 4)</span>
      <input type="file" accept="image/*" multiple onChange={onFiles}
        style={{ ...st.input, padding: 8 }} />
      {imgs.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {imgs.map((i, k) => (
            <img key={k} src={i.preview} alt="" width={52} height={52}
              style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #ffffff22" }} />
          ))}
        </div>
      )}
      <span style={st.label}>Notes (optional)</span>
      <textarea style={{ ...st.input, minHeight: 60, resize: "vertical" }}
        placeholder="Anything specific about scope, timeline, budget…"
        value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button style={{ ...st.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={run}>
        {loading ? "Analyzing…" : "Get preliminary estimate ✨"}
      </button>

      {res && (
        <div style={{ marginTop: 18, borderTop: "1px solid #c9a25e22", paddingTop: 16 }}>
          <span style={st.label}>Estimated investment</span>
          <div style={st.big}>{usd(res.rangeLow)} – {usd(res.rangeHigh)}</div>
          {res.confidence && (
            <div style={{ ...st.note, marginTop: 4 }}>Confidence: {res.confidence}</div>
          )}
          {res.summary && (
            <p style={{ color: "#f2ece0", fontSize: 14, lineHeight: 1.6, margin: "12px 0" }}>
              {res.summary}
            </p>
          )}
          {Array.isArray(res.lineItems) && res.lineItems.length > 0 && (
            <div style={{ margin: "10px 0" }}>
              {res.lineItems.map((li, k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#e0d8c8" }}>
                  <span>{li.label}</span><span style={{ color: GOLD }}>{usd(li.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(res.assumptions) && res.assumptions.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#c9b48a", fontSize: 12.5, lineHeight: 1.6 }}>
              {res.assumptions.map((a, k) => <li key={k}>{a}</li>)}
            </ul>
          )}
          <p style={{ ...st.note, marginTop: 12 }}>
            {res.disclaimer || "Non-binding estimate. Book a free consultation for exact numbers."}
          </p>
          <a href="/contact" onClick={(e) => { e.preventDefault(); navigate("contact"); }} data-analytics="book_consultation" style={{ ...st.btn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
            Book my free consultation →
          </a>
        </div>
      )}
    </div>
  );
}

const INTAKE_FIELDS = [
  { key: "name", label: "Full name", placeholder: "e.g. John Smith" },
  { key: "phone", label: "Phone", placeholder: "(650) 555-1234" },
  { key: "email", label: "Email", placeholder: "you@email.com" },
  { key: "address", label: "Project address", placeholder: "Street, city" },
  { key: "scope", label: "Project scope", placeholder: "e.g. kitchen, bathroom, ADU, addition…" },
];

function ChatTab() {
  const [phase, setPhase] = useState("form"); // form | chat
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", scope: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const intakeRef = useRef(null);

  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const scroller = useRef(null);

  const setField = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: false }));
  };

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, loading]);

  const startChat = async () => {
    if (submitting) return;
    const errs = {};
    INTAKE_FIELDS.forEach((f) => { if (!form[f.key].trim()) errs[f.key] = true; });
    setErrors(errs);
    if (Object.keys(errs).length) return; // no blanks — can't run a proper intake

    setSubmitting(true);
    // Save the lead + alert the team immediately, so nothing is lost.
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name, phone: form.phone, email: form.email,
          address: form.address, projectType: form.scope, notes: form.scope,
          source: "Website chat",
        }),
      });
      // GA4 conversion: chat intake lead (no-op until Measurement ID is set).
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { event_category: "engagement", event_label: "Website chat" });
      }
    } catch (_) { /* non-blocking — still proceed to chat */ }

    // Keep the collected details as hidden context for the AI.
    intakeRef.current = `[Intake already completed and saved — Name: ${form.name}; Phone: ${form.phone}; Email: ${form.email}; Address: ${form.address}; Project: ${form.scope}. Do not ask for these again and do not call submit_lead again unless something changes. Just help with the project.]`;
    const first = form.name.trim().split(/\s+/)[0];
    setMsgs([{ role: "assistant", content: `Perfect, ${first}! I've got your details — the JR team has everything and will reach out shortly. In the meantime, I can help with your ${form.scope} project. What would you like to know?` }]);
    setPhase("chat");
    setSubmitting(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setLoading(true); setErr(null);
    try {
      const convo = [{ role: "user", content: intakeRef.current || "" }, ...next];
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: convo }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data.error || "error"); return; }
      setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setErr("network");
    } finally {
      setLoading(false);
    }
  };

  if (err) return <Fallback err={err} />;

  // ---- Phase 1: intake form ----
  if (phase === "form") {
    const missing = Object.values(errors).some(Boolean);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          <p style={{ ...st.note, marginTop: 0, marginBottom: 16, color: "#e7dcc4" }}>
            Welcome to JR Design Build. So we can help you properly, I just need a few details first —
            that way the JR team has your contact even if the connection drops. Then we'll continue in chat.
          </p>
          {INTAKE_FIELDS.map((f) => (
            <div key={f.key}>
              <span style={st.label}>{f.label}</span>
              <input
                style={{ ...st.input, marginBottom: errors[f.key] ? 4 : 12, borderColor: errors[f.key] ? "#cf6a5a" : "#ffffff22" }}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={setField(f.key)}
                onKeyDown={(e) => { if (e.key === "Enter" && f.key === "scope") startChat(); }}
              />
              {errors[f.key] && <div style={{ color: "#cf8a5a", fontSize: 11.5, marginBottom: 12 }}>Please fill in this field to continue.</div>}
            </div>
          ))}
          {missing && (
            <div style={{ color: "#cf8a5a", fontSize: 12.5, marginBottom: 10 }}>
              We need all the details to help you properly.
            </div>
          )}
        </div>
        <button
          style={{ ...st.btn, opacity: submitting ? 0.6 : 1 }}
          disabled={submitting}
          onClick={startChat}
        >
          {submitting ? "Sending…" : "Start →"}
        </button>
      </div>
    );
  }

  // ---- Phase 2: chat ----
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={scroller} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingBottom: 10 }}>
        {msgs.map((m, k) => (
          <div key={k} style={m.role === "user" ? st.msgUser : st.msgBot}>{m.content}</div>
        ))}
        {loading && <div style={st.msgBot}>…</div>}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid #ffffff12" }}>
        <input
          style={{ ...st.input, marginBottom: 0 }}
          placeholder="Ask about your project…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button style={{ ...st.btn, width: "auto", padding: "0 16px" }} onClick={send}>→</button>
      </div>
    </div>
  );
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [prefill, setPrefill] = useState({});

  useEffect(() => {
    const onEvt = (e) => {
      const d = (e && e.detail) || {};
      setPrefill(d);
      setTab(d.tab === "estimate" ? "estimate" : "chat");
      setOpen(true);
    };
    window.addEventListener("jr:ai", onEvt);
    return () => window.removeEventListener("jr:ai", onEvt);
  }, []);

  if (!open) {
    return (
      <button style={st.fab} onClick={() => setOpen(true)} aria-label="Open AI assistant" data-analytics="talk_with_jr">
        <span style={{ fontSize: 15 }}>✨</span> Talk with JR
      </button>
    );
  }

  return (
    <div style={st.panel} role="dialog" aria-label="JR Design Build AI assistant">
      <div style={st.head}>
        <div style={st.tabs}>
          <button style={st.tab(tab === "chat")} onClick={() => setTab("chat")}>Talk with JR</button>
          <button style={st.tab(tab === "estimate")} onClick={() => setTab("estimate")}>Preliminary estimate</button>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <div style={{ ...st.body, display: tab === "chat" ? "flex" : "block", flexDirection: "column" }}>
        {tab === "estimate" ? <EstimateTab prefill={prefill} /> : <ChatTab />}
      </div>
    </div>
  );
}
