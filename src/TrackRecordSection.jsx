// =============================================================================
// JR DESIGN BUILD — TRACK RECORD SECTION
// -----------------------------------------------------------------------------
// Standalone section component for JRDesignBuild_Site_DNA.jsx
// Palette: Black + Gold | Type: Bodoni Moda (display) + Archivo (body)
// Aesthetic: "blueprint vivo" — survey-marker pins, hairline grids, gold ink
//
// DATA SOURCE: QuickBooks Online (extracted 2026-06-11)
//   • 533 unique job sites since Nov/2021 (fuzzy-deduped contact addresses)
//   • 52 Bay Area cities served
//   • $18.25M invoiced / delivered
//   • $49.5M estimated (1,000+ estimates since Jul/2023)
// All client-identifying data is aggregated to city level only.
//
// FUTURE: replace STATS/CITIES constants with a fetch to the Supabase view
// fed by the Cloudflare Worker QBO-sync cron (live track-record badge).
//
// Usage: <TrackRecordSection />  — no required props, default export.
// =============================================================================

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------- data ------
const STATS = [
  { key: "projects", end: 533, suffix: "+", label: "Projects Completed", sub: "Unique job sites since 2021" },
  { key: "cities", end: 52, suffix: "", label: "Bay Area Cities", sub: "From Half Moon Bay to Danville" },
  { key: "delivered", end: 18, prefix: "$", suffix: "M+", label: "Work Delivered", sub: "Invoiced & built — not promised" },
  { key: "estimated", end: 49, prefix: "$", suffix: "M+", label: "Projects Estimated", sub: "1,000+ detailed estimates since 2023" },
];

// Cumulative unique job sites by year (first invoice date per site)
const GROWTH = [
  { year: "2021", value: 9 },
  { year: "2022", value: 98 },
  { year: "2023", value: 259 },
  { year: "2024", value: 424 },
  { year: "2025", value: 517 },
  { year: "2026", value: 533, ytd: true },
];

// City-level aggregation only — no client addresses are ever exposed.
const CITIES = [
  { city: "San Mateo", lat: 37.563, lng: -122.3255, projects: 83 },
  { city: "San Francisco", lat: 37.7749, lng: -122.4194, projects: 55 },
  { city: "Burlingame", lat: 37.5841, lng: -122.3661, projects: 49 },
  { city: "South San Francisco", lat: 37.6547, lng: -122.4077, projects: 34 },
  { city: "Millbrae", lat: 37.5985, lng: -122.3872, projects: 32 },
  { city: "Hillsborough", lat: 37.5741, lng: -122.3794, projects: 31 },
  { city: "Pacifica", lat: 37.6138, lng: -122.4869, projects: 23 },
  { city: "Foster City", lat: 37.5585, lng: -122.2711, projects: 18 },
  { city: "San Carlos", lat: 37.5072, lng: -122.2605, projects: 17 },
  { city: "San Bruno", lat: 37.6305, lng: -122.4111, projects: 17 },
  { city: "San Jose", lat: 37.3382, lng: -121.8863, projects: 16 },
  { city: "Redwood City", lat: 37.4852, lng: -122.2364, projects: 15 },
  { city: "Daly City", lat: 37.6879, lng: -122.4702, projects: 14 },
  { city: "Sunnyvale", lat: 37.3688, lng: -122.0363, projects: 9 },
  { city: "Palo Alto", lat: 37.4419, lng: -122.143, projects: 9 },
  { city: "Hayward", lat: 37.6688, lng: -122.0808, projects: 7 },
  { city: "Belmont", lat: 37.5202, lng: -122.2758, projects: 7 },
  { city: "Santa Clara", lat: 37.3541, lng: -121.9552, projects: 6 },
  { city: "Menlo Park", lat: 37.453, lng: -122.1817, projects: 5 },
  { city: "Oakland", lat: 37.8044, lng: -122.2712, projects: 5 },
  { city: "Brisbane", lat: 37.6808, lng: -122.3999, projects: 4 },
  { city: "Half Moon Bay", lat: 37.4636, lng: -122.4286, projects: 4 },
  { city: "Milpitas", lat: 37.4323, lng: -121.8996, projects: 4 },
  { city: "Berkeley", lat: 37.8715, lng: -122.273, projects: 4 },
  { city: "Mountain View", lat: 37.3861, lng: -122.0839, projects: 4 },
  { city: "Cupertino", lat: 37.323, lng: -122.0322, projects: 3 },
  { city: "Danville", lat: 37.8216, lng: -122.0, projects: 3 },
  { city: "Fremont", lat: 37.5485, lng: -121.9886, projects: 3 },
  { city: "Mill Valley", lat: 37.906, lng: -122.545, projects: 2 },
  { city: "Los Altos", lat: 37.3852, lng: -122.1141, projects: 2 },
  { city: "Campbell", lat: 37.2872, lng: -121.95, projects: 2 },
  { city: "Woodside", lat: 37.4299, lng: -122.2539, projects: 2 },
  { city: "Saratoga", lat: 37.2638, lng: -122.023, projects: 2 },
  { city: "Pleasanton", lat: 37.6624, lng: -121.8747, projects: 2 },
  { city: "Martinez", lat: 38.0194, lng: -122.1341, projects: 1 },
  { city: "Hercules", lat: 38.0171, lng: -122.2886, projects: 1 },
  { city: "Monte Sereno", lat: 37.2363, lng: -121.9925, projects: 1 },
  { city: "Castro Valley", lat: 37.6941, lng: -122.0864, projects: 1 },
  { city: "Sausalito", lat: 37.8591, lng: -122.4853, projects: 1 },
  { city: "Walnut Creek", lat: 37.9101, lng: -122.0652, projects: 1 },
  { city: "San Ramon", lat: 37.7799, lng: -121.978, projects: 1 },
  { city: "Richmond", lat: 37.9358, lng: -122.3477, projects: 1 },
  { city: "East Palo Alto", lat: 37.4688, lng: -122.1411, projects: 1 },
  { city: "Antioch", lat: 38.0049, lng: -121.8058, projects: 1 },
  { city: "Moss Beach", lat: 37.5275, lng: -122.5136, projects: 1 },
  { city: "Emeryville", lat: 37.8313, lng: -122.2852, projects: 1 },
  { city: "San Rafael", lat: 37.9735, lng: -122.5311, projects: 1 },
  { city: "Portola Valley", lat: 37.3841, lng: -122.2352, projects: 1 },
  { city: "Atherton", lat: 37.4613, lng: -122.1977, projects: 1 },
  { city: "Colma", lat: 37.6769, lng: -122.4597, projects: 1 },
  { city: "Livermore", lat: 37.6819, lng: -121.768, projects: 1 },
  { city: "Dublin", lat: 37.7022, lng: -121.9358, projects: 1 },
];

