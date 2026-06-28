import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

/*
 * Planner2D — JR Design Build's lightweight, white-label 2D floor planner.
 *
 * A self-contained SVG sketch tool: draw walls/rooms, drop labeled furniture,
 * see live dimensions, then hand the sketch summary to the estimate request.
 * No external dependencies, no 3D, no network — fully under our control.
 *
 * Units are feet. Exposes getSummary() via ref so PlannerModal can attach the
 * sketch to the "Request Estimate" handoff.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";

export type PlannerHandle = { getSummary: () => string };

type Pt = { x: number; y: number };
type Wall = { id: string; x1: number; y1: number; x2: number; y2: number };
type Furn = {
  id: string;
  type: string;
  label: string;
  x: number; // center, ft
  y: number;
  w: number; // ft
  h: number;
  rot: 0 | 90 | 180 | 270;
};

type Tool = "select" | "wall" | "room" | "pan";
type PaletteItem = { type: string; label: string; w: number; h: number; color: string };

// Default furniture footprints (feet).
const PALETTE: PaletteItem[] = [
  { type: "bed", label: "Bed", w: 5, h: 6.7, color: "#3a4a5a" },
  { type: "sofa", label: "Sofa", w: 7, h: 3, color: "#4a3f5a" },
  { type: "table", label: "Dining", w: 6, h: 3.5, color: "#5a4a3a" },
  { type: "kitchen", label: "Kitchen", w: 8, h: 2, color: "#3a5a4a" },
  { type: "island", label: "Island", w: 4, h: 2.5, color: "#3a5a4a" },
  { type: "fridge", label: "Fridge", w: 3, h: 3, color: "#2f4a52" },
  { type: "stove", label: "Stove", w: 2.5, h: 2.5, color: "#2f4a52" },
  { type: "tub", label: "Tub", w: 5, h: 2.5, color: "#2f4a5a" },
  { type: "toilet", label: "Toilet", w: 1.6, h: 2.5, color: "#454f57" },
  { type: "sink", label: "Sink", w: 2, h: 2, color: "#454f57" },
  { type: "closet", label: "Closet", w: 6, h: 2, color: "#4a4030" },
  { type: "desk", label: "Desk", w: 4, h: 2, color: "#5a4a3a" },
  { type: "tv", label: "TV", w: 4, h: 0.6, color: "#222222" },
  { type: "stairs", label: "Stairs", w: 3, h: 10, color: "#3f3f46" },
];

const SNAP = 0.5; // ft
const MIN_SCALE = 8;
const MAX_SCALE = 60;

const uid = (() => {
  let n = 0;
  return () => `id${++n}`;
})();

const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p.x, p.y, a.x, a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p.x, p.y, a.x + t * dx, a.y + t * dy);
}

const effDims = (f: Furn) => (f.rot === 90 || f.rot === 270 ? { w: f.h, h: f.w } : { w: f.w, h: f.h });

const Planner2D = forwardRef<PlannerHandle>(function Planner2D(_props, ref) {
  const [walls, setWalls] = useState<Wall[]>([]);
  const [furn, setFurn] = useState<Furn[]>([]);
  const [tool, setTool] = useState<Tool>("wall");
  const [placing, setPlacing] = useState<PaletteItem | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);

  const [scale, setScale] = useState(24); // px per ft
  const [offset, setOffset] = useState<Pt>({ x: 60, y: 60 }); // px

  const svgRef = useRef<SVGSVGElement | null>(null);
  const history = useRef<{ walls: Wall[]; furn: Furn[] }[]>([]);
  const drag = useRef<
    | { kind: "pan"; sx: number; sy: number; ox: number; oy: number }
    | { kind: "move"; id: string; dx: number; dy: number }
    | { kind: "room"; start: Pt }
    | null
  >(null);
  const [roomPreview, setRoomPreview] = useState<{ a: Pt; b: Pt } | null>(null);

  const pushHistory = useCallback(() => {
    history.current.push({ walls, furn });
    if (history.current.length > 50) history.current.shift();
  }, [walls, furn]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    setWalls(prev.walls);
    setFurn(prev.furn);
    setSelected(null);
  }, []);

  // Fold the in-progress wall chain into committed walls.
  const finishChain = useCallback(() => {
    setDraft((d) => {
      if (d.length > 1) {
        history.current.push({ walls, furn });
        const segs: Wall[] = [];
        for (let i = 0; i < d.length - 1; i++) {
          segs.push({ id: uid(), x1: d[i].x, y1: d[i].y, x2: d[i + 1].x, y2: d[i + 1].y });
        }
        setWalls((w) => [...w, ...segs]);
      }
      return [];
    });
  }, [walls, furn]);

  // ── coordinate transforms ──────────────────────────────────────────────
  const toWorld = useCallback(
    (clientX: number, clientY: number): Pt => {
      const r = svgRef.current?.getBoundingClientRect();
      const px = clientX - (r?.left ?? 0);
      const py = clientY - (r?.top ?? 0);
      return { x: (px - offset.x) / scale, y: (py - offset.y) / scale };
    },
    [offset, scale],
  );
  const sx = useCallback((wx: number) => wx * scale + offset.x, [scale, offset]);
  const sy = useCallback((wy: number) => wy * scale + offset.y, [scale, offset]);

  // ── keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "Enter") && draft.length) {
        e.preventDefault();
        finishChain();
      } else if ((e.key === "Delete" || e.key === "Backspace" || e.key === "x") && selected) {
        e.preventDefault();
        pushHistory();
        setWalls((w) => w.filter((x) => x.id !== selected));
        setFurn((f) => f.filter((x) => x.id !== selected));
        setSelected(null);
      } else if (e.key === "r" && selected) {
        setFurn((f) =>
          f.map((x) => (x.id === selected ? { ...x, rot: ((x.rot + 90) % 360) as Furn["rot"] } : x)),
        );
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, selected, finishChain, pushHistory, undo]);

  // ── hit testing ────────────────────────────────────────────────────────
  const hitFurn = useCallback(
    (p: Pt): Furn | null => {
      for (let i = furn.length - 1; i >= 0; i--) {
        const f = furn[i];
        const { w, h } = effDims(f);
        if (Math.abs(p.x - f.x) <= w / 2 && Math.abs(p.y - f.y) <= h / 2) return f;
      }
      return null;
    },
    [furn],
  );
  const hitWall = useCallback(
    (p: Pt): Wall | null => {
      const thresh = 6 / scale;
      for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        if (distToSeg(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) <= thresh) return w;
      }
      return null;
    },
    [walls, scale],
  );

  // ── pointer handlers ───────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const wp = toWorld(e.clientX, e.clientY);
      const sp = { x: snap(wp.x), y: snap(wp.y) };

      if (e.button === 1 || tool === "pan") {
        drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
        return;
      }
      if (placing) {
        pushHistory();
        const it = placing;
        const id = uid();
        setFurn((f) => [...f, { id, type: it.type, label: it.label, x: sp.x, y: sp.y, w: it.w, h: it.h, rot: 0 }]);
        setSelected(id);
        return;
      }
      if (tool === "wall") {
        setDraft((d) => [...d, sp]);
        return;
      }
      if (tool === "room") {
        drag.current = { kind: "room", start: sp };
        setRoomPreview({ a: sp, b: sp });
        return;
      }
      // select
      const f = hitFurn(wp);
      if (f) {
        setSelected(f.id);
        drag.current = { kind: "move", id: f.id, dx: wp.x - f.x, dy: wp.y - f.y };
        return;
      }
      const w = hitWall(wp);
      setSelected(w ? w.id : null);
    },
    [toWorld, tool, placing, offset, pushHistory, hitFurn, hitWall],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const wp = toWorld(e.clientX, e.clientY);
      setCursor({ x: snap(wp.x), y: snap(wp.y) });
      const d = drag.current;
      if (!d) return;
      if (d.kind === "pan") {
        setOffset({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
      } else if (d.kind === "move") {
        const nx = snap(wp.x - d.dx);
        const ny = snap(wp.y - d.dy);
        setFurn((f) => f.map((x) => (x.id === d.id ? { ...x, x: nx, y: ny } : x)));
      } else if (d.kind === "room") {
        setRoomPreview({ a: d.start, b: { x: snap(wp.x), y: snap(wp.y) } });
      }
    },
    [toWorld],
  );

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    if (d?.kind === "room" && roomPreview) {
      const { a, b } = roomPreview;
      if (Math.abs(a.x - b.x) >= SNAP && Math.abs(a.y - b.y) >= SNAP) {
        pushHistory();
        const corners: Pt[] = [
          { x: a.x, y: a.y },
          { x: b.x, y: a.y },
          { x: b.x, y: b.y },
          { x: a.x, y: b.y },
        ];
        const newWalls: Wall[] = corners.map((c, i) => {
          const n = corners[(i + 1) % 4];
          return { id: uid(), x1: c.x, y1: c.y, x2: n.x, y2: n.y };
        });
        setWalls((w) => [...w, ...newWalls]);
      }
      setRoomPreview(null);
    }
    if (d?.kind === "move") pushHistory();
    drag.current = null;
  }, [roomPreview, pushHistory]);

  const onDoubleClick = useCallback(() => {
    if (draft.length) finishChain();
  }, [draft, finishChain]);

  const draftSegments = useMemo(() => {
    const segs: Wall[] = [];
    for (let i = 0; i < draft.length - 1; i++) {
      segs.push({ id: `draft${i}`, x1: draft[i].x, y1: draft[i].y, x2: draft[i + 1].x, y2: draft[i + 1].y });
    }
    return segs;
  }, [draft]);

  // ── zoom ───────────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor)));
  }, []);
  const onWheel = useCallback((e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor)));
  }, []);

  const selectTool = useCallback(
    (t: Tool) => {
      if (draft.length) finishChain();
      setTool(t);
      setPlacing(null);
    },
    [draft, finishChain],
  );

  const clearAll = useCallback(() => {
    if (walls.length === 0 && furn.length === 0) return;
    if (!window.confirm("Clear the whole plan?")) return;
    pushHistory();
    setWalls([]);
    setFurn([]);
    setDraft([]);
    setSelected(null);
  }, [walls, furn, pushHistory]);

  // ── summary for the estimate handoff ───────────────────────────────────
  const getSummary = useCallback((): string => {
    if (walls.length === 0 && furn.length === 0) return "";
    const totalLen = walls.reduce((s, w) => s + dist(w.x1, w.y1, w.x2, w.y2), 0);
    const counts = new Map<string, number>();
    furn.forEach((f) => counts.set(f.label, (counts.get(f.label) ?? 0) + 1));
    const lines: string[] = ["My floor-plan sketch:"];
    lines.push(`• Walls: ${walls.length} segment(s), ~${totalLen.toFixed(0)} ft total`);
    if (counts.size) {
      lines.push("• Furniture / fixtures:");
      [...counts.entries()].forEach(([k, v]) => lines.push(`   - ${k} x${v}`));
    }
    return lines.join("\n");
  }, [walls, furn]);

  useImperativeHandle(ref, () => ({ getSummary }), [getSummary]);

  // ── render ─────────────────────────────────────────────────────────────
  const gridSize = scale;
  const patternX = ((offset.x % gridSize) + gridSize) % gridSize;
  const patternY = ((offset.y % gridSize) + gridSize) % gridSize;
  const cursorStyle =
    tool === "pan" ? "grab" : tool === "wall" || tool === "room" || placing ? "crosshair" : "default";

  return (
    <div style={st.wrap}>
      <div style={st.toolbar}>
        {(["select", "wall", "room", "pan"] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTool(t)}
            style={{ ...st.toolBtn, ...(tool === t && !placing ? st.toolBtnOn : {}) }}
          >
            {t === "select" ? "Select" : t === "wall" ? "Wall" : t === "room" ? "Room" : "Pan"}
          </button>
        ))}
        <div style={st.sep} />
        <button type="button" onClick={() => zoomBy(1 / 1.2)} style={st.toolBtn} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => zoomBy(1.2)} style={st.toolBtn} aria-label="Zoom in">+</button>
        <div style={st.sep} />
        <button type="button" onClick={undo} style={st.toolBtn}>Undo</button>
        <button type="button" onClick={clearAll} style={st.toolBtn}>Clear</button>
        <span style={st.hint}>
          {placing
            ? `Placing: ${placing.label} — click to drop`
            : tool === "wall"
              ? "Click points to draw walls · Esc/Enter or double-click to finish"
              : tool === "room"
                ? "Drag to draw a room"
                : tool === "select"
                  ? "Click to select · drag to move · R rotate · Del remove"
                  : "Drag to pan · scroll to zoom"}
        </span>
      </div>

      <div style={st.body}>
        <div style={st.palette}>
          <div style={st.paletteHead}>Furniture</div>
          {PALETTE.map((it) => (
            <button
              key={it.type}
              type="button"
              onClick={() => { setPlacing(it); setTool("select"); }}
              style={{ ...st.palItem, ...(placing?.type === it.type ? st.palItemOn : {}) }}
            >
              <span style={{ ...st.palSwatch, background: it.color }} />
              <span>{it.label}</span>
              <span style={st.palDim}>{it.w}×{it.h}′</span>
            </button>
          ))}
        </div>

        <svg
          ref={svgRef}
          style={{ ...st.canvas, cursor: cursorStyle }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
        >
          <defs>
            <pattern id="jrgrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={patternX} y={patternY}>
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#ffffff14" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#0e0c0a" />
          <rect width="100%" height="100%" fill="url(#jrgrid)" />

          {walls.map((w) => {
            const len = dist(w.x1, w.y1, w.x2, w.y2);
            const mx = (sx(w.x1) + sx(w.x2)) / 2;
            const my = (sy(w.y1) + sy(w.y2)) / 2;
            const sel = selected === w.id;
            return (
              <g key={w.id}>
                <line x1={sx(w.x1)} y1={sy(w.y1)} x2={sx(w.x2)} y2={sy(w.y2)} stroke={sel ? GOLD : "#e9e2d3"} strokeWidth={sel ? 7 : 5} strokeLinecap="round" />
                <text x={mx} y={my - 6} fill="#c9b48a" fontSize="11" textAnchor="middle">{len.toFixed(1)}′</text>
              </g>
            );
          })}

          {draftSegments.map((s) => (
            <line key={s.id} x1={sx(s.x1)} y1={sy(s.y1)} x2={sx(s.x2)} y2={sy(s.y2)} stroke={GOLD} strokeWidth={4} strokeDasharray="6 5" strokeLinecap="round" />
          ))}
          {draft.length > 0 && cursor && (
            <line x1={sx(draft[draft.length - 1].x)} y1={sy(draft[draft.length - 1].y)} x2={sx(cursor.x)} y2={sy(cursor.y)} stroke={`${GOLD}88`} strokeWidth={3} strokeDasharray="4 4" />
          )}
          {draft.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#fff" stroke={GOLD} strokeWidth={1.5} />
          ))}

          {roomPreview && (
            <rect
              x={Math.min(sx(roomPreview.a.x), sx(roomPreview.b.x))}
              y={Math.min(sy(roomPreview.a.y), sy(roomPreview.b.y))}
              width={Math.abs(sx(roomPreview.b.x) - sx(roomPreview.a.x))}
              height={Math.abs(sy(roomPreview.b.y) - sy(roomPreview.a.y))}
              fill={`${GOLD}18`} stroke={GOLD} strokeDasharray="6 5" strokeWidth={2}
            />
          )}

          {furn.map((f) => {
            const { w, h } = effDims(f);
            const px = sx(f.x - w / 2);
            const py = sy(f.y - h / 2);
            const pw = w * scale;
            const ph = h * scale;
            const sel = selected === f.id;
            const pal = PALETTE.find((p) => p.type === f.type);
            return (
              <g key={f.id}>
                <rect x={px} y={py} width={pw} height={ph} rx={3} fill={`${pal?.color ?? "#444444"}cc`} stroke={sel ? GOLD : "#ffffff44"} strokeWidth={sel ? 2.5 : 1} />
                <text x={px + pw / 2} y={py + ph / 2 + 4} fill="#f3ead7" fontSize="11" textAnchor="middle">{f.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

export default Planner2D;

const st: Record<string, React.CSSProperties> = {
  wrap: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#0e0c0a" },
  toolbar: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "8px 12px", borderBottom: `1px solid ${GOLD}22`, background: "#100d0a" },
  toolBtn: { background: "transparent", color: "#ece6db", border: "1px solid #ffffff22", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", minWidth: 34 },
  toolBtnOn: { background: GOLD, color: INK, borderColor: GOLD },
  sep: { width: 1, alignSelf: "stretch", background: "#ffffff1a", margin: "2px 4px" },
  hint: { color: "#9c927f", fontSize: 11.5, marginLeft: 6 },
  body: { flex: 1, minHeight: 0, display: "flex" },
  palette: { width: 150, flexShrink: 0, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 5, borderRight: `1px solid ${GOLD}22`, background: "#100d0a" },
  paletteHead: { color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, padding: "2px 2px 4px" },
  palItem: { display: "flex", alignItems: "center", gap: 7, background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 7, padding: "7px 8px", color: "#efe8da", fontSize: 12, cursor: "pointer", textAlign: "left" },
  palItemOn: { borderColor: GOLD, boxShadow: `0 0 0 1px ${GOLD}` },
  palSwatch: { width: 16, height: 16, borderRadius: 3, flexShrink: 0, border: "1px solid #00000055" },
  palDim: { marginLeft: "auto", color: "#8b8270", fontSize: 10.5 },
  canvas: { flex: 1, minWidth: 0, height: "100%", display: "block", touchAction: "none" },
};
