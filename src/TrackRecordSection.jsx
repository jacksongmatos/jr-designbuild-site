// =============================================================================
// JR DESIGN BUILD — TRACK RECORD EXPERIENCE (FULL)
// -----------------------------------------------------------------------------
// All 10 QuickBooks-derived modules, adapted for PUBLIC website display.
// Palette: Black + Gold | Type: Bodoni Moda (display) + Archivo (body)
// Aesthetic: "blueprint vivo" — survey markers, hairline grids, gold ink.
//
// DATA SOURCE: QuickBooks Online, extracted 2026-06-11.
// Public-safety rules applied:
//   • No client names or street addresses (city-level only)
//   • No AR/receivables, margins, or internal financials
//   • Internal metrics reframed as client-facing trust signals
//
// MODULES (maps to the 10-item analysis):
//   1  ProjectTimelines   — multi-year project lifespans (anonymized Gantt)
//   2  EstimateFunnel     — real win rate, published openly
//   3  TicketTrend        — average project value by year
//   4  CityMap            — 52 cities, pin size = projects
//   5  TrustGrid card     — milestone billing (AR reframed as pay-as-we-build)
//   6  TrustGrid card     — longest engagements (repeat/longevity)
//   7  TrustGrid card     — 56 consecutive months on job sites
//   8  TrustGrid card     — diversification (concentration reframed)
//   9  ServiceMix         — what we build, by billing-line scope
//   10 LivePulseBar       — live operation badge (Supabase-ready)
//
// LIVE DATA: every constant below has a matching column in the planned
// Supabase view `site_track_record` (fed by the QBO→Worker cron). Swap the
// constants for a fetch in useEffect when the pipeline is live.
//
// Usage: <TrackRecordExperience />  — default export, no required props.
// =============================================================================

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------- tokens ----
const GOLD = "#C9A227";
const GOLD_SOFT = "rgba(201,162,39,0.16)";
const GOLD_FAINT = "rgba(201,162,39,0.08)";
const INK = "#0A0A08";
const INK_2 = "#111110";
const PAPER = "#EDE6D6";
const MUTED = "#8A8578";
const SERIF = "'Bodoni Moda', 'Bodoni 72', Didot, serif";
const SANS = "'Archivo', system-ui, sans-serif";

// ------------------------------------------------------------------ data ----
const LIVE = {
  activeProjects: 36,
  spanningYears: 31, // projects that crossed 2025 → 2026
  lastUpdated: "June 2026",
};

const STATS = [
  { key: "projects", end: 533, suffix: "+", label: "Projects Completed", sub: "Unique job sites since 2021" },
  { key: "cities", end: 52, suffix: "", label: "Bay Area Cities", sub: "From Half Moon Bay to Danville" },
  { key: "delivered", end: 18, prefix: "$", suffix: "M+", label: "Work Delivered", sub: "Invoiced & built — not promised" },
  { key: "months", end: 56, suffix: "", label: "Months Without a Pause", sub: "Active job sites every single month" },
];

const GROWTH = [
  { year: "2021", value: 9 },
  { year: "2022", value: 98 },
  { year: "2023", value: 259 },
  { year: "2024", value: 424 },
  { year: "2025", value: 517 },
  { year: "2026", value: 533, ytd: true },
];

// (1) Anonymized lifespans — city + duration + scale band. No addresses.
const TIMELINES = [
  { label: "Whole-home design-build · San Ramon", start: "2024-05", end: "2026-05", months: 25, milestones: 29, band: "$600k+", active: true },
  { label: "Major remodel · South San Francisco", start: "2024-07", end: "2025-12", months: 16, milestones: 12, band: "$700k+", active: false },
  { label: "Full renovation · San Mateo", start: "2024-12", end: "2026-04", months: 16, milestones: 6, band: "$500k+", active: true },
  { label: "Multi-phase remodel · San Francisco", start: "2024-08", end: "2026-06", months: 22, milestones: 39, band: "$450k+", active: true },
  { label: "Design-build project · San Jose", start: "2024-05", end: "2026-04", months: 24, milestones: 8, band: "$450k+", active: true },
  { label: "Home transformation · Daly City", start: "2024-02", end: "2026-03", months: 25, milestones: 37, band: "$400k+", active: true },
  { label: "Multi-phase remodel · San Francisco", start: "2024-12", end: "2026-06", months: 18, milestones: 25, band: "$400k+", active: true },
  { label: "Estate remodel · Millbrae", start: "2023-08", end: "2026-02", months: 30, milestones: 20, band: "$400k+", active: false },
  { label: "Full renovation · San Jose", start: "2025-01", end: "2026-04", months: 15, milestones: 10, band: "$350k+", active: true },
  { label: "Major remodel · San Mateo", start: "2024-02", end: "2025-04", months: 14, milestones: 26, band: "$340k+", active: false },
];
const TL_MIN = "2023-07";
const TL_MAX = "2026-07";

