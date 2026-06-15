import React, { useMemo, useRef, useState } from "react";
import { SW, CABINETS, COUNTERS, BACKSPLASH, FLOORS, LIBS, fillOf } from "./studio";

/*
 * Design Studio — region marker (authoring tool, hidden route /studio-editor).
 *
 * Load a photo, pick a surface, click its corners. Walls/ceiling/cabinets/
 * counter/backsplash are polygons (click as many corners as you like, in order
 * around the shape). The floor is exactly 4 corners (top-left, top-right,
 * bottom-right, bottom-left). When done, copy the generated room config into
 * ROOMS in src/studio.jsx and drop the photo in public/studio/<id>/base.jpg.
 *
 * Everything runs locally in the browser — the photo is never uploaded here.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";

const MARK = [
  { id: "ceiling", label: "Ceiling", lib: "SW", type: "tint", tint: "#7da0ff" },
  { id: "walls", label: "Walls", lib: "SW", type: "tint", tint: "#c9a25e" },
  { id: "cabinets", label: "Cabinets", lib: "CABINETS", type: "tint", tint: "#5ec98f" },
  { id: "counter", label: "Countertop", lib: "COUNTERS", type: "tint", tint: "#ff8f5e" },
  { id: "backsplash", label: "Backsplash", lib: "BACKSPLASH", type: "tint", tint: "#d65eff" },
  { id: "floor", label: "Flooring (4 corners)", lib: "FLOORS", type: "floor", tint: "#ffd65e" },
];

const round = (n) => Math.round(n * 10) / 10;

export default function StudioEditor() {
  const [img, setImg] = useState(null);
  const [pts, setPts] = useState(() => Object.fromEntries(MARK.map((m) => [m.id, []])));
  const [active, setActive] = useState("walls");
  const [preview, setPreview] = useState(true);
  const [meta, setMeta] = useState({ id: "kitchen-real", name: "My Kitchen" });
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  const region = MARK.find((m) => m.id === active);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImg(URL.createObjectURL(f));
    setPts(Object.fromEntries(MARK.map((m) => [m.id, []])));
  };

  const onClick = (e) => {
    if (!img) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = round(((e.clientX - r.left) / r.width) * 100);
    const y = round(((e.clientY - r.top) / r.height) * 100);
    setPts((p) => {
      const cur = p[active] || [];
      if (region.type === "floor" && cur.length >= 4) return { ...p, [active]: [...cur.slice(1), [x, y]] };
      return { ...p, [active]: [...cur, [x, y]] };
    });
  };

  const undo = () => setPts((p) => ({ ...p, [active]: (p[active] || []).slice(0, -1) }));
  const clear = () => setPts((p) => ({ ...p, [active]: [] }));

  const config = useMemo(() => {
    const regions = MARK.filter((m) => {
      const n = (pts[m.id] || []).length;
      return m.type === "floor" ? n === 4 : n >= 3;
    }).map((m) => {
      const coords = pts[m.id].map((p) => [p[0], p[1]]);
      return m.type === "floor"
        ? { id: m.id, label: m.label.replace(" (4 corners)", ""), lib: m.lib, type: "floor", quad: coords }
        : { id: m.id, label: m.label, lib: m.lib, type: "tint", poly: coords };
    });
    const defaults = {};
    for (const r of regions) defaults[r.id] = LIBS[r.lib][0].id;
    return { id: meta.id, name: meta.name, kind: "photo", base: `/studio/${meta.id}/base.jpg`, defaults, regions };
  }, [pts, meta]);

  const json = useMemo(() => JSON.stringify(config, null, 2).replace(/"([a-zA-Z]+)":/g, "$1:"), [config]);

  const copy = () => { navigator.clipboard?.writeText(json).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  const previewFill = (m) => (m.id === "floor" ? null : (preview ? fillOf(m.lib, LIBS[m.lib][2]?.id || LIBS[m.lib][0].id) : null));

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.eyebrow}>DESIGN STUDIO · REGION MARKER</div>
        <h1 style={s.h1}>Mark your photo.</h1>
        <p style={s.lead}>
          Load a kitchen photo, choose a surface, then click around its corners. The
          floor needs exactly 4 corners (top-left → top-right → bottom-right → bottom-left).
          Copy the generated config into <code style={s.code}>ROOMS</code> in <code style={s.code}>src/studio.jsx</code>,
          and save your photo at <code style={s.code}>public/studio/{config.id}/base.jpg</code>.
        </p>

        <div style={s.controls}>
          <label style={s.file}>Load photo<input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} /></label>
          <input value={meta.id} onChange={(e) => setMeta({ ...meta, id: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })} style={s.input} placeholder="room id" />
          <input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} style={s.input} placeholder="room name" />
          <label style={s.checkbox}><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Preview recolor</label>
        </div>

        <div style={s.layout}>
          <div style={{ minWidth: 0 }}>
            <div style={s.regionTabs}>
              {MARK.map((m) => {
                const n = (pts[m.id] || []).length;
                const done = m.type === "floor" ? n === 4 : n >= 3;
                return (
                  <button key={m.id} onClick={() => setActive(m.id)} style={{ ...s.rtab, ...(active === m.id ? s.rtabOn : {}), borderColor: active === m.id ? GOLD : (done ? "#6fae72" : "#ffffff1c") }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: m.tint, display: "inline-block", marginRight: 7 }} />
                    {m.label} {n ? `· ${n}` : ""}
                  </button>
                );
              })}
            </div>

            <div ref={boxRef} onClick={onClick} style={{ ...s.box, cursor: img ? "crosshair" : "default" }}>
              {img ? <img src={img} alt="" style={{ width: "100%", display: "block" }} /> : <div style={s.empty}>Load a photo to start marking</div>}
              {img && (
                <>
                  {/* preview recolor fills */}
                  {MARK.map((m) => {
                    const poly = pts[m.id] || [];
                    const fill = previewFill(m);
                    if (!fill || poly.length < 3) return null;
                    return <div key={"pv" + m.id} style={{ position: "absolute", inset: 0, background: fill, mixBlendMode: "multiply", clipPath: `polygon(${poly.map((p) => `${p[0]}% ${p[1]}%`).join(",")})`, pointerEvents: "none" }} />;
                  })}
                  {/* marker overlay */}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                    {MARK.map((m) => {
                      const poly = pts[m.id] || []; if (!poly.length) return null;
                      const isActive = active === m.id;
                      return (
                        <g key={"ov" + m.id}>
                          {poly.length >= 2 && <polygon points={poly.map((p) => `${p[0]},${p[1]}`).join(" ")} fill={m.tint} fillOpacity={isActive ? 0.18 : 0.08} stroke={m.tint} strokeWidth={isActive ? 0.5 : 0.3} strokeOpacity="0.9" vectorEffect="non-scaling-stroke" />}
                          {poly.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.7" fill="#fff" stroke={m.tint} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
                        </g>
                      );
                    })}
                  </svg>
                </>
              )}
            </div>

            <div style={s.row}>
              <span style={{ color: GOLD, fontWeight: 600 }}>{region.label}</span>
              <button onClick={undo} style={s.smallBtn}>Undo point</button>
              <button onClick={clear} style={s.smallBtn}>Clear surface</button>
              <span style={s.tip}>{region.type === "floor" ? "Click 4 corners, in order" : "Click each corner around the shape"}</span>
            </div>
          </div>

          <div style={s.panel}>
            <div style={s.panelHead}>Generated config</div>
            <p style={s.note}>Paste this object into the <code style={s.code}>ROOMS</code> array in <code style={s.code}>src/studio.jsx</code>.</p>
            <textarea readOnly value={json} style={s.code2} />
            <button onClick={copy} style={s.cta}>{copied ? "Copied ✓" : "Copy config"}</button>
            <ol style={s.steps}>
              <li>Save your photo as <code style={s.code}>public/studio/{config.id}/base.jpg</code></li>
              <li>Paste the config into <code style={s.code}>ROOMS</code></li>
              <li>Commit & push — the room appears in the Studio switcher</li>
            </ol>
            <div style={s.disc}>Tip: a region needs 3+ points (floor needs exactly 4) before it's included.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 5vw 110px" },
  wrap: { maxWidth: 1240, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(30px,4.6vw,52px)", color: "#fff", margin: "12px 0 10px", fontWeight: 500, letterSpacing: -1 },
  lead: { color: "#efe8da", fontSize: 15, lineHeight: 1.7, maxWidth: 760 },
  code: { background: "#ffffff10", border: "1px solid #ffffff1c", borderRadius: 4, padding: "1px 6px", color: GOLD, fontSize: 12.5 },

  controls: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "22px 0 18px" },
  file: { background: GOLD, color: INK, borderRadius: 4, padding: "11px 20px", fontSize: 12, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  input: { background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", minWidth: 150 },
  checkbox: { color: "#cdc6ba", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },

  layout: { display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(320px,1fr)", gap: 24, alignItems: "start" },
  regionTabs: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  rtab: { fontSize: 12, color: "#e7e0d4", background: "#ffffff0a", border: "1px solid #ffffff1c", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center" },
  rtabOn: { background: "#ffffff14" },

  box: { position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #c9a25e2e", background: INK, minHeight: 240 },
  empty: { display: "grid", placeItems: "center", height: 320, color: "#9c927f", fontSize: 15 },

  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  smallBtn: { background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 5, padding: "7px 12px", color: "#efe8da", fontSize: 12, cursor: "pointer", fontWeight: 600 },
  tip: { color: "#9c927f", fontSize: 12 },

  panel: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 12, padding: "20px 18px", position: "sticky", top: 96 },
  panelHead: { fontFamily: DISPLAY, fontSize: 22, color: "#fff", marginBottom: 8 },
  note: { color: "#cdc6ba", fontSize: 13, lineHeight: 1.6, marginBottom: 10 },
  code2: { width: "100%", minHeight: 240, background: "#07060455", border: "1px solid #ffffff1c", borderRadius: 8, color: "#e7e0d4", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, padding: 12, resize: "vertical", outline: "none" },
  cta: { width: "100%", marginTop: 10, background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "13px", fontSize: 12, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  steps: { color: "#cdc6ba", fontSize: 12.5, lineHeight: 1.8, paddingLeft: 18, marginTop: 14 },
  disc: { marginTop: 10, fontSize: 11, color: "#9c927f", lineHeight: 1.5 },
};
