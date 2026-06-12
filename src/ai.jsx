import React, { useEffect, useRef, useState } from "react";

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
const CITIES = [
  "South San Francisco", "San Mateo", "Daly City", "San Bruno", "Pacifica",
  "Burlingame", "Millbrae", "Redwood City", "San Francisco",
];
const TYPES = ["ADU", "Kitchen", "Bathroom", "Addition", "Whole-Home Remodel"];
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
          ? "O assistente de IA ainda não foi ativado (falta a chave da API)."
          : "O assistente de IA está indisponível no momento."}{" "}
        Enquanto isso, use o estimador instantâneo ou agende sua consulta gratuita.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <a href="#/tools" style={st.ghost}>Instant tools</a>
        <a href="#/contact" style={{ ...st.ghost, background: GOLD, color: INK, border: "none" }}>
          Book a consult
        </a>
      </div>
    </div>
  );
}

function EstimateTab({ prefill }) {
  const [type, setType] = useState(prefill.projectType || "ADU");
  const [finish, setFinish] = useState(prefill.finish ? cap(prefill.finish) : "Premium");
  const [city, setCity] = useState(prefill.city || CITIES[0]);
  const [size, setSize] = useState(prefill.size || 600);
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
        Add a few photos of the space — our AI reads scope & condition and returns a Bay Area range.
      </p>
      <span style={st.label}>Project</span>
      <select style={st.input} value={type} onChange={(e) => setType(e.target.value)}>
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
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <span style={st.label}>Approx. size — {size} sqft</span>
      <input type="range" min={30} max={4000} value={size}
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
        {loading ? "Analyzing…" : "Get AI estimate ✨"}
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
          <a href="#/contact" style={{ ...st.btn, display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
            Book my free consultation →
          </a>
        </div>
      )}
    </div>
  );
}

function ChatTab() {
  const [msgs, setMsgs] = useState([
    { role: "assistant", content: "Hi! To get started, I just need four quick things: your full name, phone number, the project address, and what you'd like to do (e.g. kitchen, bathroom, ADU). That way the JR team has your details even if the connection drops — then I'm all yours." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
  const [tab, setTab] = useState("estimate");
  const [prefill, setPrefill] = useState({});

  useEffect(() => {
    const onEvt = (e) => {
      const d = (e && e.detail) || {};
      setPrefill(d);
      setTab(d.tab === "chat" ? "chat" : "estimate");
      setOpen(true);
    };
    window.addEventListener("jr:ai", onEvt);
    return () => window.removeEventListener("jr:ai", onEvt);
  }, []);

  if (!open) {
    return (
      <button style={st.fab} onClick={() => setOpen(true)} aria-label="Open AI assistant">
        <span style={{ fontSize: 15 }}>✨</span> Instant estimate
      </button>
    );
  }

  return (
    <div style={st.panel} role="dialog" aria-label="JR Design Build AI assistant">
      <div style={st.head}>
        <div style={st.tabs}>
          <button style={st.tab(tab === "estimate")} onClick={() => setTab("estimate")}>Estimate</button>
          <button style={st.tab(tab === "chat")} onClick={() => setTab("chat")}>Ask JR</button>
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