// (2) Estimate funnel — published win rate
const FUNNEL = {
  estimates: 1000,
  estimatedValue: 49.5, // $M
  won: 416, // converted + accepted
  winRate: 42, // %
  built: 533,
};

// (3) Average project value by start year
const TICKET = [
  { year: "2022", avg: 26 },
  { year: "2023", avg: 23 },
  { year: "2024", avg: 48 },
  { year: "2025", avg: 40 },
];

// (9) Service mix — billing lines touching each scope (normalized to max)
const SERVICES = [
  { name: "Windows & doors", count: 851 },
  { name: "Permits, architecture & engineering", count: 635 },
  { name: "Painting & finishes", count: 610 },
  { name: "Bathrooms", count: 590 },
  { name: "Flooring", count: 539 },
  { name: "Electrical", count: 495 },
  { name: "Decks, exterior & landscape", count: 493 },
  { name: "Kitchens", count: 434 },
  { name: "Additions & structural", count: 407 },
  { name: "Plumbing", count: 359 },
  { name: "Roofing", count: 347 },
  { name: "ADUs", count: 32 },
];

// (4) City pins — aggregated, no client addresses
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

// (5)(6)(7)(8) Trust grid — internal metrics reframed as client promises
const TRUST = [
  {
    icon: "◔",
    title: "You pay as we build",
    big: "7+ milestones",
    body: "Large projects are billed in phases tied to completed work — an average of 7+ payment milestones per project. No big deposits, no paying ahead of progress.",
  },
  {
    icon: "∞",
    title: "Relationships measured in years",
    big: "46 months",
    body: "Our longest client engagement spans nearly 4 years across multiple phases. When the first project ends well, the second one usually follows.",
  },
  {
    icon: "▦",
    title: "Never an idle month",
    big: "56 / 56",
    body: "Every single month since November 2021 has had active job sites. Through winters, rate hikes, and slow seasons — the crews never stopped.",
  },
  {
    icon: "◈",
    title: "No single project carries us",
    big: "533 projects",
    body: "Our revenue is spread across hundreds of jobs — no client is ever 'too small' and no single project decides whether we survive. That stability protects yours.",
  },
];

// ---------------------------------------------------------------- helpers ---
const BOUNDS = { minLng: -122.62, maxLng: -121.7, minLat: 37.2, maxLat: 38.07 };
const MAP_W = 560;
const MAP_H = 620;

function project(lat, lng) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W;
  const y = MAP_H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H;
  return { x, y };
}
const pinRadius = (p) => 3.5 + Math.sqrt(p) * 1.25;

function monthIndex(ym) {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}
function tlPct(ym) {
  const a = monthIndex(TL_MIN);
  const b = monthIndex(TL_MAX);
  return ((monthIndex(ym) - a) / (b - a)) * 100;
}

function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Counter({ end, prefix = "", suffix = "", run, decimals = 0 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduceMotion()) return setVal(end);
    const dur = 1600;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, end]);
  const shown = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-US");
  return (
    <span>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}

const Eyebrow = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
    <span style={{ width: 36, height: 1, background: GOLD, display: "inline-block" }} />
    <span style={{ fontSize: 11.5, letterSpacing: "0.32em", textTransform: "uppercase", color: GOLD, fontFamily: SANS }}>
      {children}
    </span>
  </div>
);

const SectionShell = ({ children, alt = false, id }) => (
  <div id={id} style={{ background: alt ? INK_2 : INK, padding: "clamp(56px, 8vw, 110px) clamp(20px, 6vw, 96px)" }}>
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>{children}</div>
  </div>
);

