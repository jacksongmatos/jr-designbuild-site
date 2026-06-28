import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/*
 * PlannerModal — full 3D floor-planner for JR Design Build.
 *
 * Opens a fullscreen modal (via a body portal) from the "Design Your Space" CTA
 * and embeds a real 3D planner in an <iframe> — the same experience as the
 * hosted Pascal editor (draw walls, place furniture, 3D view). A guaranteed
 * "Open in new tab" link is always present in case the embedded site refuses
 * framing (X-Frame-Options / CSP), so it's never a dead end.
 *
 * ── CHANGE THE PLANNER HERE ──────────────────────────────────────────────
 * To self-host or swap the planner later, edit PLANNER_URL. Anything that
 * renders in an iframe works; nothing else in this component needs to change.
 */
const PLANNER_URL = "https://editor.pascal.app/";

// Where "Request Estimate" sends people. The ?source=planner tag lets the
// contact form / lead pipeline attribute the lead to the planner.
const CONTACT_URL = "/contact?source=planner";

const GOLD = "#c9a25e";
const INK = "#0c0a08";
const DISPLAY = "'Bodoni Moda', Georgia, serif";

type PlannerModalProps = {
  /** Optional SPA navigation handler (the site's `go`). When provided,
   *  "Request Estimate" navigates client-side and records the lead source.
   *  Falls back to a normal redirect otherwise. */
  go?: (route: string) => void;
  /** Logo image src for the modal header. Falls back to a "JR" wordmark. */
  logo?: string;
  /** Override the contact destination (defaults to /contact?source=planner). */
  contactUrl?: string;
  /** Button label / subtext (kept as props so copy is easy to tweak). */
  label?: string;
  subtext?: string;
  /** Style/class hooks so the trigger can match surrounding CTAs. */
  buttonStyle?: React.CSSProperties;
  buttonClassName?: string;
  /** Fires when the modal opens (e.g. to close a containing nav menu). */
  onOpen?: () => void;
};