// ------------------------------------------------------------- helpers ------
const GOLD = "#C9A227";
const GOLD_SOFT = "rgba(201,162,39,0.16)";
const INK = "#0A0A08";
const PAPER = "#EDE6D6";
const MUTED = "#8A8578";

// Map projection bounds (Bay Area window)
const BOUNDS = { minLng: -122.62, maxLng: -121.7, minLat: 37.2, maxLat: 38.07 };
const MAP_W = 560;
const MAP_H = 620;

function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W;
  const y = MAP_H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

function pinRadius(projects) {
  // sqrt scale: 1 project → 3.5px, 83 projects → ~15px
  return 3.5 + Math.sqrt(projects) * 1.25;
}

function useInView(threshold = 0.35) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ----------------------------------------------------- animated counter -----
function Counter({ end, prefix = "", suffix = "", run }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) {
      setVal(end);
      return;
    }
    const dur = 1600;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, end]);
  return (
    <span>
      {prefix}
      {val.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

// ------------------------------------------------------------ map pin -------
function CityPin({ c, maxProjects, active, onEnter, onLeave }) {
  const { x, y } = project(c.lat, c.lng);
  const r = pinRadius(c.projects);
  const major = c.projects >= 15;
  return (
    <g
      transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
      onMouseEnter={() => onEnter(c, x, y)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(c, x, y)}
      onBlur={onLeave}
      tabIndex={0}
      role="img"
      aria-label={`${c.city}: ${c.projects} project${c.projects > 1 ? "s" : ""}`}
      style={{ cursor: "pointer", outline: "none" }}
    >
      {/* survey-marker crosshair */}
      <line x1={-r - 5} x2={-r - 1.5} y1="0" y2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line x1={r + 1.5} x2={r + 5} y1="0" y2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line y1={-r - 5} y2={-r - 1.5} x1="0" x2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line y1={r + 1.5} y2={r + 5} x1="0" x2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      {/* pulse ring on majors */}
      {major && <circle className="jrtr-pulse" r={r} fill="none" stroke={GOLD} strokeWidth="1" />}
      <circle
        r={r}
        fill={active ? GOLD : "rgba(201,162,39,0.14)"}
        stroke={GOLD}
        strokeWidth={active ? 1.6 : 1}
        style={{ transition: "fill 200ms ease" }}
      />
      <circle r="1.4" fill={GOLD} />
      {/* permanent label for the anchor markets */}
      {c.projects >= 30 && (
        <text
          x={r + 9}
          y="3.5"
          fontSize="10.5"
          fill={active ? PAPER : MUTED}
          fontFamily="'Archivo', system-ui, sans-serif"
          letterSpacing="0.08em"
          style={{ textTransform: "uppercase", transition: "fill 200ms ease" }}
        >
          {c.city}
        </text>
      )}
      <title>{`${c.city} — ${c.projects} project${c.projects > 1 ? "s" : ""}`}</title>
      {void maxProjects}
    </g>
  );
}

// --------------------------------------------------------- growth chart -----
function GrowthChart({ run }) {
  const W = 560;
  const H = 230;
  const PAD = { l: 44, r: 16, t: 18, b: 30 };
  const max = 560; // headroom above 533
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const step = innerW / GROWTH.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Cumulative projects completed, 2021 to 2026: 9 to 533"
      style={{ display: "block" }}
    >
      {/* hairline grid — drafting paper */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.t + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke={GOLD_SOFT} strokeWidth="0.6" />
            <text x={PAD.l - 8} y={y + 3.5} fontSize="9.5" fill={MUTED} textAnchor="end" fontFamily="'Archivo', system-ui, sans-serif">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}
      {GROWTH.map((g, i) => {
        const x = PAD.l + step * i + step / 2;
        const h = (g.value / max) * innerH;
        const y = PAD.t + innerH - h;
        const barW = Math.min(34, step * 0.46);
        return (
          <g key={g.year}>
            <rect
              className="jrtr-bar"
              x={x - barW / 2}
              y={run ? y : PAD.t + innerH}
              width={barW}
              height={run ? h : 0}
              fill="rgba(201,162,39,0.18)"
              stroke={GOLD}
              strokeWidth="1"
              style={{ transition: `y 900ms cubic-bezier(.2,.8,.2,1) ${i * 110}ms, height 900ms cubic-bezier(.2,.8,.2,1) ${i * 110}ms` }}
            />
            {/* measurement tick + value, like a dimension line */}
            <text
              x={x}
              y={y - 7}
              fontSize="11"
              fill={PAPER}
              textAnchor="middle"
              fontFamily="'Archivo', system-ui, sans-serif"
              opacity={run ? 1 : 0}
              style={{ transition: `opacity 500ms ease ${600 + i * 110}ms` }}
            >
              {g.value}
            </text>
            <text x={x} y={H - 10} fontSize="10" fill={MUTED} textAnchor="middle" fontFamily="'Archivo', system-ui, sans-serif" letterSpacing="0.06em">
              {g.year}
              {g.ytd ? "*" : ""}
            </text>
          </g>
        );
      })}
      <text x={W - PAD.r} y={H - 10} fontSize="8.5" fill={MUTED} textAnchor="end" fontFamily="'Archivo', system-ui, sans-serif">
        *YTD
      </text>
    </svg>
  );
}

// ------------------------------------------------------------- section ------
export default function TrackRecordSection() {
  const [statsRef, statsInView] = useInView(0.3);
  const [chartRef, chartInView] = useInView(0.3);
  const [tip, setTip] = useState(null); // {city, projects, x, y}
  const maxProjects = Math.max(...CITIES.map((c) => c.projects));

  return (
    <section
      id="track-record"
      style={{
        background: INK,
        color: PAPER,
        padding: "clamp(64px, 9vw, 128px) clamp(20px, 6vw, 96px)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Archivo', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes jrtrPulse {
          0%   { transform: scale(1);   opacity: .55; }
          70%  { transform: scale(2.1); opacity: 0; }
          100% { transform: scale(2.1); opacity: 0; }
        }
        .jrtr-pulse { animation: jrtrPulse 3.2s ease-out infinite; transform-origin: center; transform-box: fill-box; }
        @media (prefers-reduced-motion: reduce) {
          .jrtr-pulse { animation: none; opacity: 0; }
          .jrtr-bar { transition: none !important; }
        }
        .jrtr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: ${GOLD_SOFT}; border: 1px solid ${GOLD_SOFT}; }
        @media (max-width: 880px) { .jrtr-grid { grid-template-columns: repeat(2, 1fr); } }
        .jrtr-cols { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(32px, 5vw, 72px); align-items: start; margin-top: clamp(48px, 7vw, 88px); }
        @media (max-width: 980px) { .jrtr-cols { grid-template-columns: 1fr; } }
        #track-record g:focus-visible circle { stroke-width: 2.2; }
      `}</style>

      {/* eyebrow + headline */}
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <span style={{ width: 36, height: 1, background: GOLD, display: "inline-block" }} />
          <span style={{ fontSize: 11.5, letterSpacing: "0.32em", textTransform: "uppercase", color: GOLD }}>
            Track Record — Verified Numbers
          </span>
        </div>
        <h2
          style={{
            fontFamily: "'Bodoni Moda', 'Bodoni 72', Didot, serif",
            fontWeight: 500,
            fontSize: "clamp(34px, 4.6vw, 62px)",
            lineHeight: 1.08,
            margin: 0,
            maxWidth: 820,
          }}
        >
          We don't claim experience.
          <br />
          <em style={{ color: GOLD, fontStyle: "italic" }}>We count it.</em>
        </h2>
        <p style={{ color: MUTED, maxWidth: 560, fontSize: 15.5, lineHeight: 1.65, marginTop: 20 }}>
          Every figure below comes straight from our books — real job sites, real cities, real invoices.
          Updated from our internal systems, not a marketing department.
        </p>

        {/* ------- counters ------- */}
        <div ref={statsRef} className="jrtr-grid" style={{ marginTop: "clamp(40px, 6vw, 72px)" }}>
          {STATS.map((s) => (
            <div key={s.key} style={{ background: INK, padding: "clamp(22px, 3vw, 36px)" }}>
              <div
                style={{
                  fontFamily: "'Bodoni Moda', 'Bodoni 72', Didot, serif",
                  fontSize: "clamp(38px, 4.2vw, 58px)",
                  color: GOLD,
                  lineHeight: 1,
                }}
              >
                <Counter end={s.end} prefix={s.prefix} suffix={s.suffix} run={statsInView} />
              </div>
              <div style={{ marginTop: 12, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ------- map + chart ------- */}
        <div className="jrtr-cols">
          {/* map */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.28em", textTransform: "uppercase", color: GOLD, marginBottom: 14 }}>
              Where we've built — 52 cities
            </div>
            <div style={{ position: "relative", border: `1px solid ${GOLD_SOFT}`, padding: 8 }}>
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: "block" }}>
                {/* drafting grid */}
                <defs>
                  <pattern id="jrtr-grid-p" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke={GOLD_SOFT} strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width={MAP_W} height={MAP_H} fill="url(#jrtr-grid-p)" />
                {/* coastline hint — Pacific edge + bay, dashed survey line */}
                <path
                  d="M 60 0 L 64 90 L 86 200 L 96 300 L 70 420 L 92 540 L 110 620"
                  fill="none" stroke={GOLD} strokeWidth="0.8" strokeDasharray="5 7" opacity="0.4"
                />
                <path
                  d="M 210 0 L 196 70 L 232 150 L 252 230 L 300 290 L 350 330 L 408 300 L 452 250"
                  fill="none" stroke={GOLD} strokeWidth="0.8" strokeDasharray="5 7" opacity="0.4"
                />
                <text x="32" y="600" fontSize="9.5" fill={MUTED} letterSpacing="0.3em" transform="rotate(-90 32 600)" fontFamily="'Archivo', system-ui, sans-serif">
                  PACIFIC OCEAN
                </text>
                <text x="330" y="208" fontSize="9.5" fill={MUTED} letterSpacing="0.3em" fontFamily="'Archivo', system-ui, sans-serif">
                  SF BAY
                </text>
                {CITIES.map((c) => (
                  <CityPin
                    key={c.city}
                    c={c}
                    maxProjects={maxProjects}
                    active={tip && tip.city === c.city}
                    onEnter={(city, x, y) => setTip({ ...city, x, y })}
                    onLeave={() => setTip(null)}
                  />
                ))}
              </svg>
              {/* tooltip */}
              {tip && (
                <div
                  style={{
                    position: "absolute",
                    left: `calc(${((tip.x + 8) / MAP_W) * 100}% )`,
                    top: `calc(${(tip.y / MAP_H) * 100}% - 14px)`,
                    transform: "translateY(-100%)",
                    background: "rgba(10,10,8,0.95)",
                    border: `1px solid ${GOLD}`,
                    padding: "8px 12px",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>{tip.city}</div>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 19, color: GOLD, marginTop: 2 }}>
                    {tip.projects} project{tip.projects > 1 ? "s" : ""}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
              Pin size = projects completed per city. Aggregated by city — client locations stay private.
            </div>
          </div>

          {/* chart */}
          <div ref={chartRef}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.28em", textTransform: "uppercase", color: GOLD, marginBottom: 14 }}>
              Cumulative projects completed
            </div>
            <div style={{ border: `1px solid ${GOLD_SOFT}`, padding: "18px 12px 8px" }}>
              <GrowthChart run={chartInView} />
            </div>
            <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.7, marginTop: 22, maxWidth: 460 }}>
              From 9 job sites in our first season to 533 today. The market is full of good salespeople —
              what's rare is consistent execution, project after project, city after city. That consistency
              is the only marketing on this page.
            </p>
            <a
              href="#/contact"
              style={{
                display: "inline-block",
                marginTop: 26,
                padding: "14px 30px",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontSize: 12.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Become project No. 534
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
