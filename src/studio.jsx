import React, { useMemo, useState } from "react";

/*
 * Design Studio (interactive finish visualizer).
 *
 * Concept: each room is a scene with paintable/swappable regions. The client
 * clicks hotspots on the room to open that region's swatches — walls & ceiling
 * take Sherwin-Williams colors, cabinets/countertop/backsplash take finishes,
 * the floor takes wood/tile textures (rendered in perspective), and crown
 * molding toggles on/off. Picking a swatch repaints the scene live.
 *
 * MVP renders a brand-styled VECTOR kitchen so the whole experience works with
 * zero photos. The same ROOM config also describes PHOTO rooms (base image +
 * region masks + a floor quad); drop the assets in /public/studio/<room>/ and
 * add a `kind:"photo"` entry to ROOMS and it renders over the real photo using
 * masked multiply-blend + a perspective-warped floor. See docs/DESIGN_STUDIO.md.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";

/* ----------------------------------------------------------------------------
 * Swatch libraries (data-driven — extend these freely)
 * Sherwin-Williams hex values are close on-screen approximations; the SW number
 * is the source of truth at the paint counter.
 * ------------------------------------------------------------------------- */
const SW = [
  { id: "SW7757", name: "High Reflective White", hex: "#F4F3ED", sw: "SW 7757" },
  { id: "SW7005", name: "Pure White", hex: "#EDECE3", sw: "SW 7005" },
  { id: "SW7008", name: "Alabaster", hex: "#EDEADF", sw: "SW 7008" },
  { id: "SW6385", name: "Dover White", hex: "#EBE2CE", sw: "SW 6385" },
  { id: "SW9166", name: "Drift of Mist", hex: "#DBD7CB", sw: "SW 9166" },
  { id: "SW7036", name: "Accessible Beige", hex: "#D3C8B4", sw: "SW 7036" },
  { id: "SW7029", name: "Agreeable Gray", hex: "#D0CABF", sw: "SW 7029" },
  { id: "SW7015", name: "Repose Gray", hex: "#C8C4BB", sw: "SW 7015" },
  { id: "SW7016", name: "Mindful Gray", hex: "#BBB6AC", sw: "SW 7016" },
  { id: "SW6204", name: "Sea Salt", hex: "#CDD5CB", sw: "SW 6204" },
  { id: "SW6470", name: "Watery", hex: "#9CC0BB", sw: "SW 6470" },
  { id: "SW6447", name: "Clary Sage", hex: "#9BA284", sw: "SW 6447" },
  { id: "SW6244", name: "Naval", hex: "#2E3D4C", sw: "SW 6244" },
  { id: "SW7674", name: "Peppercorn", hex: "#57595D", sw: "SW 7674" },
  { id: "SW7048", name: "Urbane Bronze", hex: "#544F49", sw: "SW 7048" },
  { id: "SW7069", name: "Iron Ore", hex: "#42423F", sw: "SW 7069" },
  { id: "SW6258", name: "Tricorn Black", hex: "#2E2E2F", sw: "SW 6258" },
  { id: "SW6097", name: "Sturbridge White", hex: "#DCC9A8", sw: "SW 6097" },
];

// Cabinet finishes (paint + a couple of woods)
const CABINETS = [
  { id: "alabaster", name: "Alabaster", kind: "color", hex: "#EDEADF" },
  { id: "greige", name: "Accessible Beige", kind: "color", hex: "#D3C8B4" },
  { id: "sage", name: "Clary Sage", kind: "color", hex: "#9BA284" },
  { id: "naval", name: "Naval", kind: "color", hex: "#2E3D4C" },
  { id: "peppercorn", name: "Peppercorn", kind: "color", hex: "#57595D" },
  { id: "tricorn", name: "Tricorn Black", kind: "color", hex: "#2E2E2F" },
  { id: "walnut", name: "Walnut", kind: "wood", hex: "#6B4A2F" },
  { id: "oak", name: "Natural Oak", kind: "wood", hex: "#B7935C" },
];

// Countertops (stone slabs — flat fill + optional veining)
const COUNTERS = [
  { id: "calacatta", name: "Calacatta", base: "#F1EFE9", vein: "#b9b09b" },
  { id: "carrara", name: "Carrara", base: "#E7E7E3", vein: "#a9aeb0" },
  { id: "quartz", name: "White Quartz", base: "#ECEAE3", vein: "#d8d4ca" },
  { id: "soapstone", name: "Soapstone", base: "#3A3F3F", vein: "#586161" },
  { id: "granite", name: "Black Granite", base: "#242528", vein: "#43464b" },
  { id: "butcher", name: "Butcher Block", base: "#B5824B", vein: "#9a6c3c" },
];

