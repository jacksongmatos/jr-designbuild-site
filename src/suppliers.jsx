import React, { useEffect, useState } from "react";

/*
 * Supplier Portal (/suppliers). Magic-link OTP login (Worker-mediated; the
 * browser never holds Supabase tokens). After login: complete a company
 * profile → wait for JR approval → upload catalog items (each lands 'pending'
 * for JR review, then shows up in the client Studio once approved).
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";

const api = (path, opts) => fetch(`/api/studio/${path}`, opts).then((r) => r.json());

const STATUS_LABEL = {
  pending: "Pending review", approved: "Approved", rejected: "Rejected", suspended: "Suspended",
};
const STATUS_COLOR = {
  pending: "#cf9a5a", approved: "#86b06a", rejected: "#cf6a5a", suspended: "#9c927f",
};

export default function SuppliersPortal() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);

  const refresh = async () => {
    const me = await api("supplier/me").catch(() => ({}));
    setAuth(!!me.authenticated);
    setSupplier(me.supplier || null);
    setItems(me.items || []);
    setLoading(false);
  };
  useEffect(() => {
    refresh();
    api("catalog").then((d) => d.ok && setCats((d.categories || []).map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, []);

  const logout = async () => { await api("supplier/logout", { method: "POST" }); setAuth(false); setSupplier(null); setItems([]); };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.eyebrow}>SUPPLIER PORTAL</div>
        <h1 style={s.h1}>Put your products in front of buyers.</h1>
        <p style={s.lead}>
          List your finishes in the JR Design Build Studio — homeowners apply them to their
          own photos right at the moment they're choosing. Free to join; JR reviews each item.
        </p>

        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : !auth ? (
          <AuthFlow onAuthed={refresh} />
        ) : !supplier ? (
          <ProfileForm onSaved={refresh} onLogout={logout} />
        ) : (
          <Dashboard supplier={supplier} items={items} cats={cats} onChanged={refresh} onLogout={logout} />
        )}
      </div>
    </div>
  );
}

function AuthFlow({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("email");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!email) return;
    setBusy(true); setMsg(null);
    const d = await api("supplier/auth-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => ({}));
    setBusy(false);
    if (d.ok && d.sent) { setStage("code"); setMsg("We emailed you a 6-digit code."); }
    else if (d.ok && !d.sent) setMsg("Email isn't configured on the server yet — ask JR to enable Supabase SMTP.");
    else setMsg("Couldn't send the code. Check the email and try again.");
  };
  const verify = async () => {
    if (!code) return;
    setBusy(true); setMsg(null);
    const d = await api("supplier/auth-verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) }).catch(() => ({}));
    setBusy(false);
    if (d.ok) onAuthed();
    else setMsg("That code didn't work. Request a new one.");
  };

  return (
    <div style={s.card}>
      {stage === "email" ? (
        <>
          <div style={s.cardHead}>Sign in / Join</div>
          <p style={s.muted}>Enter your email — we'll send a one-time code. No password.</p>
          <input style={s.input} placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <button style={{ ...s.cta, opacity: email && !busy ? 1 : 0.5 }} disabled={!email || busy} onClick={sendCode}>{busy ? "Sending…" : "Send code"}</button>
        </>
      ) : (
        <>
          <div style={s.cardHead}>Enter your code</div>
          <p style={s.muted}>Sent to {email}.</p>
          <input style={s.input} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          <button style={{ ...s.cta, opacity: code && !busy ? 1 : 0.5 }} disabled={!code || busy} onClick={verify}>{busy ? "Verifying…" : "Verify & continue"}</button>
          <button style={s.linkBtn} onClick={() => { setStage("email"); setMsg(null); }}>← Use a different email</button>
        </>
      )}
      {msg && <div style={{ ...s.muted, color: GOLD, marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

function ProfileForm({ onSaved, onLogout }) {
  const [f, setF] = useState({ company_name: "", contact_name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.company_name) return;
    setBusy(true);
    await api("supplier/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => {});
    setBusy(false); onSaved();
  };
  return (
    <div style={s.card}>
      <div style={s.cardHead}>Tell us about your company</div>
      <p style={s.muted}>JR reviews new suppliers before items go live.</p>
      <input style={s.input} placeholder="Company name *" value={f.company_name} onChange={set("company_name")} />
      <input style={s.input} placeholder="Contact name" value={f.contact_name} onChange={set("contact_name")} />
      <input style={s.input} placeholder="Email" value={f.email} onChange={set("email")} />
      <input style={s.input} placeholder="Phone" value={f.phone} onChange={set("phone")} />
      <button style={{ ...s.cta, opacity: f.company_name && !busy ? 1 : 0.5 }} disabled={!f.company_name || busy} onClick={save}>{busy ? "Saving…" : "Submit for approval"}</button>
      <button style={s.linkBtn} onClick={onLogout}>Sign out</button>
    </div>
  );
}

function Dashboard({ supplier, items, cats, onChanged, onLogout }) {
  const approved = supplier.status === "approved";
  return (
    <div>
      <div style={s.headerRow}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, color: "#fff" }}>{supplier.company_name}</div>
          <span style={{ ...s.badge, background: STATUS_COLOR[supplier.status] + "22", color: STATUS_COLOR[supplier.status], border: `1px solid ${STATUS_COLOR[supplier.status]}55` }}>{STATUS_LABEL[supplier.status]}</span>
        </div>
        <button style={s.ghost} onClick={onLogout}>Sign out</button>
      </div>

      {!approved && (
        <div style={{ ...s.card, borderColor: "#cf9a5a55" }}>
          <div style={s.cardHead}>Awaiting JR approval</div>
          <p style={s.muted}>Once JR approves your company, you'll be able to add items here. We'll keep this page ready.</p>
        </div>
      )}

      {approved && <AddItem cats={cats} onAdded={onChanged} />}

      <div style={{ marginTop: 22 }}>
        <div style={s.cardHead}>Your items ({items.length})</div>
        {items.length === 0 && <p style={s.muted}>No items yet.</p>}
        <div style={s.itemList}>
          {items.map((it) => (
            <div key={it.id} style={s.itemRow}>
              <span style={{ ...s.swatch, background: it.swatch_color || "#777", ...(it.image_path ? {} : {}) }} />
              <span style={{ flex: 1 }}>
                <span style={{ color: "#efe8da", fontSize: 14, fontWeight: 600 }}>{it.name}</span>
                {it.price_note && <span style={s.muted}> · {it.price_note}</span>}
              </span>
              <span style={{ ...s.badge, background: STATUS_COLOR[it.status] + "22", color: STATUS_COLOR[it.status], border: `1px solid ${STATUS_COLOR[it.status]}55` }}>{STATUS_LABEL[it.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddItem({ cats, onAdded }) {
  const [f, setF] = useState({ name: "", category_id: "", description: "", price_note: "", swatch_color: "#cccccc" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.name || !f.category_id) { setMsg("Name and category are required."); return; }
    setBusy(true); setMsg(null);
    let image_path = null;
    if (file) {
      const fd = new FormData(); fd.append("file", file);
      const up = await api("supplier/item-image", { method: "POST", body: fd }).catch(() => ({}));
      image_path = up.path || null;
    }
    const d = await api("supplier/item", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, image_path }) }).catch(() => ({}));
    setBusy(false);
    if (d.ok) { setF({ name: "", category_id: "", description: "", price_note: "", swatch_color: "#cccccc" }); setFile(null); setMsg("Submitted — pending JR review."); onAdded(); }
    else setMsg("Couldn't save. Try again.");
  };

  return (
    <div style={s.card}>
      <div style={s.cardHead}>Add an item</div>
      <input style={s.input} placeholder="Item name *" value={f.name} onChange={set("name")} />
      <select style={s.input} value={f.category_id} onChange={set("category_id")}>
        <option value="">Category *</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input style={s.input} placeholder="Description" value={f.description} onChange={set("description")} />
      <input style={s.input} placeholder="Price note (e.g. from $8/sqft)" value={f.price_note} onChange={set("price_note")} />
      <div style={s.rowField}>
        <label style={s.muted}>Swatch color
          <input type="color" value={f.swatch_color} onChange={set("swatch_color")} style={{ marginLeft: 8, verticalAlign: "middle" }} />
        </label>
        <label style={s.fileBtn}>{file ? file.name.slice(0, 18) : "Upload photo"}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
        </label>
      </div>
      <button style={{ ...s.cta, opacity: !busy ? 1 : 0.5 }} disabled={busy} onClick={submit}>{busy ? "Saving…" : "Submit item"}</button>
      {msg && <div style={{ ...s.muted, color: GOLD, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 6vw 110px" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(30px,4.6vw,52px)", color: "#fff", margin: "12px 0 10px", fontWeight: 500, letterSpacing: -1 },
  lead: { color: "#efe8da", fontSize: 16, lineHeight: 1.7, marginBottom: 26 },
  muted: { color: "#9c927f", fontSize: 12.5, lineHeight: 1.5 },

  card: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 12, padding: "22px 20px", marginTop: 16 },
  cardHead: { fontFamily: DISPLAY, fontSize: 21, color: "#fff", marginBottom: 6 },
  input: { width: "100%", background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", marginTop: 10 },
  cta: { width: "100%", marginTop: 14, background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "14px", fontSize: 12, letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  ghost: { background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e88", borderRadius: 4, padding: "9px 16px", fontSize: 11, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" },
  linkBtn: { display: "block", background: "none", border: "none", color: "#b8ad97", fontSize: 12.5, cursor: "pointer", fontWeight: 600, marginTop: 12 },

  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 8 },
  badge: { display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: "3px 10px", borderRadius: 20 },
  rowField: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" },
  fileBtn: { background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "9px 14px", color: "#efe8da", fontSize: 12.5, cursor: "pointer", fontWeight: 600 },

  itemList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  itemRow: { display: "flex", alignItems: "center", gap: 10, background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 8, padding: "9px 12px" },
  swatch: { width: 22, height: 22, borderRadius: 4, border: "1px solid #00000044", flexShrink: 0 },
};