export default function PlannerModal({
  go,
  logo,
  contactUrl = CONTACT_URL,
  label = "Design Your Space",
  subtext = "Sketch your idea and request an estimate",
  buttonStyle,
  buttonClassName,
  onOpen,
}: PlannerModalProps) {
  const [open, setOpen] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const openModal = useCallback(() => {
    onOpen?.();
    setOpen(true);
  }, [onOpen]);
  const closeModal = useCallback(() => setOpen(false), []);

  // When open: lock background scroll, wire ESC, move focus into the modal,
  // and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);

    closeBtnRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open, closeModal]);

  const requestEstimate = useCallback(() => {
    // Tag the lead source (mirrors the Studio's sessionStorage handoff).
    try {
      sessionStorage.setItem("jr_lead_source", "planner");
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    if (go) {
      closeModal();
      go("contact");
      return;
    }
    // Fallback: honor the literal /contact?source=planner URL.
    window.location.href = contactUrl;
  }, [go, contactUrl, closeModal]);

  return (
    <>
      {/* Trigger — the "Design Your Space" CTA. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        data-analytics="open_planner"
        className={buttonClassName}
        aria-haspopup="dialog"
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
          background: GOLD,
          color: INK,
          border: "none",
          borderRadius: 30,
          padding: "12px 24px",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...buttonStyle,
        }}
      >
        <span
          style={
            subtext
              ? { fontSize: 14, fontWeight: 700, letterSpacing: 0.4 }
              : { font: "inherit", letterSpacing: "inherit" }
          }
        >
          {label}
          {subtext ? " →" : ""}
        </span>
        {/* Subtext only shows in the big-CTA variant; nav/compact usages pass an
            empty subtext so the trigger renders as a single-line link. */}
        {subtext ? (
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.78 }}>{subtext}</span>
        ) : null}
      </button>

      {/* Render the modal through a portal on <body> so it escapes the nav's
          stacking/size context (it was being clipped inside the nav) and covers
          the whole viewport above all site chrome. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={st.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(e) => {
              // Click on the dark backdrop (outside the panel) closes the modal.
              if (e.target === e.currentTarget) closeModal();
            }}
          >
          <div style={st.panel}>
            {/* JR branding bar above the planner. */}
            <header style={st.header}>
              <div style={st.brand}>
                {logo ? (
                  <img src={logo} alt="JR Design Build" style={st.logoImg} />
                ) : (
                  <span style={st.wordmark}>JR</span>
                )}
                <div style={st.brandText}>
                  <span id={titleId} style={st.brandTitle}>
                    Design Your Space
                  </span>
                  <span style={st.brandSub}>3D Floor Planner · JR Design Build</span>
                </div>
              </div>

              <div style={st.headerActions}>
                {/* Guaranteed fallback if the embedded site refuses framing. */}
                <a
                  href={PLANNER_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={st.newTabLink}
                >
                  Open in new tab ↗
                </a>
                <button
                  type="button"
                  onClick={requestEstimate}
                  data-analytics="request_estimate"
                  style={st.estimateBtn}
                  className="cta-prim"
                >
                  Request Estimate →
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={closeModal}
                  aria-label="Close planner"
                  style={st.closeBtn}
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Planner surface — real 3D planner embedded in an iframe. The
                fallback message sits behind it; if the iframe loads it covers
                the message, if framing is blocked the user sees it + the
                "Open in new tab" link above. */}
            <div style={st.stage}>
              <div style={st.fallback} aria-hidden="true">
                <p style={st.fallbackText}>
                  Loading the 3D planner… if it doesn't appear, use “Open in new
                  tab ↗” above.
                </p>
              </div>
              <iframe
                src={PLANNER_URL}
                title="JR Design Build 3D Floor Planner"
                style={st.iframe}
                allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                allowFullScreen
              />
            </div>
          </div>
          </div>,
          document.body,
        )}

      <style>{CSS}</style>
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    // Above all site chrome (custom cursor / AI assistant sit at z-index 9999).
    zIndex: 2147483647,
    background: "#000000e6",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(0px, 2vw, 28px)",
  },
  panel: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxWidth: 1500,
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    background: INK,
    border: `1px solid ${GOLD}33`,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 40px 120px #000000cc",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "12px 16px",
    borderBottom: `1px solid ${GOLD}26`,
    background: "linear-gradient(180deg,#12100c,#0c0a08)",
    flexShrink: 0,
  },
  brand: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  logoImg: { height: 36, width: "auto", display: "block" },
  wordmark: {
    fontFamily: DISPLAY,
    fontSize: 26,
    lineHeight: 1,
    color: GOLD,
    fontWeight: 600,
    letterSpacing: 1,
  },
  brandText: { display: "flex", flexDirection: "column", minWidth: 0 },
  brandTitle: { color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.3 },
  brandSub: {
    color: "#9c927f",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerActions: { display: "flex", alignItems: "center", gap: 10 },
  estimateBtn: {
    background: GOLD,
    color: INK,
    border: "none",
    borderRadius: 30,
    padding: "10px 18px",
    fontSize: 12,
    letterSpacing: 0.8,
    fontWeight: 700,
    textTransform: "uppercase",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  closeBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    background: "transparent",
    color: "#efe8da",
    border: `1px solid ${GOLD}55`,
    borderRadius: "50%",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
  },
  stage: { position: "relative", flex: 1, minHeight: 0, background: "#0e0c0a" },
  iframe: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
    background: "transparent",
  },
  fallback: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
  },
  fallbackText: { color: "#9c927f", fontSize: 14, maxWidth: 420, lineHeight: 1.6 },
  newTabLink: {
    color: GOLD,
    fontSize: 11.5,
    letterSpacing: 0.5,
    textDecoration: "none",
    border: `1px solid ${GOLD}55`,
    borderRadius: 30,
    padding: "9px 14px",
    whiteSpace: "nowrap",
  },
};

const CSS = `
/* Mobile-friendly: stack the brand and actions. */
@media (max-width: 560px) {
  [role="dialog"] header { flex-direction: column; align-items: stretch; }
}
`;