// ===================================================================
// (10) LIVE PULSE BAR — live operation badge
// ===================================================================
function LivePulseBar() {
  // TODO LIVE: fetch from Supabase view `site_track_record` (QBO→Worker cron)
  return (
    <div
      style={{
        background: INK_2,
        borderTop: `1px solid ${GOLD_SOFT}`,
        borderBottom: `1px solid ${GOLD_SOFT}`,
        padding: "14px clamp(20px, 6vw, 96px)",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px 34px",
          fontSize: 12.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: PAPER,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <span className="jrtr-livedot" aria-hidden="true" />
          <strong style={{ fontWeight: 600, color: GOLD }}>{LIVE.activeProjects} active projects</strong>
          <span style={{ color: MUTED }}>right now</span>
        </span>
        <span style={{ color: MUTED }}>
          {LIVE.spanningYears} projects carried from 2025 into 2026
        </span>
        <span style={{ color: MUTED, marginLeft: "auto" }}>Live from our books · {LIVE.lastUpdated}</span>
      </div>
    </div>
  );
}

// ===================================================================
// HERO COUNTERS (headline numbers)
// ===================================================================
function StatCounters() {
  const [ref, inView] = useInView();
  return (
    <SectionShell id="tr-numbers">
      <Eyebrow>Track record — verified numbers</Eyebrow>
      <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(34px, 4.6vw, 62px)", lineHeight: 1.08, margin: 0, maxWidth: 860, color: PAPER }}>
        We don't claim experience.
        <br />
        <em style={{ color: GOLD, fontStyle: "italic" }}>We count it.</em>
      </h2>
      <p style={{ color: MUTED, maxWidth: 580, fontSize: 15.5, lineHeight: 1.65, marginTop: 20, fontFamily: SANS }}>
        Every figure on this page comes straight from our books — real job sites, real cities, real invoices.
        Pulled from our internal systems, not written by a marketing department.
      </p>
      <div ref={ref} className="jrtr-grid4" style={{ marginTop: "clamp(40px, 6vw, 64px)" }}>
        {STATS.map((s) => (
          <div key={s.key} style={{ background: INK, padding: "clamp(22px, 3vw, 36px)" }}>
            <div style={{ fontFamily: SERIF, fontSize: "clamp(38px, 4.2vw, 58px)", color: GOLD, lineHeight: 1 }}>
              <Counter end={s.end} prefix={s.prefix} suffix={s.suffix} run={inView} />
            </div>
            <div style={{ marginTop: 12, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: PAPER, fontFamily: SANS }}>{s.label}</div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: MUTED, lineHeight: 1.5, fontFamily: SANS }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (4) CITY MAP + cumulative growth
// ===================================================================
function CityPin({ c, active, onEnter, onLeave }) {
  const { x, y } = project(c.lat, c.lng);
  const r = pinRadius(c.projects);
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
      <line x1={-r - 5} x2={-r - 1.5} y1="0" y2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line x1={r + 1.5} x2={r + 5} y1="0" y2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line y1={-r - 5} y2={-r - 1.5} x1="0" x2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      <line y1={r + 1.5} y2={r + 5} x1="0" x2="0" stroke={GOLD} strokeWidth="0.7" opacity="0.55" />
      {c.projects >= 15 && <circle className="jrtr-pulse" r={r} fill="none" stroke={GOLD} strokeWidth="1" />}
      <circle r={r} fill={active ? GOLD : "rgba(201,162,39,0.14)"} stroke={GOLD} strokeWidth={active ? 1.6 : 1} style={{ transition: "fill 200ms ease" }} />
      <circle r="1.4" fill={GOLD} />
      {c.projects >= 30 && (
        <text x={r + 9} y="3.5" fontSize="10.5" fill={active ? PAPER : MUTED} fontFamily={SANS} letterSpacing="0.08em" style={{ textTransform: "uppercase", transition: "fill 200ms ease" }}>
          {c.city}
        </text>
      )}
      <title>{`${c.city} — ${c.projects} project${c.projects > 1 ? "s" : ""}`}</title>
    </g>
  );
}

function GrowthChart({ run }) {
  const W = 560, H = 230;
  const PAD = { l: 44, r: 16, t: 18, b: 30 };
  const max = 560;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const step = innerW / GROWTH.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative projects completed, 2021 to 2026: 9 to 533" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.t + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke={GOLD_SOFT} strokeWidth="0.6" />
            <text x={PAD.l - 8} y={y + 3.5} fontSize="9.5" fill={MUTED} textAnchor="end" fontFamily={SANS}>
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
              x={x - barW / 2}
              y={run ? y : PAD.t + innerH}
              width={barW}
              height={run ? h : 0}
              fill="rgba(201,162,39,0.18)"
              stroke={GOLD}
              strokeWidth="1"
              style={{ transition: `y 900ms cubic-bezier(.2,.8,.2,1) ${i * 110}ms, height 900ms cubic-bezier(.2,.8,.2,1) ${i * 110}ms` }}
            />
            <text x={x} y={y - 7} fontSize="11" fill={PAPER} textAnchor="middle" fontFamily={SANS} opacity={run ? 1 : 0} style={{ transition: `opacity 500ms ease ${600 + i * 110}ms` }}>
              {g.value}
            </text>
            <text x={x} y={H - 10} fontSize="10" fill={MUTED} textAnchor="middle" fontFamily={SANS} letterSpacing="0.06em">
              {g.year}
              {g.ytd ? "*" : ""}
            </text>
          </g>
        );
      })}
      <text x={W - PAD.r} y={H - 10} fontSize="8.5" fill={MUTED} textAnchor="end" fontFamily={SANS}>
        *YTD
      </text>
    </svg>
  );
}

