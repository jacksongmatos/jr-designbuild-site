import React, { useState } from "react";

/*
 * Property Intelligence Report (Feature 1) — the platform's hero product.
 * Address -> /api/report -> snapshot + construction potential + home-age risk
 * + cost + timeline + ROI + scores + similar JR projects.
 * Works today with zero secrets (heuristics + clearly-labeled mock snapshot).
 */

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const usd = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();

const s = {
  page: { position: "relative", zIndex: 5, padding: "150px 6vw 120px" },
  wrap: { maxWidth: 1040, margin: "0 auto" },
  eyebrow: { fontSize: 11, letterSpacing: 7, color: GOLD, textTransform: "uppercase", fontWeight: 600 },
  h1: { fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: "clamp(34px,5.5vw,68px)", color: "#fff", margin: "14px 0 12px", fontWeight: 500, letterSpacing: -1, textShadow: "0 1px 2px #000" },
  lead: { color: "#efe8da", fontSize: 16, lineHeight: 1.7, maxWidth: 640 },
  bar: { display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 240, background: "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 6, padding: "15px 16px", color: "#fff", fontSize: 15, outline: "none" },
  btn: { background: GOLD, color: INK, border: "none", borderRadius: 4, padding: "15px 26px", fontSize: 12, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", textDecoration: "none", display: "inline-block" },
  ghost: { background: "transparent", color: "#f3e3be", border: "1px solid #c9a25e88", borderRadius: 4, padding: "14px 22px", fontSize: 11, letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase", cursor: "pointer", textDecoration: "none", display: "inline-block" },
  card: { background: "#0c0a08f2", border: "1px solid #c9a25e1f", borderRadius: 8, padding: "26px 24px", backdropFilter: "blur(10px)", marginTop: 18 },
  hLabel: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GOLD, marginBottom: 14 },
  big: { fontFamily: "'Bodoni Moda', serif", fontSize: 30, color: "#fff" },
  note: { fontSize: 12.5, color: "#c9b48a", lineHeight: 1.6 },
  // Responsive: auto-fit wraps columns on narrow screens instead of clipping.
  grid: (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))`, gap: 12 }),
  metric: { textAlign: "center", padding: "8px 4px", minWidth: 0 },
  mnum: { fontFamily: "'Bodoni Moda', serif", fontSize: "clamp(22px, 5.5vw, 30px)", color: GOLD, wordBreak: "break-word" },
  mlab: { fontSize: 11, letterSpacing: 1, color: "#d8cfbf", textTransform: "uppercase", marginTop: 4 },
};

function Ring({ value, label }) {
  const pct = Math.max(0, Math.min(100, value));
  const c = pct >= 70 ? "#86b06a" : pct >= 45 ? GOLD : "#cf8a5a";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 92, height: 92, margin: "0 auto", borderRadius: "50%", background: `conic-gradient(${c} ${pct * 3.6}deg, #ffffff14 0)`, display: "grid", placeItems: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: INK, display: "grid", placeItems: "center", fontFamily: "'Bodoni Moda', serif", fontSize: 26, color: "#fff" }}>{pct}</div>
      </div>
      <div style={{ ...s.mlab, marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={s.card} className="card">
      <div style={s.hLabel}>{label}</div>
      {children}
    </div>
  );
}

export default function ReportPage({ go }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState(null);
  const [err, setErr] = useState(null);

  const run = async (e) => {
    if (e) e.preventDefault();
    if (!address.trim()) return;
    setLoading(true); setErr(null); setR(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "error"); return; }
      setR(data);
    } catch (_) { setErr("network"); } finally { setLoading(false); }
  };

  return (
    <section style={s.page}>
      <div style={s.wrap}>
        <span style={s.eyebrow}>Property Intelligence</span>
        <h1 style={s.h1}>What can your property become?</h1>
        <p style={s.lead}>
          Enter your address for an instant feasibility snapshot — what you can build, the cost,
          the timeline, the risks, the ROI, and the JR projects most like yours.
        </p>
        <form style={s.bar} onSubmit={run}>
          <input style={s.input} placeholder="123 Main St, San Mateo, CA 94401" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </form>
        <p style={{ ...s.note, marginTop: 12 }}>
          567 projects · 147 permits · 50 Bay Area cities · CSLB licensed
        </p>

        {err && (
          <Section label="Heads up">
            <p style={s.note}>Couldn't generate the report right now. Try again, or {""}
              <a href="/contact" style={{ color: GOLD }} onClick={(e) => { e.preventDefault(); go("contact"); }}>book a consult ↗</a>.
            </p>
          </Section>
        )}

        {r && (
          <div style={{ marginTop: 30 }}>
            {r.snapshotIsMock && (
              <p style={{ ...s.note, marginBottom: 4 }}>
                ⓘ Property details are an estimated preview (a licensed data feed plugs in here).
                Construction figures are grounded in JR's real ranges.
              </p>
            )}

            {/* Scores */}
            <Section label="Property scores">
              <div style={s.grid("110px")}>
                <Ring value={r.scores.health} label="Health" />
                <Ring value={r.scores.expansion} label="Expansion" />
                <Ring value={r.scores.investment} label="Investment" />
                <Ring value={r.scores.risk} label="Risk" />
              </div>
            </Section>

            {/* Snapshot */}
            <Section label="Snapshot">
              <div style={s.grid("130px")}>
                {[
                  ["Lot size", r.snapshot.lotSqft.toLocaleString() + " sqft"],
                  ["Home size", r.snapshot.buildingSqft.toLocaleString() + " sqft"],
                  ["Beds / Baths", `${r.snapshot.beds} / ${r.snapshot.baths}`],
                  ["Year built", r.snapshot.yearBuilt],
                  ["Est. value", usd(r.snapshot.estValue)],
                  ["Jurisdiction", r.snapshot.jurisdiction],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: "8px 0" }}>
                    <div style={s.mlab}>{k}</div>
                    <div style={{ color: "#fff", fontSize: 18, marginTop: 4 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Construction potential */}
            <Section label="Construction potential">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {r.potential.map((p) => (
                  <div key={p.type} style={{ flex: "1 1 240px", border: "1px solid " + (p.feasible ? "#c9a25e55" : "#ffffff14"), borderRadius: 8, padding: "14px 16px", opacity: p.feasible ? 1 : 0.5 }}>
                    <div style={{ color: p.feasible ? GOLD : "#9a9286", fontSize: 13, fontWeight: 600 }}>{p.feasible ? "✓" : "—"} {p.type}</div>
                    <div style={{ color: "#e0d8c8", fontSize: 13, marginTop: 4 }}>{p.approxSize}</div>
                    <div style={s.mlab}>Permit complexity: {p.complexity}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Risk */}
            <Section label={`Home-age risk — ${r.risk.score}`}>
              {r.risk.items.length === 0 ? (
                <p style={s.note}>No major age-related risks flagged for this build year.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {r.risk.items.map((it) => (
                    <li key={it.risk} style={{ color: "#f2ece0", fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                      <strong style={{ color: "#fff" }}>{it.risk}.</strong> <span style={{ color: "#cfc6b6" }}>{it.why}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Cost */}
            <Section label="Cost intelligence">
              {r.cost.map((c) => (
                <div key={c.type} style={{ padding: "10px 0", borderTop: "1px solid #ffffff10", fontSize: 14 }}>
                  <div style={{ color: "#fff", marginBottom: 5 }}>{c.type}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    <span style={{ color: "#d8cfbf" }}>Low {usd(c.low)}</span>
                    <span style={{ color: GOLD }}>Avg {usd(c.avg)}</span>
                    <span style={{ color: "#d8cfbf" }}>Premium {usd(c.premium)}</span>
                  </div>
                </div>
              ))}
            </Section>

            {/* Timeline */}
            <Section label="Timeline intelligence (weeks)">
              {r.timeline.map((t) => {
                const total = t.design + t.engineering + t.permitting + t.construction;
                const seg = (v, col) => ({ width: (v / total) * 100 + "%", background: col, height: "100%" });
                return (
                  <div key={t.type} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: "#fff" }}>{t.type}</span><span style={{ color: GOLD }}>~{total}w</span>
                    </div>
                    <div style={{ display: "flex", height: 9, borderRadius: 6, overflow: "hidden" }}>
                      <div style={seg(t.design, "#5a4a2c")} />
                      <div style={seg(t.engineering, "#8a6a3a")} />
                      <div style={seg(t.permitting, "#b48a45")} />
                      <div style={seg(t.construction, GOLD)} />
                    </div>
                  </div>
                );
              })}
              <p style={s.note}>Design · Engineering · Permitting · Construction</p>
            </Section>

            {/* ROI */}
            <Section label="ROI intelligence (ADU scenario)">
              <div style={s.grid("150px")}>
                <div style={s.metric}><div style={s.mnum}>{usd(r.roi.projectCost)}</div><div style={s.mlab}>Project cost</div></div>
                <div style={s.metric}><div style={s.mnum}>{usd(r.roi.equity)}</div><div style={s.mlab}>Equity created</div></div>
                <div style={s.metric}><div style={s.mnum}>{usd(r.roi.aduRentMonthly)}/mo</div><div style={s.mlab}>Rent potential</div></div>
                <div style={s.metric}><div style={s.mnum}>{r.roi.paybackYears} yr</div><div style={s.mlab}>Payback</div></div>
              </div>
              <p style={{ ...s.note, marginTop: 10 }}>
                Est. value after completion: <span style={{ color: GOLD }}>{usd(r.roi.afterValue)}</span> · 10-yr rent: {usd(r.roi.tenYear)}
              </p>
            </Section>

            {/* Similar */}
            {r.similar && r.similar.length > 0 && (
              <Section label="Similar JR projects">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {r.similar.map((p, i) => (
                    <div key={i} style={{ flex: "1 1 240px", border: "1px solid #ffffff14", borderRadius: 8, padding: "14px 16px" }}>
                      <div style={{ color: GOLD, fontSize: 12 }}>{p.city}</div>
                      <div style={{ color: "#fff", fontFamily: "'Bodoni Moda', serif", fontSize: 22 }}>{usd(p.cost)}</div>
                      <div style={{ color: "#cfc6b6", fontSize: 13, marginTop: 4 }}>{p.scope}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <p style={{ ...s.note, marginTop: 18 }}>{r.disclaimer}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <a href="/contact" style={s.btn} onClick={(e) => { e.preventDefault(); go("contact"); }}>Get a professional property review →</a>
              <a href="/tools" style={s.ghost} onClick={(e) => { e.preventDefault(); go("tools"); }}>Open the planning tools</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