// Backsplash finishes
const BACKSPLASH = [
  { id: "subway-white", name: "White Subway", base: "#EFEDE6", grout: "#d6d2c7", style: "subway" },
  { id: "subway-gray", name: "Gray Subway", base: "#CFCBC2", grout: "#aea99e", style: "subway" },
  { id: "marble", name: "Marble Slab", base: "#ECEAE4", grout: "#bdb6a6", style: "slab" },
  { id: "zellige", name: "Zellige Green", base: "#7E8E78", grout: "#5f6c5b", style: "subway" },
  { id: "matchstone", name: "Match Countertop", base: "#F1EFE9", grout: "#cfc8b8", style: "slab" },
];

// Floors (wood + tile) — rendered in perspective
const FLOORS = [
  { id: "white-oak", name: "White Oak", kind: "wood", base: "#C7A877", line: "#9c7e52" },
  { id: "natural-oak", name: "Natural Oak", kind: "wood", base: "#B5905A", line: "#8a6c3e" },
  { id: "walnut", name: "Walnut", kind: "wood", base: "#6E4C30", line: "#503521" },
  { id: "espresso", name: "Espresso", kind: "wood", base: "#3F2C21", line: "#2a1c15" },
  { id: "graywash", name: "Gray Wash", kind: "wood", base: "#AAA29A", line: "#857d74" },
  { id: "carrara-tile", name: "Carrara Tile", kind: "tile", base: "#E8E7E2", line: "#c2bfb6" },
  { id: "slate", name: "Slate Tile", kind: "tile", base: "#5A5E62", line: "#44484c" },
  { id: "travertine", name: "Travertine", kind: "tile", base: "#C9B79A", line: "#a99877" },
];

/* ----------------------------------------------------------------------------
 * Room config. `regions` map a layer id to its hotspot position (% of the
 * scene box) and which swatch library it pulls from.
 * ------------------------------------------------------------------------- */
const ROOMS = [
  {
    id: "kitchen",
    name: "Kitchen",
    kind: "vector",
    regions: [
      { id: "walls", label: "Walls", lib: "SW", hotspot: { x: 14, y: 30 } },
      { id: "ceiling", label: "Ceiling", lib: "SW", hotspot: { x: 50, y: 6 } },
      { id: "cabinets", label: "Cabinets", lib: "CABINETS", hotspot: { x: 80, y: 26 } },
      { id: "counter", label: "Countertop", lib: "COUNTERS", hotspot: { x: 82, y: 53 } },
      { id: "backsplash", label: "Backsplash", lib: "BACKSPLASH", hotspot: { x: 67, y: 47 } },
      { id: "floor", label: "Flooring", lib: "FLOORS", hotspot: { x: 38, y: 86 } },
      { id: "molding", label: "Crown molding", lib: "TOGGLE", hotspot: { x: 30, y: 11 } },
    ],
  },
];

const LIBS = { SW, CABINETS, COUNTERS, BACKSPLASH, FLOORS };

const DEFAULTS = {
  walls: "SW7029",
  ceiling: "SW7757",
  cabinets: "naval",
  counter: "calacatta",
  backsplash: "subway-white",
  floor: "white-oak",
  molding: true,
};

const byId = (lib, id) => lib.find((x) => x.id === id) || lib[0];

/* ----------------------------------------------------------------------------
 * Perspective floor — planks/tiles converging toward a vanishing point
 * ------------------------------------------------------------------------- */
function Floor({ floor }) {
  const W = 1000;
  const yBack = 452;   // floor meets the cabinets/wall base
  const yFront = 680;
  const vx = 500;      // vanishing point x
  const comp = 0.2;    // how much the back edge compresses toward vx

  const seamX = (front) => vx + (front - vx) * comp;
  const planks = [];
  // vertical seams running away from the viewer
  for (let i = -6; i <= 6; i++) {
    const fx = vx + i * 96;
    planks.push(
      <line key={"v" + i} x1={fx} y1={yFront} x2={seamX(fx)} y2={yBack}
        stroke={floor.line} strokeOpacity="0.55" strokeWidth={i === 0 ? 1.4 : 1} />
    );
  }
  // horizontal board joints (closer together toward the back = perspective)
  const rows = floor.kind === "tile" ? 5 : 7;
  const joints = [];
  for (let r = 1; r < rows; r++) {
    const t = Math.pow(r / rows, 1.7);            // ease so rows bunch up at back
    const y = yFront - t * (yFront - yBack);
    joints.push(
      <line key={"h" + r} x1={0} y1={y} x2={W} y2={y}
        stroke={floor.line} strokeOpacity="0.5" strokeWidth="1" />
    );
  }

  return (
    <g>
      <polygon points={`0,${yBack} ${W},${yBack} ${W},${yFront} 0,${yFront}`} fill={floor.base} />
      {/* depth shading: lighter at front, darker toward the wall */}
      <polygon points={`0,${yBack} ${W},${yBack} ${W},${yFront} 0,${yFront}`} fill="url(#floorShade)" />
      {planks}
      {joints}
    </g>
  );
}