function MapAndGrowth() {
  const [tip, setTip] = useState(null);
  const [chartRef, chartInView] = useInView();
  return (
    <SectionShell id="tr-map" alt>
      <div className="jrtr-cols">
        <div style={{ position: "relative" }}>
          <Eyebrow>Where we've built — 52 cities</Eyebrow>
          <div style={{ position: "relative", border: `1px solid ${GOLD_SOFT}`, padding: 8 }}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: "block" }}>
              <defs>
                <pattern id="jrtr-gp" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke={GOLD_SOFT} strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={MAP_W} height={MAP_H} fill="url(#jrtr-gp)" />
              <path d="M 60 0 L 64 90 L 86 200 L 96 300 L 70 420 L 92 540 L 110 620" fill="none" stroke={GOLD} strokeWidth="0.8" strokeDasharray="5 7" opacity="0.4" />
              <path d="M 210 0 L 196 70 L 232 150 L 252 230 L 300 290 L 350 330 L 408 300 L 452 250" fill="none" stroke={GOLD} strokeWidth="0.8" strokeDasharray="5 7" opacity="0.4" />
              <text x="32" y="600" fontSize="9.5" fill={MUTED} letterSpacing="0.3em" transform="rotate(-90 32 600)" fontFamily={SANS}>PACIFIC OCEAN</text>
              <text x="330" y="208" fontSize="9.5" fill={MUTED} letterSpacing="0.3em" fontFamily={SANS}>SF BAY</text>
              {CITIES.map((c) => (
                <CityPin key={c.city} c={c} active={tip && tip.city === c.city} onEnter={(city, x, y) => setTip({ ...city, x, y })} onLeave={() => setTip(null)} />
              ))}
            </svg>
            {tip && (
              <div
                style={{
                  position: "absolute",
                  left: `calc(${((tip.x + 8) / MAP_W) * 100}%)`,
                  top: `calc(${(tip.y / MAP_H) * 100}% - 14px)`,
                  transform: "translateY(-100%)",
                  background: "rgba(10,10,8,0.95)",
                  border: `1px solid ${GOLD}`,
                  padding: "8px 12px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 2,
                  fontFamily: SANS,
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: PAPER }}>{tip.city}</div>
                <div style={{ fontFamily: SERIF, fontSize: 19, color: GOLD, marginTop: 2 }}>
                  {tip.projects} project{tip.projects > 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.6, fontFamily: SANS }}>
            Pin size = projects completed per city. Aggregated by city — client locations stay private.
          </div>
        </div>
        <div ref={chartRef}>
          <Eyebrow>Cumulative projects completed</Eyebrow>
          <div style={{ border: `1px solid ${GOLD_SOFT}`, padding: "18px 12px 8px" }}>
            <GrowthChart run={chartInView} />
          </div>
          <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.7, marginTop: 22, maxWidth: 460, fontFamily: SANS }}>
            From 9 job sites in our first season to 533 today. The market is full of good salespeople —
            what's rare is consistent execution, project after project, city after city.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (1) PROJECT TIMELINES — multi-year lifespans, anonymized
