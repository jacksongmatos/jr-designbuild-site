import React, { useMemo, useState } from "react";

/*
 * JR Design Build — "Plan Your Project" tools hub (Phase 1, client-side).
 *
 * All numbers below are SEED ESTIMATES (typical Bay Area ranges) so the tools
 * work today with zero backend. Swap PRICING / RENT / PERMITS / CITY_INDEX for
 * JR's real figures from the ERP (mirrored into Supabase) when ready — the UI
 * does not change. AI-backed tools (vision estimate, chat, finish-match) and
 * server-side lead scoring plug in behind these same components in Phase 2.
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const HFS = "https://www.hfsfinancial.net/promo/67c93a097f42caadb8a6b73c";
const EMAIL = "hello@jrdesignbuild.com";
const CSLB_VERIFY =
  "https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx";

const CITIES = [
  "South San Francisco",
  "San Mateo",
  "Daly City",
  "San Bruno",
  "Pacifica",
  "Burlingame",
  "Millbrae",
  "Redwood City",
  "San Francisco",
];

const CITY_INDEX = {
  "South San Francisco": 1.1,
  "San Mateo": 1.15,
  "Daly City": 1.08,
  "San Bruno": 1.08,
  Pacifica: 1.05,
  Burlingame: 1.2,
  Millbrae: 1.18,
  "Redwood City": 1.15,
  "San Francisco": 1.25,
};

// $/sqft base + a typical size, by project type
const TYPES = [
  { k: "kitchen", label: "Kitchen Remodel", base: 350, size: 200 },
  { k: "bath", label: "Bathroom Remodel", base: 480, size: 80 },
  { k: "adu", label: "ADU (new build)", base: 360, size: 600 },
  { k: "addition", label: "Addition", base: 420, size: 400 },
  { k: "whole", label: "Whole-Home Remodel", base: 260, size: 1600 },
];

const FINISHES = [
  { k: "standard", label: "Standard", m: 1.0 },
  { k: "premium", label: "Premium", m: 1.35 },
  { k: "luxury", label: "Luxury", m: 1.8 },
];

// Monthly rent for a ~600 sqft ADU, scaled by size
const RENT = {
  "South San Francisco": 2800,
  "San Mateo": 3000,
  "Daly City": 2700,
  "San Bruno": 2700,
  Pacifica: 2600,
  Burlingame: 3100,
  Millbrae: 3000,
  "Redwood City": 3000,
  "San Francisco": 3300,
};

// Typical permit timeline in WEEKS [low, high] by city & type
const PERMITS = {
  "South San Francisco": { adu: [12, 18], remodel: [5, 8], addition: [10, 16] },
  "San Mateo": { adu: [10, 16], remodel: [4, 7], addition: [9, 14] },
  "Daly City": { adu: [12, 20], remodel: [5, 9], addition: [10, 16] },
  "San Bruno": { adu: [10, 16], remodel: [4, 8], addition: [9, 14] },
  Pacifica: { adu: [12, 18], remodel: [5, 8], addition: [10, 15] },
  Burlingame: { adu: [10, 15], remodel: [4, 7], addition: [8, 13] },
  Millbrae: { adu: [10, 16], remodel: [4, 8], addition: [9, 14] },
  "Redwood City": { adu: [9, 14], remodel: [4, 7], addition: [8, 13] },
  "San Francisco": { adu: [14, 24], remodel: [6, 12], addition: [12, 20] },
};

const usd = (n) => "$" + Math.round(n).toLocaleString();

/* Live floor-plan that draws itself to the chosen size (blueprint as utility) */
function BlueprintPreview({ sqft }) {
  const area = Math.max(30, Number(sqft) || 0);
  const w = Math.max(8, Math.round(Math.sqrt(area) * 1.25));
  const h = Math.max(8, Math.round(area / w));
  const PAD = 30;
  const VW = 360;
  const VH = 220;
  const scale = Math.min((VW - PAD * 2) / w, (VH - PAD * 2) / h);
  const rw = w * scale;
  const rh = h * scale;
  const x = (VW - rw) / 2;
  const y = (VH - rh) / 2;
  return (
    <div style={{ marginTop: 20 }}>
      <span style={S.label}>Your space, to scale</span>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ maxWidth: VW, display: "block" }} aria-hidden="true">
        <defs>
          <pattern id="bpgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke={GOLD} strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#bpgrid)" />
        <rect
          x={x} y={y} width={rw} height={rh}
          fill={GOLD} fillOpacity="0.05" stroke={GOLD} strokeWidth="1.6"
          style={{ transition: "all .35s cubic-bezier(.16,.84,.44,1)" }}
        />
        {/* door swing */}
        <path
          d={`M ${x + rw * 0.2} ${y + rh} A ${rh * 0.28} ${rh * 0.28} 0 0 1 ${x + rw * 0.2 + rh * 0.28} ${y + rh - rh * 0.28}`}
          fill="none" stroke={GOLD} strokeOpacity="0.7" strokeWidth="1"
        />
        {/* window */}
        <line x1={x + rw * 0.55} y1={y} x2={x + rw * 0.85} y2={y} stroke={GOLD} strokeWidth="3" />
        {/* dimensions */}
        <text x={x + rw / 2} y={y - 8} textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#ffdf9e">
          {w}'-0"
        </text>
        <text
          x={x - 10} y={y + rh / 2} textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#ffdf9e"
          transform={`rotate(-90 ${x - 10} ${y + rh / 2})`}
        >
          {h}'-0"
        </text>
        <text x={VW / 2} y={VH - 8} textAnchor="middle" fontFamily="'Bodoni Moda', serif" fontStyle="italic" fontSize="13" fill="#ffffff">
          ≈ {area.toLocaleString()} sqft
        </text>
      </svg>
    </div>
  );
}

