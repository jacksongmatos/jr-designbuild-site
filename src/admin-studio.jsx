import React, { useEffect, useState } from "react";

/*
 * Admin (JR team) — /admin-studio. Approve/reject pending suppliers and items,
 * and review Studio leads. Gated by a shared key (STUDIO_ADMIN_KEY) exchanged
 * for a signed admin cookie. The ERP remains the source of truth for leads;
 * this is the minimal approval surface.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";
const api = (path, opts) => fetch(`/api/studio/${path}`, opts).then((r) => r.json());

export default function AdminStudio() {
  const [authed, setAuthed] = useState(null); // null=checking
  const [data, setData] = useState({ suppliers: [], items: [], leads: [] });

  const load = async () => {
    const d = await api("admin/queue").catch(() => ({}));
    if (d.ok) { setData(d); setAuthed(true); } else { setAuthed(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (kind, id, status) => {
    await api("admin/decide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, status }) }).catch(() => {});
    load();
  };
  const logout = async () => { await api("admin/logout", { method: "POST" }); setAuthed(false); };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.eyebrow}>STUDIO ADMIN</div>
        <h1 style={s.h1}>Approvals &amp; leads</h1>

        {authed === null ? <div style={s.muted}>Loading…</div>
          : !authed ? <Login onIn={load} />
          : (
            <>
              <div style={s.headerRow}><span style={s.muted}>JR team</span><button style={s.ghost} onClick={logout}>Sign out</button></div>

              <Section title={`Pending suppliers (${data.suppliers.length})`}>
                {data.suppliers.length === 0 && <p style={s.muted}>Nothing waiting.</p>}
                {data.suppliers.map((sp) => (
                  <div key={sp.id} style={s.row}>
                    <div style={{ flex: 1 }}>
                      <div style={s.name}>{sp.company_name}</div>
                      <div style={s.muted}>{[sp.contact_name, sp.email, sp.phone].filter(Boolean).join(" · ")}</div>
                    </div>
                    <button style={s.approve} onClick={() => decide("supplier", sp.id, "approved")}>Approve</button>
                    <button style={s.reject} onClick={() => decide("supplier", sp.id, "rejected")}>Reject</button>
                  </div>
                ))}
              </Section>

              <Section title={`Pending items (${data.items.length})`}>
                {data.items.length === 0 && <p style={s.muted}>Nothing waiting.</p>}
                {data.items.map((it) => (
                  <div key={it.id} style={s.row}>
                    <span style={{ ...s.swatch, background: it.swatch_color || "#777", ...(it.image_url ? { backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }} />
                    <div style={{ flex: 1 }}>
                      <div style={s.name}>{it.name} {it.category && <span style={s.tag}>{it.category}</span>}</div>
                      <div style={s.muted}>{[it.supplier, it.price_note, it.description].filter(Boolean).join(" · ")}</div>
                    </div>
                    <button style={s.approve} onClick={() => decide("item", it.id, "approved")}>Approve</button>
                    <button style={s.reject} onClick={() => decide("item", it.id, "rejected")}>Reject</button>
                  </div>
                ))}
              </Section>

              <Section title={`Recent leads (${data.leads.length})`}>
                {data.leads.length === 0 && <p style={s.muted}>No leads yet.</p>}
                {data.leads.map((l) => (
                  <div key={l.id} style={s.row}>
                    <div style={{ flex: 1 }}>
                      <div style={s.name}>{l.client_name || "—"} <span style={s.muted}>{new Date(l.created_at).toLocaleDateString()}</span></div>
                      <div style={s.muted}>{[l.client_email, l.client_phone].filter(Boolean).join(" · ")}</div>
                      {l.summary_json?.items?.length > 0 && (
                        <div style={s.chips}>{l.summary_json.items.map((i, idx) => <span key={idx} style={s.chip}>{i.name}{i.supplier ? ` · ${i.supplier}` : ""}</span>)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </Section>
            </>
          )}
      </div>
    </div>
  );
}

function Login({ onIn }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    setBusy(true); setErr(null);
    const d = await api("admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) }).catch(() => ({}));
    setBusy(false);
    if (d.ok) onIn(); else setErr(d.error === "admin_not_configured" ? "Set STUDIO_ADMIN_KEY on the server first." : "Invalid key.");
  };
  return (
    <div style={s.card}>
      <div style={s.cardHead}>Team access</div>
      <input style={s.input} type="password" placeholder="Admin key" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <button style={{ ...s.cta, opacity: key && !busy ? 1 : 0.5 }} disabled={!key || busy} onClick={go}>{busy ? "Checking…" : "Enter"}</button>
      {err && <div style={{ ...s.muted, color: "#cf6a5a", marginTop: 8 }}>{err}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={s.cardHead}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{children}</div>
    </div>
  );
}

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 6vw 110px" },
  wrap: { maxWidth: 820, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(30px,4.6vw,52px)", color: "#fff", margin: "12px 0 10px", fontWeight: 500, letterSpacing: -1 },
  muted: { color: "#9c927f", fontSize: 12.5, lineHeight: 1.5 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },

  card: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 12, padding: "22px 20px", marginTop: 16, maxWidth: 420 },
  cardHead: { fontFamily: DISPLAY, fontSize: 21, color: "#fff" },
  input: { width: "100%", background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", marginTop: 10 },
  cta: { width: "100%", marginTop: 12, background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "13px", fontSize: 12, letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  ghost: { background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e88", borderRadius: 4, padding: "8px 14px", fontSize: 11, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" },

  row: { display: "flex", alignItems: "center", gap: 12, background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 10, padding: "12px 14px" },
  name: { color: "#fff", fontSize: 14.5, fontWeight: 600 },
  tag: { fontSize: 10, color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "1px 7px", marginLeft: 6, verticalAlign: "middle" },
  swatch: { width: 40, height: 40, borderRadius: 6, border: "1px solid #00000044", flexShrink: 0 },
  approve: { background: "#86b06a", color: INK, border: "none", borderRadius: 5, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  reject: { background: "transparent", color: "#cf6a5a", border: "1px solid #cf6a5a66", borderRadius: 5, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  chips: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 },
  chip: { fontSize: 10.5, color: "#efe8da", background: "#ffffff0c", border: "1px solid #ffffff1c", borderRadius: 12, padding: "2px 8px" },
};