/* ----------------------------------------------------------------------------
 * The vector kitchen scene
 * ------------------------------------------------------------------------- */
function KitchenScene({ v }) {
  const wall = byId(SW, v.walls).hex;
  const ceil = byId(SW, v.ceiling).hex;
  const cab = byId(CABINETS, v.cabinets);
  const counter = byId(COUNTERS, v.counter);
  const bs = byId(BACKSPLASH, v.backsplash);
  const floor = byId(FLOORS, v.floor);
  const bsBase = bs.id === "matchstone" ? counter.base : bs.base;

  // cabinet door helper
  const door = (x, y, w, h, key) => (
    <g key={key}>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={cab.hex} stroke="#00000022" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="2" fill="none" stroke="#ffffff14" />
      <circle cx={x + w - 9} cy={y + h / 2} r="2.4" fill={GOLD} />
    </g>
  );

  return (
    <svg viewBox="0 0 1000 680" style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Interactive kitchen preview">
      <defs>
        <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="counterSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* ceiling */}
      <rect x="0" y="0" width="1000" height="70" fill={ceil} />
      {/* crown molding */}
      {v.molding && (
        <g>
          <rect x="0" y="62" width="1000" height="12" fill={ceil} stroke="#00000018" />
          <rect x="0" y="70" width="1000" height="4" fill="#ffffff22" />
          <rect x="0" y="72" width="1000" height="3" fill="#00000022" />
        </g>
      )}

      {/* back wall */}
      <rect x="0" y={v.molding ? 75 : 70} width="1000" height={452 - (v.molding ? 75 : 70)} fill={wall} />
      <rect x="0" y={v.molding ? 75 : 70} width="1000" height={452 - (v.molding ? 75 : 70)} fill="url(#wallShade)" />

      {/* window on the left */}
      <g>
        <rect x="70" y="150" width="250" height="190" rx="3" fill="#cfe0e6" stroke="#ffffff55" strokeWidth="2" />
        <rect x="70" y="150" width="250" height="190" rx="3" fill="url(#counterSheen)" opacity="0.5" />
        <line x1="195" y1="150" x2="195" y2="340" stroke="#ffffff88" strokeWidth="3" />
        <line x1="70" y1="245" x2="320" y2="245" stroke="#ffffff88" strokeWidth="3" />
        <rect x="62" y="142" width="266" height="206" rx="4" fill="none" stroke={cab.hex} strokeWidth="8" />
      </g>

      {/* upper cabinets (right) */}
      {door(640, 110, 95, 120, "u1")}
      {door(745, 110, 95, 120, "u2")}
      {door(850, 110, 110, 120, "u3")}

      {/* backsplash band */}
      <g>
        <rect x="600" y="300" width="400" height="58" fill={bsBase} />
        {bs.style === "subway" &&
          Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => (
              <rect key={`b${r}-${c}`} x={600 + ((c * 46 + (r % 2 ? 23 : 0)) % 414) } y={300 + r * 15}
                width="44" height="13" fill="none" stroke={bs.grout} strokeWidth="1.4" />
            ))
          )}
        {bs.style === "slab" && (
          <>
            <path d="M620 312 q40 18 90 4 t110 12" fill="none" stroke={bs.grout} strokeOpacity="0.7" strokeWidth="1.6" />
            <path d="M700 348 q60 -16 130 -2" fill="none" stroke={bs.grout} strokeOpacity="0.5" strokeWidth="1.4" />
          </>
        )}
      </g>

      {/* countertop slab (right run) */}
      <g>
        <rect x="590" y="358" width="410" height="22" rx="2" fill={counter.base} />
        <rect x="590" y="358" width="410" height="9" fill="url(#counterSheen)" />
        {counter.vein && (
          <>
            <path d="M610 369 q70 -8 150 2 t230 -3" fill="none" stroke={counter.vein} strokeOpacity="0.6" strokeWidth="1.4" />
            <path d="M640 374 q90 6 180 -2" fill="none" stroke={counter.vein} strokeOpacity="0.4" strokeWidth="1.2" />
          </>
        )}
      </g>
      {/* lower cabinets (right run) */}
      {door(600, 382, 95, 70, "l1")}
      {door(705, 382, 95, 70, "l2")}
      {door(810, 382, 95, 70, "l3")}
      {door(915, 382, 85, 70, "l4")}

      {/* island (foreground left) */}
      <g>
        <rect x="120" y="360" width="360" height="26" rx="3" fill={counter.base} />
        <rect x="120" y="360" width="360" height="10" fill="url(#counterSheen)" />
        {counter.vein && (
          <path d="M150 373 q90 -9 180 1 t150 -2" fill="none" stroke={counter.vein} strokeOpacity="0.55" strokeWidth="1.5" />
        )}
        {door(132, 388, 108, 62, "i1")}
        {door(248, 388, 108, 62, "i2")}
        {door(364, 388, 104, 62, "i3")}
        <rect x="120" y="384" width="360" height="2" fill="#00000022" />
      </g>

      <Floor floor={floor} />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * Swatch picker
 * ------------------------------------------------------------------------- */
