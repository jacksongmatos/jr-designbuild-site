import React, { useEffect, useMemo, useRef, useState } from "react";
import PlannerModal from "./PlannerModal";

/*
 * Studio (client) — upload a photo of your space, mark a region, apply a
 * JR/supplier finish over it, then "Request quote" → creates a lead the ERP
 * consumes (POST /api/studio/submit).
 *
 * The "apply a material to a region" step is isolated behind a RenderEngine
 * interface so a generative AIEngine can replace Overlay2DEngine in Phase 2
 * without touching the Studio:
 *
 *   RenderEngine.apply({ region, item, opacity, blend }) -> RenderedLayer
 *
 * region coords are normalized 0..1 (resolution-independent). The Overlay2D
 * engine paints the region with the item's swatch color or tiled texture using
 * a CSS blend mode, so the photo's lighting shows through.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";

/* ----------------------------------------------------------------------------
 * RenderEngine — Phase 1 implementation (Overlay 2D). AIEngine plugs in later.
 * ------------------------------------------------------------------------- */
const Overlay2DEngine = {
  id: "overlay-2d",
  async apply({ region, item, opacity = 1, blend = "multiply" }) {
    return {
      kind: "overlay",
      region,
      opacity,
      blend,
      fill: item?.swatch_color || null,
      texture: item?.texture_url || item?.image_url || null,
    };
  },
};
// Phase 2 hook: register an AIEngine here and switch ENGINE — no Studio changes.
const ENGINE = Overlay2DEngine;

// Fallback finishes so the Studio is never blank when the catalog API has no
// data yet. Replaced by live data from /api/studio/catalog when available.
const DEFAULT_CATALOG = [
  { name: "Wall Paint", slug: "paint", items: [
    { id: "p-agreeable", name: "Agreeable Gray", swatch_color: "#d8d2c6", supplier: "Sherwin-Williams" },
    { id: "p-pure-white", name: "Pure White", swatch_color: "#eef0ea", supplier: "Sherwin-Williams" },
    { id: "p-naval", name: "Naval", swatch_color: "#2b3a4a", supplier: "Sherwin-Williams" },
    { id: "p-urbane", name: "Urbane Bronze", swatch_color: "#54504a", supplier: "Sherwin-Williams" },
  ] },
  { name: "Tile & Stone", slug: "tile", items: [
    { id: "t-carrara", name: "Carrara Marble", swatch_color: "#e9e9e6", supplier: "Daltile" },
    { id: "t-travertine", name: "Travertine", swatch_color: "#cbb79c", supplier: "Daltile" },
    { id: "t-slate", name: "Slate Charcoal", swatch_color: "#3a3d40", supplier: "Daltile" },
  ] },
  { name: "Countertops", slug: "counter", items: [
    { id: "c-quartz", name: "White Quartz", swatch_color: "#ecebe7", supplier: "KZ Kitchen & Bath" },
    { id: "c-galaxy", name: "Black Galaxy", swatch_color: "#1c1c1e", supplier: "KZ Kitchen & Bath" },
  ] },
  { name: "Flooring", slug: "floor", items: [
    { id: "f-white-oak", name: "White Oak", swatch_color: "#caa873", supplier: "Floor & Decor" },
    { id: "f-walnut", name: "Walnut", swatch_color: "#6b4a2f", supplier: "Floor & Decor" },
  ] },
];

const clipFor = (poly) => `polygon(${poly.map((p) => `${(p[0] * 100).toFixed(2)}% ${(p[1] * 100).toFixed(2)}%`).join(",")})`;

function LayerView({ layer }) {
  const base = { position: "absolute", inset: 0, clipPath: clipFor(layer.region.poly), mixBlendMode: layer.blend, opacity: layer.opacity, pointerEvents: "none" };
  if (layer.texture) {
    return <div style={{ ...base, backgroundImage: `url(${layer.texture})`, backgroundSize: "22%", backgroundRepeat: "repeat" }} />;
  }
  return <div style={{ ...base, background: layer.fill || "#888" }} />;
}

/* ----------------------------------------------------------------------------
 * Studio
 * ------------------------------------------------------------------------- */