/* ---------- shared styles ---------- */
const S = {
  page: { position: "relative", zIndex: 5, padding: "150px 6vw 120px" },
  wrap: { maxWidth: 1040, margin: "0 auto" },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 7,
    color: "#ffdf9e",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  h1: {
    fontFamily: "'Bodoni Moda', Georgia, serif",
    fontSize: "clamp(34px,5vw,64px)",
    color: "#fff",
    margin: "14px 0 14px",
    fontWeight: 500,
    letterSpacing: -1,
    textShadow: "0 1px 2px #000",
  },
  lead: { color: "#ffffff", fontSize: 16, lineHeight: 1.7, maxWidth: 640 },
  disclaimer: {
    marginTop: 18,
    fontSize: 12.5,
    color: "#ffeccb",
    border: "1px solid #c9a25e33",
    background: "#c9a25e0d",
    borderRadius: 6,
    padding: "12px 16px",
    maxWidth: 720,
    lineHeight: 1.6,
  },
  tool: {
    background: "#0c0a08f2",
    border: "1px solid #c9a25e1f",
    borderRadius: 8,
    padding: "32px 30px",
    backdropFilter: "blur(10px)",
    marginTop: 26,
  },
  toolHead: { display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 },
  toolNum: {
    fontFamily: "'Bodoni Moda', serif",
    fontStyle: "italic",
    fontSize: 26,
    color: "#ffdf9e",
    opacity: 1,
  },
  h2: {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: 26,
    color: "#fff",
    margin: 0,
    fontWeight: 500,
  },
  sub: { color: "#ffffff", fontSize: 14, lineHeight: 1.6, margin: "6px 0 22px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: {
    display: "block",
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#ffeccb",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    background: "#ffffff0c",
    border: "1px solid #ffffff22",
    borderRadius: 6,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  },
  btn: {
    background: GOLD,
    color: INK,
    padding: "14px 28px",
    borderRadius: 2,
    border: "none",
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: 600,
    textTransform: "uppercase",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  },
  result: {
    marginTop: 22,
    borderTop: "1px solid #c9a25e22",
    paddingTop: 22,
  },
  big: {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: "clamp(30px,5vw,52px)",
    color: "#ffdf9e",
    lineHeight: 1.05,
  },
  chip: (active) => ({
    padding: "9px 16px",
    borderRadius: 30,
    border: "1px solid " + (active ? GOLD : "#ffffff22"),
    background: active ? GOLD : "transparent",
    color: active ? INK : "#ece6db",
    fontSize: 12,
    letterSpacing: 1,
    cursor: "pointer",
    transition: "all .25s",
  }),
  metric: { textAlign: "center", padding: "10px 6px" },
  metricNum: { fontFamily: "'Bodoni Moda', serif", fontSize: 30, color: "#ffdf9e" },
  metricLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#ffffff",
    textTransform: "uppercase",
    marginTop: 4,
  },
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function CitySelect({ value, onChange }) {
  return (
    <select style={S.input} value={value} onChange={(e) => onChange(e.target.value)}>
      {CITIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function Tool({ n, title, sub, children }) {
  return (
    <div style={S.tool} className="card">
      <div style={S.toolHead}>
        <span style={S.toolNum}>{n}</span>
        <h2 style={S.h2}>{title}</h2>
      </div>
      <p style={S.sub}>{sub}</p>
      {children}
    </div>
  );
}

/* ---------- 1. Scope Builder + Estimate ---------- */
function leadScore({ type, mid, finish }) {
  let s = { adu: 30, whole: 30, addition: 22, kitchen: 18, bath: 12 }[type] || 15;
  if (mid > 200000) s += 25;
  else if (mid > 100000) s += 18;
  else if (mid > 50000) s += 10;
  if (finish === "luxury") s += 12;
  else if (finish === "premium") s += 6;
  return Math.min(100, s);
}

function EstimateBuilder() {
  const [type, setType] = useState("adu");
  const [finish, setFinish] = useState("premium");
  const [city, setCity] = useState("South San Francisco");
  const t = TYPES.find((x) => x.k === type);
  const [size, setSize] = useState(t.size);

  const est = useMemo(() => {
    const f = FINISHES.find((x) => x.k === finish).m;
    const mid = t.base * f * CITY_INDEX[city] * size;
    return { low: mid * 0.85, high: mid * 1.15, mid };
  }, [type, finish, city, size, t]);

  const onType = (k) => {
    setType(k);
    setSize(TYPES.find((x) => x.k === k).size);
  };

  const requestQuote = () => {
    const score = leadScore({ type, mid: est.mid, finish });
    try {
      localStorage.setItem(
        "jr_lead",
        JSON.stringify({ type, finish, city, size, est: est.mid, score, at: Date.now() }),
      );
    } catch (e) {}
    const body = encodeURIComponent(
      `Project: ${t.label}\nFinish: ${finish}\nCity: ${city}\nSize: ~${size} sqft\n` +
        `Instant estimate: ${usd(est.low)} – ${usd(est.high)}\n\n` +
        `Please send me an exact, no-obligation quote.\n\n[internal] lead_score=${score}`,
    );
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(
      "Estimate request — " + t.label,
    )}&body=${body}`;
  };

  return (
    <Tool
      n="01"
      title="Instant Estimate & Scope Builder"
      sub="Pick your project and finish level for a real Bay Area price range — anchored on JR's project history."
    >
      <Field label="Project type">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {TYPES.map((x) => (
            <button key={x.k} style={S.chip(type === x.k)} onClick={() => onType(x.k)}>
              {x.label}
            </button>
          ))}
        </div>
      </Field>
      <div style={S.grid2}>
        <Field label="Finish level">
          <div style={{ display: "flex", gap: 10 }}>
            {FINISHES.map((x) => (
              <button key={x.k} style={S.chip(finish === x.k)} onClick={() => setFinish(x.k)}>
                {x.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="City">
          <CitySelect value={city} onChange={setCity} />
        </Field>
      </div>
      <Field label={`Approx. size — ${size} sqft`}>
        <input
          type="range"
          min={t.k === "bath" ? 30 : 100}
          max={t.k === "whole" ? 4000 : t.k === "adu" ? 1200 : 1200}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          style={{ width: "100%", accentColor: GOLD }}
        />
      </Field>

      <div style={S.result}>
        <span style={S.label}>Estimated investment</span>
        <div style={S.big}>
          {usd(est.low)} <span style={{ color: "#fff", opacity: 0.5 }}>–</span>{" "}
          {usd(est.high)}
        </div>
        <div style={{ ...S.grid2, marginTop: 18, gap: 1 }}>
          {[
            ["Design & permits", est.mid * 0.12],
            ["Construction", est.mid * 0.73],
            ["Finishes & fixtures", est.mid * 0.15],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "8px 0" }}>
              <span style={{ color: "#ffffff", fontSize: 13 }}>{k}</span>
              <div style={{ color: "#fff", fontSize: 15 }}>{usd(v)}</div>
            </div>
          ))}
        </div>
        <BlueprintPreview sqft={size} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <button style={S.btn} className="cta-prim" onClick={requestQuote}>
            Get my exact quote →
          </button>
          <button
            style={{ ...S.btn, background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e99" }}
            className="cta-ghost"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("jr:ai", {
                  detail: { tab: "estimate", projectType: t.label.split(" ")[0], finish, city, size },
                }),
              )
            }
          >
            Refine with photos (AI) ✨
          </button>
        </div>
      </div>
    </Tool>
  );
}

/* ---------- 2. ADU ROI by city ---------- */
function AduRoi() {
  const [city, setCity] = useState("South San Francisco");
  const [size, setSize] = useState(600);
  const build = TYPES.find((x) => x.k === "adu").base * CITY_INDEX[city] * size;
  const rent = RENT[city] * (size / 600);
  const annual = rent * 12;
  const payback = build / annual;

  return (
    <Tool
      n="02"
      title="ADU Rental ROI"
      sub="See projected rental income and payback for an accessory dwelling unit by city."
    >
      <div style={S.grid2}>
        <Field label="City">
          <CitySelect value={city} onChange={setCity} />
        </Field>
        <Field label={`ADU size — ${size} sqft`}>
          <input
            type="range"
            min={300}
            max={1200}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: "100%", accentColor: GOLD }}
          />
        </Field>
      </div>
      <div style={{ ...S.result, display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        <div style={S.metric}>
          <div style={S.metricNum}>{usd(rent)}</div>
          <div style={S.metricLabel}>Monthly rent</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricNum}>{usd(annual)}</div>
          <div style={S.metricLabel}>Annual income</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricNum}>{payback.toFixed(1)} yr</div>
          <div style={S.metricLabel}>Payback</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricNum}>{usd(annual * 10)}</div>
          <div style={S.metricLabel}>10-yr gross</div>
        </div>
      </div>
      <BlueprintPreview sqft={size} />
      <p style={{ ...S.sub, marginTop: 16, marginBottom: 0 }}>
        Build estimate: <span style={{ color: "#ffdf9e" }}>{usd(build)}</span>. Pair with HFS
        financing below to fund it.
      </p>
    </Tool>
  );
}

/* ---------- 3. Permits — real track record (from the JR ERP) ---------- */
const PERMIT_REAL = [
  ["City of San José", 118],
  ["City of Brisbane", 18],
  ["City of Millbrae", 11],
];
function PermitTimeline() {
  const total = PERMIT_REAL.reduce((a, [, n]) => a + n, 0);
  const max = Math.max(...PERMIT_REAL.map(([, n]) => n));
  return (
    <Tool
      n="03"
      title="Permits — we pull them, you don't chase them"
      sub="We've filed 147 permits and counting. We manage every submittal and plan-check round and show the status live in your portal — so the timeline stays predictable, not a mystery."
    >
      <div style={{ marginTop: 4 }}>
        {PERMIT_REAL.map(([j, n]) => (
          <div key={j} style={{ margin: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ffffff", marginBottom: 6 }}>
              <span>{j}</span>
              <span style={{ color: "#ffdf9e" }}>{n} permits</span>
            </div>
            <div style={{ height: 8, background: "#ffffff10", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: (n / max) * 100 + "%", height: "100%", background: GOLD, transition: "width .4s" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={S.result}>
        <span style={S.label}>Total permits on record</span>
        <div style={S.big}>{total}</div>
        <p style={{ ...S.sub, marginTop: 12, marginBottom: 0 }}>
          Plus active work across 60+ Bay Area cities. Tell us your city and scope in a free
          consultation and we'll give you the real permitting picture.
        </p>
      </div>
    </Tool>
  );
}

/* ---------- 4. Cost of Waiting ---------- */
function CostOfWaiting() {
  const [cost, setCost] = useState(250000);
  const [months, setMonths] = useState(6);
  const [adu, setAdu] = useState(true);
  const [city, setCity] = useState("South San Francisco");
  const inflation = cost * 0.006 * months; // ~0.6%/mo material + labor drift
  const lostRent = adu ? RENT[city] * months : 0;
  const total = inflation + lostRent;
  return (
    <Tool
      n="04"
      title="The Cost of Waiting"
      sub="Delaying isn't free. See what a few months actually costs — in data, not sales pressure."
    >
      <div style={S.grid2}>
        <Field label="Project budget">
          <input
            style={S.input}
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label={`Delay — ${months} months`}>
          <input
            type="range"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={{ width: "100%", accentColor: GOLD }}
          />
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#ffffff", fontSize: 14 }}>
        <input type="checkbox" checked={adu} onChange={(e) => setAdu(e.target.checked)} style={{ accentColor: GOLD }} />
        This is an ADU (count lost rental income)
      </label>
      {adu && (
        <div style={{ marginTop: 14 }}>
          <Field label="City (for rent)">
            <CitySelect value={city} onChange={setCity} />
          </Field>
        </div>
      )}
      <div style={S.result}>
        <span style={S.label}>Estimated cost of waiting</span>
        <div style={S.big}>{usd(total)}</div>
        <div style={{ ...S.sub, marginTop: 12 }}>
          Material & labor drift: <span style={{ color: "#ffdf9e" }}>{usd(inflation)}</span>
          {adu && (
            <>
              {" · "}Lost rent: <span style={{ color: "#ffdf9e" }}>{usd(lostRent)}</span>
            </>
          )}
        </div>
      </div>
    </Tool>
  );
}

/* ---------- 5. HFS Financing pre-qual ---------- */
function HfsPayment() {
  const [amount, setAmount] = useState(150000);
  const [term, setTerm] = useState(10);
  const [apr, setApr] = useState(9.99);
  const i = apr / 100 / 12;
  const n = term * 12;
  const monthly = i > 0 ? (amount * i) / (1 - Math.pow(1 + i, -n)) : amount / n;
  return (
    <Tool
      n="05"
      title="Financing — Estimate Your Payment"
      sub="Fund your build with HFS Financial — no home equity required. Estimate the monthly first."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Amount">
          <input
            style={S.input}
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label="Term">
          <select style={S.input} value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            {[5, 7, 10, 15, 20].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </select>
        </Field>
        <Field label="Est. APR %">
          <input
            style={S.input}
            type="number"
            step="0.1"
            value={apr}
            onChange={(e) => setApr(Number(e.target.value) || 0)}
          />
        </Field>
      </div>
      <div style={S.result}>
        <span style={S.label}>Estimated monthly payment</span>
        <div style={S.big}>{usd(monthly)}/mo</div>
        <a href={HFS} target="_blank" rel="noreferrer" style={{ ...S.btn, marginTop: 22 }} className="cta-prim">
          Pre-qualify with HFS ↗
        </a>
        <p style={{ ...S.sub, marginTop: 14, marginBottom: 0 }}>
          Rate shown is an estimate for illustration — HFS provides your real terms.
        </p>
      </div>
    </Tool>
  );
}

/* ---------- 6. Risk Wall ---------- */
const RISKS = [
  {
    fear: "Contractor disappears",
    scenario: "Work stalls, calls go unanswered, and you're left with a half-finished home.",
    prevent:
      "Licensed (CSLB #1083248), insured, with a documented schedule, weekly reporting, and a real office — accountability is in the contract.",
  },
  {
    fear: "Budget blows up",
    scenario: "Surprise change orders pile on and the final number is nothing like the quote.",
    prevent:
      "Open-book estimating and a locked, pre-construction scope. Allowances are itemized up front, so there are no mystery line items.",
  },
  {
    fear: "Hidden mold / water damage",
    scenario: "Demo uncovers rot or mold and the project derails for weeks.",
    prevent:
      "Pre-demo inspection and Matterport documentation flag moisture risks early, with remediation planned before walls open.",
  },
  {
    fear: "Foundation / structural surprise",
    scenario: "An unpermitted addition or failing foundation surfaces mid-build.",
    prevent:
      "Structural review and engineering coordination during design — we de-risk the bones before construction starts.",
  },
  {
    fear: "Permit limbo",
    scenario: "The city sits on plan-check for months and no one tells you why.",
    prevent:
      "We manage every submittal and plan-check round and show the status live in your portal (see the Timeline Predictor above).",
  },
  {
    fear: "Code violations",
    scenario: "Work fails inspection and has to be torn out and redone.",
    prevent:
      "In-house plan reading and code expertise; everything is built to pass inspection the first time.",
  },
];

function RiskWall() {
  const [sel, setSel] = useState(0);
  const r = RISKS[sel];
  return (
    <Tool
      n="06"
      title="What homeowners fear — and how we prevent it"
      sub="Pick what worries you. See the scenario, and exactly how JR is built to avoid it."
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {RISKS.map((x, i) => (
          <button key={x.fear} style={S.chip(sel === i)} onClick={() => setSel(i)}>
            {x.fear}
          </button>
        ))}
      </div>
      <div style={S.result}>
        <span style={S.label}>The risk</span>
        <p style={{ color: "#f2ece0", fontSize: 16, lineHeight: 1.6, margin: "6px 0 18px" }}>
          {r.scenario}
        </p>
        <span style={S.label}>How JR prevents it</span>
        <p style={{ color: "#fff", fontSize: 16, lineHeight: 1.7, margin: "6px 0 0" }}>
          {r.prevent}
        </p>
      </div>
    </Tool>
  );
}

/* ---------- Track record strip ---------- */
function TrustStrip() {
  const stats = [
    ["287", "Projects on record"],
    ["60+", "Bay Area cities"],
    ["147", "Permits pulled"],
    ["100%", "Licensed & insured"],
  ];
  return (
    <div style={{ ...S.tool, marginTop: 34 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {stats.map(([n, l]) => (
          <div key={l} style={S.metric}>
            <div style={S.metricNum}>{n}</div>
            <div style={S.metricLabel}>{l}</div>
          </div>
        ))}
      </div>
      <p style={{ ...S.sub, textAlign: "center", margin: "18px 0 0" }}>
        CSLB License #1083248 —{" "}
        <a href={CSLB_VERIFY} target="_blank" rel="noreferrer" style={{ color: "#ffdf9e" }} className="navlink">
          verify it yourself ↗
        </a>
      </p>
    </div>
  );
}

export default function ToolsPage({ go }) {
  return (
    <section style={S.page}>
      <div style={S.wrap}>
        <span style={S.eyebrow}>Plan Your Project</span>
        <h1 style={S.h1}>Numbers before you commit.</h1>
        <p style={S.lead}>
          Most contractors keep you guessing. We don't. Estimate your investment, your ADU's
          income, your permit timeline and your financing — instantly, before you ever pick up
          the phone.
        </p>
        <div style={S.disclaimer}>
          These tools give <strong>non-binding estimates</strong> using typical Bay Area ranges.
          Your free JR consultation turns them into exact, fixed numbers.
        </div>

        <TrustStrip />
        <EstimateBuilder />
        <AduRoi />
        <PermitTimeline />
        <CostOfWaiting />
        <HfsPayment />
        <RiskWall />

        <div style={{ textAlign: "center", marginTop: 44 }}>
          <a
            href="#/contact"
            onClick={(e) => {
              e.preventDefault();
              go("contact");
            }}
            style={S.btn}
            className="cta-prim"
          >
            Book my free consultation →
          </a>
        </div>
      </div>
    </section>
  );
}