function Swatches({ region, value, onPick }) {
  if (region.lib === "TOGGLE") {
    return (
      <div style={s.toggleRow}>
        {[true, false].map((on) => (
          <button key={String(on)} onClick={() => onPick(on)}
            style={{ ...s.toggleBtn, ...(value === on ? s.toggleOn : {}) }}>
            {on ? "With molding" : "No molding"}
          </button>
        ))}
      </div>
    );
  }
  const lib = LIBS[region.lib] || [];
  return (
    <div style={s.swatchGrid}>
      {lib.map((o) => {
        const active = value === o.id;
        const fill = o.hex || o.base;
        return (
          <button key={o.id} onClick={() => onPick(o.id)} title={`${o.name}${o.sw ? " · " + o.sw : ""}`}
            style={{ ...s.swatch, ...(active ? s.swatchOn : {}) }}>
            <span style={{ ...s.chip, background: fill, ...(o.kind === "wood" ? { backgroundImage: `repeating-linear-gradient(90deg, ${fill}, ${fill} 5px, ${o.line || "#00000022"} 6px)` } : {}) }} />
            <span style={s.swatchName}>{o.name}</span>
            {o.sw && <span style={s.swCode}>{o.sw}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */
export default function StudioPage({ go }) {
  const room = ROOMS[0];
  const [v, setV] = useState(DEFAULTS);
  const [active, setActive] = useState("walls");

  const region = room.regions.find((r) => r.id === active) || room.regions[0];
  const set = (id, val) => setV((p) => ({ ...p, [id]: val }));

  const summary = useMemo(() => ({
    Walls: byId(SW, v.walls).name + " (" + byId(SW, v.walls).sw + ")",
    Ceiling: byId(SW, v.ceiling).name + " (" + byId(SW, v.ceiling).sw + ")",
    Cabinets: byId(CABINETS, v.cabinets).name,
    Countertop: byId(COUNTERS, v.counter).name,
    Backsplash: byId(BACKSPLASH, v.backsplash).name,
    Flooring: byId(FLOORS, v.floor).name,
    Molding: v.molding ? "Yes" : "No",
  }), [v]);

  const requestLook = () => {
    try { sessionStorage.setItem("jr_studio_look", JSON.stringify({ room: room.name, ...summary })); } catch {}
    go("contact");
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.eyebrow}>DESIGN STUDIO · {room.name.toUpperCase()}</div>
        <h1 style={s.h1}>See your finishes before we build.</h1>
        <p style={s.lead}>
          Tap any point on the kitchen to try Sherwin-Williams colors, cabinet and
          countertop finishes, backsplash, flooring and crown molding. When you love it,
          send the combination to our team and we'll price it into your project.
        </p>

        <div style={s.layout}>
          {/* scene + hotspots */}
          <div style={s.sceneCol}>
            <div style={s.sceneBox}>
              <KitchenScene v={v} />
              {room.regions.map((r) => (
                <button key={r.id} onClick={() => setActive(r.id)}
                  aria-label={r.label}
                  style={{
                    ...s.hotspot,
                    left: `${r.hotspot.x}%`, top: `${r.hotspot.y}%`,
                    ...(active === r.id ? s.hotspotOn : {}),
                  }}>
                  <span style={s.hotspotDot} />
                  <span style={s.hotspotLabel}>{r.label}</span>
                </button>
              ))}
            </div>
            <div style={s.hint}>● Tap a point on the room to change that surface</div>
          </div>

          {/* control panel */}
          <div style={s.panel}>
            <div style={s.panelTabs}>
              {room.regions.map((r) => (
                <button key={r.id} onClick={() => setActive(r.id)}
                  style={{ ...s.tab, ...(active === r.id ? s.tabOn : {}) }}>{r.label}</button>
              ))}
            </div>

            <div style={s.panelHead}>{region.label}</div>
            <Swatches region={region} value={v[region.id]} onPick={(val) => set(region.id, val)} />

            <div style={s.summary}>
              <div style={s.summaryHead}>Your selection</div>
              {Object.entries(summary).map(([k, val]) => (
                <div key={k} style={s.summaryRow}><span style={s.sk}>{k}</span><span style={s.sv}>{val}</span></div>
              ))}
            </div>

            <button onClick={requestLook} style={s.cta}>Request this look →</button>
            <button onClick={() => setV(DEFAULTS)} style={s.reset}>Reset to default</button>
            <div style={s.disclaimer}>Colors are on-screen approximations. The Sherwin-Williams code is exact — confirm with a physical sample.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 5vw 110px" },
  wrap: { maxWidth: 1200, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(32px,5vw,60px)", color: "#fff", margin: "14px 0 12px", fontWeight: 500, letterSpacing: -1, textShadow: "0 1px 2px #000" },
  lead: { color: "#efe8da", fontSize: 16, lineHeight: 1.7, maxWidth: 680 },

  layout: { display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(300px,1fr)", gap: 26, marginTop: 34, alignItems: "start" },
  sceneCol: { minWidth: 0 },
  sceneBox: { position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #c9a25e2e", boxShadow: "0 30px 80px #000000aa", background: INK },
  hint: { marginTop: 12, fontSize: 12.5, color: GOLD, letterSpacing: 0.4 },

  hotspot: { position: "absolute", transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 },
  hotspotOn: { zIndex: 3 },
  hotspotDot: { width: 18, height: 18, borderRadius: "50%", background: "#ffffffcc", border: `2px solid ${GOLD}`, boxShadow: "0 0 0 6px #c9a25e33, 0 2px 8px #000", display: "block" },
  hotspotLabel: { fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "#fff", background: "#0c0a08cc", border: "1px solid #ffffff22", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap", fontWeight: 600 },

  panel: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 12, padding: "20px 18px", backdropFilter: "blur(10px)", position: "sticky", top: 96 },
  panelTabs: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  tab: { fontSize: 11, letterSpacing: 0.5, color: "#cdc6ba", background: "#ffffff0a", border: "1px solid #ffffff1c", borderRadius: 20, padding: "6px 11px", cursor: "pointer", fontWeight: 600 },
  tabOn: { color: INK, background: GOLD, borderColor: GOLD },

  panelHead: { fontFamily: DISPLAY, fontSize: 22, color: "#fff", marginBottom: 12 },
  swatchGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(92px,1fr))", gap: 8, maxHeight: 280, overflowY: "auto", paddingRight: 4 },
  swatch: { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, background: "#ffffff08", border: "1px solid #ffffff1a", borderRadius: 8, padding: 7, cursor: "pointer", textAlign: "left" },
  swatchOn: { borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}` },
  chip: { display: "block", height: 40, borderRadius: 5, border: "1px solid #00000033" },
  swatchName: { fontSize: 10.5, color: "#efe8da", lineHeight: 1.2, fontWeight: 600 },
  swCode: { fontSize: 9.5, color: "#b8ad97", letterSpacing: 0.4 },

  toggleRow: { display: "flex", gap: 8 },
  toggleBtn: { flex: 1, padding: "12px", borderRadius: 8, border: "1px solid #ffffff1c", background: "#ffffff08", color: "#efe8da", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  toggleOn: { background: GOLD, color: INK, borderColor: GOLD },

  summary: { marginTop: 18, borderTop: "1px solid #ffffff14", paddingTop: 14 },
  summaryHead: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 10 },
  summaryRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 12.5 },
  sk: { color: "#b8ad97" },
  sv: { color: "#fff", textAlign: "right", fontWeight: 600 },

  cta: { width: "100%", marginTop: 18, background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "15px", fontSize: 12, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", cursor: "pointer" },
  reset: { width: "100%", marginTop: 8, background: "transparent", color: "#cdc6ba", border: "1px solid #ffffff22", borderRadius: 4, padding: "11px", fontSize: 11, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" },
  disclaimer: { marginTop: 12, fontSize: 10.5, color: "#9c927f", lineHeight: 1.5 },
};