export default function StudioApp({ go }) {
  const [img, setImg] = useState(null);          // { url, path, uploading }
  const [catalog, setCatalog] = useState([]);    // [{id,name,slug,items:[...]}]
  const [apps, setApps] = useState([]);          // [{id, item, region, opacity, blend, layer}]
  const [draw, setDraw] = useState(null);        // { item, points:[[x,y]...] }
  const [openCat, setOpenCat] = useState(null);
  const [modal, setModal] = useState(false);
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const applyCatalog = (cats) => { setCatalog(cats); setOpenCat(cats[0]?.slug || null); };
    fetch("/api/studio/catalog").then((r) => r.json()).then((d) => {
      const cats = d && d.ok && Array.isArray(d.categories) && d.categories.length ? d.categories : DEFAULT_CATALOG;
      applyCatalog(cats);
    }).catch(() => applyCatalog(DEFAULT_CATALOG));
  }, []);

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setImg({ url, path: null, uploading: true });
    setApps([]); setDraw(null);
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await fetch("/api/studio/upload", { method: "POST", body: fd });
      const d = await r.json();
      setImg((p) => ({ ...p, path: d.path || null, uploading: false }));
    } catch { setImg((p) => ({ ...p, uploading: false })); }
  };

  const onCanvasClick = (e) => {
    if (!img || !draw) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setDraw((d) => ({ ...d, points: [...d.points, [x, y]] }));
  };

  const startPlacing = (item) => setDraw({ item, points: [] });

  const finishArea = async () => {
    if (!draw || draw.points.length < 3) return;
    const region = { poly: draw.points };
    const layer = await ENGINE.apply({ region, item: draw.item, opacity: 1, blend: "multiply" });
    setApps((a) => [...a, { id: crypto.randomUUID(), item: draw.item, region, opacity: 1, blend: "multiply", visible: true, layer }]);
    setDraw(null);
  };

  const removeApp = (id) => setApps((a) => a.filter((x) => x.id !== id));
  const toggleApp = (id) => setApps((a) => a.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)));

  const canSubmit = img && apps.length > 0;

  const submit = async (contact) => {
    setBusy(true);
    const payload = {
      project: {
        client_name: contact.name || null,
        client_email: contact.email || null,
        client_phone: contact.phone || null,
        title: contact.title || null,
        base_image_path: img?.path || null,
      },
      applications: apps.map((a) => ({
        catalog_item_id: a.item?.id || null,
        region_json: a.region,
        opacity: a.opacity,
        blend_mode: a.blend,
      })),
    };
    try {
      const r = await fetch("/api/studio/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      setSent(d.ok ? (d.stored ? "stored" : "preview") : "error");
    } catch { setSent("error"); }
    setBusy(false); setModal(false);
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.eyebrow}>STUDIO</div>
        <h1 style={s.h1}>Design your space on your own photo.</h1>
        <p style={s.lead}>
          Upload a photo of your room, outline a surface, and drop JR &amp; partner finishes
          right onto it. Love a combination? Request a quote and our team prices it for you.
        </p>

        {/* Floor Planner — opens the 3D planner modal. Lives here under the
            Studio intro (instead of in the top nav). */}
        <div style={{ marginTop: 18 }}>
          <PlannerModal
            go={go}
            label="Floor Planner"
            subtext="Draw your layout in 3D, then request an estimate"
          />
        </div>

        <div style={s.layout}>
          {/* canvas */}
          <div style={{ minWidth: 0 }}>
            <div ref={boxRef} onClick={onCanvasClick} style={{ ...s.canvas, cursor: draw ? "crosshair" : "default" }}>
              {!img && (
                <button style={s.dropzone} onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize: 34, color: GOLD }}>⌕</div>
                  <div style={{ fontWeight: 700, color: "#fff", marginTop: 8 }}>Upload a photo of your space</div>
                  <div style={s.muted}>JPG / PNG / WEBP · up to 12 MB</div>
                </button>
              )}
              {img && <img src={img.url} alt="Your space" style={{ width: "100%", display: "block" }} />}
              {img && apps.map((a) => (a.visible ? <LayerView key={a.id} layer={a.layer} /> : null))}
              {draw && draw.points.length > 0 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <polygon points={draw.points.map((p) => `${p[0] * 100},${p[1] * 100}`).join(" ")} fill={GOLD} fillOpacity="0.2" stroke={GOLD} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                  {draw.points.map((p, i) => <circle key={i} cx={p[0] * 100} cy={p[1] * 100} r="0.7" fill="#fff" stroke={GOLD} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
                </svg>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

            {/* action bar */}
            <div style={s.bar}>
              {img && <button style={s.ghost} onClick={() => fileRef.current?.click()}>Change photo</button>}
              {img?.uploading && <span style={s.muted}>Saving photo…</span>}
              {draw && (
                <>
                  <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>Outlining: {draw.item.name} — click the corners</span>
                  <button style={s.smallBtn} onClick={() => setDraw((d) => ({ ...d, points: d.points.slice(0, -1) }))}>Undo</button>
                  <button style={{ ...s.cta, padding: "9px 16px", opacity: draw.points.length >= 3 ? 1 : 0.5 }} onClick={finishArea} disabled={draw.points.length < 3}>Apply finish</button>
                  <button style={s.smallBtn} onClick={() => setDraw(null)}>Cancel</button>
                </>
              )}
            </div>

            {/* applications list */}
            {apps.length > 0 && (
              <div style={s.appList}>
                {apps.map((a) => (
                  <div key={a.id} style={s.appRow}>
                    <span style={{ ...s.swatchDot, background: a.item?.swatch_color || (a.item?.image_url ? `center/cover url(${a.item.image_url})` : "#888") }} />
                    <span style={{ flex: 1, color: "#efe8da", fontSize: 13 }}>{a.item?.name}{a.item?.supplier ? <span style={s.muted}> · {a.item.supplier}</span> : null}</span>
                    <button style={s.linkBtn} onClick={() => toggleApp(a.id)}>{a.visible ? "Hide" : "Show"}</button>
                    <button style={s.linkBtn} onClick={() => removeApp(a.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* catalog panel */}
          <div style={s.panel}>
            <div style={s.panelHead}>Finishes</div>
            <p style={s.muted}>{img ? "Pick a finish, then outline where it goes." : "Upload a photo to start."}</p>
            <div style={s.catScroll}>
              {catalog.map((c) => (
                <div key={c.slug} style={s.catBlock}>
                  <button style={s.catHead} onClick={() => setOpenCat(openCat === c.slug ? null : c.slug)}>
                    <span>{c.name}</span><span style={{ color: GOLD }}>{c.items.length || ""} {openCat === c.slug ? "▾" : "▸"}</span>
                  </button>
                  {openCat === c.slug && (
                    <div style={s.itemGrid}>
                      {c.items.length === 0 && <div style={{ ...s.muted, gridColumn: "1/-1", padding: "4px 2px" }}>No items yet.</div>}
                      {c.items.map((it) => {
                        const placing = draw?.item?.id === it.id;
                        return (
                          <button key={it.id} onClick={() => startPlacing(it)} disabled={!img} title={it.price_note || ""}
                            style={{ ...s.item, ...(placing ? s.itemOn : {}), opacity: img ? 1 : 0.5 }}>
                            <span style={{ ...s.itemChip, background: it.swatch_color || "#777", ...(it.image_url ? { backgroundImage: `url(${it.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }} />
                            <span style={s.itemName}>{it.name}</span>
                            {it.supplier && <span style={s.itemSup}>{it.supplier}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button style={{ ...s.cta, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit} onClick={() => setModal(true)}>Request quote with this look →</button>
            {!canSubmit && <div style={s.muted}>Apply at least one finish to request a quote.</div>}
          </div>
        </div>
      </div>

      {modal && <QuoteModal busy={busy} onClose={() => setModal(false)} onSubmit={submit} hasPath={!!img?.path} />}
      {sent && <Toast kind={sent} onClose={() => setSent(null)} />}
    </div>
  );
}

function QuoteModal({ onClose, onSubmit, busy, hasPath }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", title: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.email || f.phone;
  return (
    <div style={s.modalWrap} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.panelHead}>Request your quote</div>
        <p style={s.muted}>We'll price your exact combination and get back to you.</p>
        <input style={s.input} placeholder="Your name" value={f.name} onChange={set("name")} />
        <input style={s.input} placeholder="Email" value={f.email} onChange={set("email")} />
        <input style={s.input} placeholder="Phone" value={f.phone} onChange={set("phone")} />
        <input style={s.input} placeholder="Project title (optional)" value={f.title} onChange={set("title")} />
        {!hasPath && <div style={{ ...s.muted, color: "#cf8a5a" }}>Note: photo storage isn't configured yet — your request still reaches us, the photo just won't attach.</div>}
        <button style={{ ...s.cta, marginTop: 12, opacity: ok && !busy ? 1 : 0.5 }} disabled={!ok || busy} onClick={() => onSubmit(f)}>{busy ? "Sending…" : "Send request"}</button>
        <button style={{ ...s.ghost, width: "100%", marginTop: 8 }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function Toast({ kind, onClose }) {
  const msg = kind === "stored" ? "Sent! Your combination is with our team — we'll be in touch."
    : kind === "preview" ? "Sent! (Preview mode — connect Supabase to capture this as a lead.)"
    : "Something went wrong. Please try again or use the contact form.";
  return (
    <div style={s.modalWrap} onClick={onClose}>
      <div style={{ ...s.modal, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 30, color: GOLD }}>{kind === "error" ? "⚠" : "✓"}</div>
        <p style={{ color: "#efe8da", fontSize: 15, lineHeight: 1.6, margin: "10px 0 16px" }}>{msg}</p>
        <button style={s.cta} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 5vw 110px" },
  wrap: { maxWidth: 1240, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(30px,4.8vw,58px)", color: "#fff", margin: "12px 0 10px", fontWeight: 500, letterSpacing: -1 },
  lead: { color: "#efe8da", fontSize: 16, lineHeight: 1.7, maxWidth: 720 },
  muted: { color: "#9c927f", fontSize: 12.5, lineHeight: 1.5 },

  layout: { display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(300px,1fr)", gap: 24, marginTop: 28, alignItems: "start" },
  canvas: { position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #c9a25e2e", background: INK, minHeight: 280, boxShadow: "0 30px 80px #000000aa" },
  dropzone: { width: "100%", minHeight: 340, display: "grid", placeContent: "center", textAlign: "center", background: "repeating-linear-gradient(135deg,#ffffff05 0 12px,transparent 12px 24px)", border: "none", cursor: "pointer" },

  bar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  appList: { marginTop: 14, display: "flex", flexDirection: "column", gap: 6 },
  appRow: { display: "flex", alignItems: "center", gap: 10, background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 8, padding: "8px 10px" },
  swatchDot: { width: 20, height: 20, borderRadius: 4, border: "1px solid #00000044", flexShrink: 0 },

  panel: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 12, padding: "18px 16px", position: "sticky", top: 96 },
  panelHead: { fontFamily: DISPLAY, fontSize: 22, color: "#fff", marginBottom: 6 },
  catScroll: { maxHeight: 420, overflowY: "auto", margin: "12px 0", paddingRight: 4 },
  catBlock: { borderTop: "1px solid #ffffff12" },
  catHead: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#efe8da", fontWeight: 600, fontSize: 14, padding: "11px 2px", cursor: "pointer" },
  itemGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))", gap: 8, paddingBottom: 10 },
  item: { display: "flex", flexDirection: "column", gap: 5, background: "#ffffff08", border: "1px solid #ffffff1a", borderRadius: 8, padding: 7, cursor: "pointer", textAlign: "left" },
  itemOn: { borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}` },
  itemChip: { display: "block", height: 38, borderRadius: 5, border: "1px solid #00000033" },
  itemName: { fontSize: 10.5, color: "#efe8da", fontWeight: 600, lineHeight: 1.2 },
  itemSup: { fontSize: 9.5, color: "#b8ad97" },

  cta: { width: "100%", marginTop: 8, background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "14px", fontSize: 12, letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  ghost: { background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e88", borderRadius: 4, padding: "9px 16px", fontSize: 11, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" },
  smallBtn: { background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 5, padding: "8px 12px", color: "#efe8da", fontSize: 12, cursor: "pointer", fontWeight: 600 },
  linkBtn: { background: "none", border: "none", color: "#b8ad97", fontSize: 12, cursor: "pointer", fontWeight: 600 },

  modalWrap: { position: "fixed", inset: 0, background: "#000000b0", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 },
  modal: { width: "min(440px,100%)", background: "#12100c", border: "1px solid #c9a25e33", borderRadius: 14, padding: 22, boxShadow: "0 40px 100px #000" },
  input: { width: "100%", background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", marginTop: 8 },
};