// ===================================================================
function ProjectTimelines() {
  const [ref, inView] = useInView(0.15);
  const yearMarks = ["2024-01", "2025-01", "2026-01"];
  return (
    <SectionShell id="tr-timelines">
      <Eyebrow>Projects that span years</Eyebrow>
      <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(26px, 3.2vw, 42px)", lineHeight: 1.12, margin: 0, maxWidth: 760, color: PAPER }}>
        Anyone can finish a two-week job.
        <br />
        <em style={{ color: GOLD, fontStyle: "italic" }}>We're trusted with the two-year ones.</em>
      </h3>
      <p style={{ color: MUTED, maxWidth: 600, fontSize: 15, lineHeight: 1.65, marginTop: 16, fontFamily: SANS }}>
        Our ten largest engagements, drawn to scale. Each bar runs from the first billing milestone to the
        latest — gold bars are on active job sites today. Clients identified by city only.
      </p>
      <div ref={ref} style={{ marginTop: 40, border: `1px solid ${GOLD_SOFT}`, padding: "20px clamp(12px, 2vw, 28px) 14px" }}>
        {/* year axis */}
        <div style={{ position: "relative", height: 22, marginLeft: "min(38%, 300px)", fontFamily: SANS }}>
          {yearMarks.map((m) => (
            <span key={m} style={{ position: "absolute", left: `${tlPct(m).toFixed(1)}%`, fontSize: 10.5, color: MUTED, letterSpacing: "0.1em" }}>
              {m.slice(0, 4)}
            </span>
          ))}
        </div>
        {TIMELINES.map((t, i) => {
          const l = tlPct(t.start);
          const w = Math.max(tlPct(t.end) - l, 1.5);
          return (
            <div key={i} className="jrtr-tlrow">
              <div className="jrtr-tllabel">
                <span style={{ color: PAPER, fontSize: 12.5 }}>
                  {t.label}
                  {t.active && (
                    <span style={{ marginLeft: 8, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap" }}>Active</span>
                  )}
                </span>
                <span style={{ color: MUTED, fontSize: 11, display: "block", marginTop: 2 }}>
                  {t.months} months · {t.milestones} milestones · {t.band}
                </span>
              </div>
              <div style={{ flex: 1, position: "relative", height: 38 }}>
                {yearMarks.map((m) => (
                  <span key={m} style={{ position: "absolute", left: `${tlPct(m).toFixed(1)}%`, top: 0, bottom: 0, borderLeft: `1px solid ${GOLD_FAINT}` }} />
                ))}
                <div
                  style={{
                    position: "absolute",
                    left: `${l.toFixed(1)}%`,
                    width: inView ? `${w.toFixed(1)}%` : "0%",
                    top: 12,
                    height: 12,
                    background: t.active ? "rgba(201,162,39,0.55)" : "rgba(201,162,39,0.18)",
                    border: `1px solid ${GOLD}`,
                    transition: `width 900ms cubic-bezier(.2,.8,.2,1) ${i * 90}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (2) ESTIMATE FUNNEL — published win rate
// ===================================================================
function EstimateFunnel() {
  const [ref, inView] = useInView();
  const steps = [
    { n: `${FUNNEL.estimates.toLocaleString("en-US")}+`, label: "Detailed estimates delivered", sub: `$${FUNNEL.estimatedValue}M of work scoped since 2023`, w: 100 },
    { n: FUNNEL.won.toLocaleString("en-US"), label: "Became signed projects", sub: `A real, published ${FUNNEL.winRate}% win rate`, w: 42 },
    { n: `${FUNNEL.built}+`, label: "Built and delivered", sub: "Counting every job site since 2021", w: 42 },
  ];
  return (
    <SectionShell id="tr-funnel" alt>
      <Eyebrow>Our win rate, published</Eyebrow>
      <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(26px, 3.2vw, 42px)", lineHeight: 1.12, margin: 0, maxWidth: 800, color: PAPER }}>
        We don't win every project —
        <em style={{ color: GOLD, fontStyle: "italic" }}> and we'll show you exactly how many we do.</em>
      </h3>
      <p style={{ color: MUTED, maxWidth: 620, fontSize: 15, lineHeight: 1.65, marginTop: 16, fontFamily: SANS }}>
        Most contractors hide this number. We think a 42% win rate against Bay Area competition says more
        than any slogan: 4 out of 10 homeowners who compare us, choose us.
      </p>
      <div ref={ref} style={{ marginTop: 44, display: "grid", gap: 14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
            <div
              style={{
                width: inView ? `${s.w}%` : "0%",
                minWidth: 200,
                maxWidth: "100%",
                background: i === 0 ? GOLD_FAINT : "rgba(201,162,39,0.22)",
                border: `1px solid ${GOLD}`,
                padding: "16px 18px",
                transition: `width 900ms cubic-bezier(.2,.8,.2,1) ${i * 160}ms`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: "2px 12px",
              }}
            >
              <span style={{ fontFamily: SERIF, fontSize: "clamp(24px, 3vw, 38px)", color: GOLD }}>{s.n}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: PAPER }}>{s.label}</span>
              <div style={{ flexBasis: "100%", fontFamily: SANS, fontSize: 12, color: MUTED, marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (3) TICKET TREND — average project value by year
// ===================================================================
function TicketTrend() {
  const [ref, inView] = useInView();
  const max = 52;
  return (
    <SectionShell id="tr-ticket">
      <div className="jrtr-cols">
        <div>
          <Eyebrow>The work keeps getting bigger</Eyebrow>
          <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(26px, 3.2vw, 42px)", lineHeight: 1.12, margin: 0, color: PAPER }}>
            Average project value
            <em style={{ color: GOLD, fontStyle: "italic" }}> nearly doubled</em> since 2022.
          </h3>
          <p style={{ color: MUTED, maxWidth: 520, fontSize: 15, lineHeight: 1.7, marginTop: 18, fontFamily: SANS }}>
            In 2022–23 our average engagement was around $24k — punch lists, single rooms, repairs. In
            2024–25 it grew to ~$44k, with flagship projects in the $400k–$700k range. Homeowners trust us
            with more because we delivered the smaller work first. That's how trust compounds.
          </p>
        </div>
        <div ref={ref}>
          <div style={{ border: `1px solid ${GOLD_SOFT}`, padding: "26px 22px 18px", display: "flex", alignItems: "flex-end", gap: "clamp(14px, 3vw, 32px)", height: 280 }}>
            {TICKET.map((t, i) => (
              <div key={t.year} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", fontFamily: SANS }}>
                <div style={{ textAlign: "center", color: PAPER, fontSize: 13, marginBottom: 8, opacity: inView ? 1 : 0, transition: `opacity 400ms ease ${500 + i * 120}ms` }}>
                  ${t.avg}k
                </div>
                <div
                  style={{
                    height: inView ? `${(t.avg / max) * 100}%` : "0%",
                    background: i >= 2 ? "rgba(201,162,39,0.5)" : "rgba(201,162,39,0.16)",
                    border: `1px solid ${GOLD}`,
                    transition: `height 900ms cubic-bezier(.2,.8,.2,1) ${i * 120}ms`,
                  }}
                />
                <div style={{ textAlign: "center", color: MUTED, fontSize: 11.5, marginTop: 10, letterSpacing: "0.08em" }}>{t.year}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, fontFamily: SANS }}>Average value per project, by year the project started.</div>
        </div>
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (9) SERVICE MIX — what we build
// ===================================================================
function ServiceMix() {
  const [ref, inView] = useInView(0.15);
  const max = Math.max(...SERVICES.map((s) => s.count));
  return (
    <SectionShell id="tr-services" alt>
      <Eyebrow>What we build</Eyebrow>
      <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(26px, 3.2vw, 42px)", lineHeight: 1.12, margin: 0, maxWidth: 760, color: PAPER }}>
        One contract, <em style={{ color: GOLD, fontStyle: "italic" }}>every trade.</em>
      </h3>
      <p style={{ color: MUTED, maxWidth: 600, fontSize: 15, lineHeight: 1.65, marginTop: 16, fontFamily: SANS }}>
        Measured from thousands of real billing lines — not a services menu someone wrote once. The width of
        each bar is how often that scope actually appears in our delivered work.
      </p>
      <div ref={ref} style={{ marginTop: 40, display: "grid", gap: 13, maxWidth: 860 }}>
        {SERVICES.map((s, i) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 280px) 1fr", alignItems: "center", gap: 16, fontFamily: SANS }}>
            <div style={{ fontSize: 13, color: PAPER, letterSpacing: "0.04em" }}>{s.name}</div>
            <div style={{ position: "relative", height: 14 }}>
              <div style={{ position: "absolute", inset: 0, borderBottom: `1px dashed ${GOLD_FAINT}` }} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: inView ? `${(s.count / max) * 100}%` : "0%",
                  background: "rgba(201,162,39,0.3)",
                  borderRight: `2px solid ${GOLD}`,
                  transition: `width 800ms cubic-bezier(.2,.8,.2,1) ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 18, fontFamily: SANS }}>
        Relative frequency of each scope across all billing lines, 2021–2026.
      </div>
    </SectionShell>
  );
}

// ===================================================================
// (5)(6)(7)(8) TRUST GRID — honest numbers, client promises
// ===================================================================
function TrustGrid() {
  const [ref, inView] = useInView(0.2);
  return (
    <SectionShell id="tr-trust">
      <Eyebrow>Four numbers most contractors won't show you</Eyebrow>
      <div ref={ref} className="jrtr-grid4" style={{ marginTop: 36 }}>
        {TRUST.map((t, i) => (
          <div
            key={t.title}
            style={{
              background: INK,
              padding: "clamp(24px, 3vw, 36px)",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 600ms ease ${i * 120}ms, transform 600ms ease ${i * 120}ms`,
            }}
          >
            <div aria-hidden="true" style={{ color: GOLD, fontSize: 22, marginBottom: 14 }}>{t.icon}</div>
            <div style={{ fontFamily: SERIF, fontSize: "clamp(24px, 2.6vw, 34px)", color: GOLD, lineHeight: 1.05 }}>{t.big}</div>
            <div style={{ marginTop: 12, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: PAPER, fontFamily: SANS }}>{t.title}</div>
            <p style={{ marginTop: 10, fontSize: 13, color: MUTED, lineHeight: 1.65, fontFamily: SANS }}>{t.body}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 56, textAlign: "center" }}>
        <a
          href="#/contact"
          style={{
            display: "inline-block",
            padding: "16px 38px",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: 12.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textDecoration: "none",
            fontFamily: SANS,
          }}
        >
          Become project No. 534
        </a>
      </div>
    </SectionShell>
  );
}

// ===================================================================
// ROOT — composes all 10 modules
// ===================================================================
export default function TrackRecordExperience() {
  return (
    <section id="track-record" style={{ background: INK, color: PAPER, fontFamily: SANS }}>
      <style>{`
        @keyframes jrtrPulse { 0% { transform: scale(1); opacity: .55; } 70%,100% { transform: scale(2.1); opacity: 0; } }
        .jrtr-pulse { animation: jrtrPulse 3.2s ease-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes jrtrDot { 0%,100% { box-shadow: 0 0 0 0 rgba(201,162,39,.5); } 50% { box-shadow: 0 0 0 6px rgba(201,162,39,0); } }
        .jrtr-livedot { width: 8px; height: 8px; border-radius: 50%; background: ${GOLD}; display: inline-block; animation: jrtrDot 2.2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .jrtr-pulse, .jrtr-livedot { animation: none; }
          .jrtr-pulse { opacity: 0; }
        }
        .jrtr-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: ${GOLD_SOFT}; border: 1px solid ${GOLD_SOFT}; }
        @media (max-width: 880px) { .jrtr-grid4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .jrtr-grid4 { grid-template-columns: 1fr; } }
        .jrtr-cols { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(32px, 5vw, 72px); align-items: start; }
        @media (max-width: 980px) { .jrtr-cols { grid-template-columns: 1fr; } }
        .jrtr-tlrow { display: flex; align-items: center; gap: 14px; padding: 7px 0; border-top: 1px solid ${GOLD_FAINT}; }
        .jrtr-tllabel { width: min(38%, 300px); flex: none; font-family: ${SANS}; }
        @media (max-width: 720px) {
          .jrtr-tlrow { flex-direction: column; align-items: stretch; gap: 6px; }
          .jrtr-tllabel { width: 100%; }
        }
        #track-record a:focus-visible, #track-record g:focus-visible circle { outline: 2px solid ${GOLD}; outline-offset: 3px; }
      `}</style>
      <LivePulseBar />
      <StatCounters />
      <MapAndGrowth />
      <ProjectTimelines />
      <EstimateFunnel />
      <TicketTrend />
      <ServiceMix />
      <TrustGrid />
    </section>
  );
}
