import React, {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/*
 * PlannerModal — free 3D floor-planner for JR Design Build.
 *
 * Embeds the Pascal Editor (@pascal-app/editor) as a NATIVE React component —
 * no iframe — inside a fullscreen modal opened by the "Design Your Space" CTA.
 *
 * The editor is code-split (lazy) so its heavy three.js/WebGPU bundle only
 * loads when the planner is opened. If it fails to load (offline, chunk error,
 * runtime crash), an ErrorBoundary shows a graceful fallback.
 *
 * To swap the planner later, change what src/pascal/PascalEditor.tsx renders —
 * this modal shell (branding, a11y, Request Estimate) stays the same.
 */

// Lazy-loaded so three.js/r3f/drei stay out of the initial page bundle.
const PascalEditor = lazy(() => import("./pascal/PascalEditor"));

// Where "Request Estimate" sends people. The ?source=planner tag lets the
// contact form / lead pipeline attribute the lead to the 3D planner.
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

      {open && (
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

            {/* Planner surface — native Pascal Editor, lazy-loaded + guarded. */}
            <div style={st.stage}>
              <PlannerErrorBoundary onRequestEstimate={requestEstimate}>
                <Suspense fallback={<LoadingState />}>
                  <PascalEditor />
                </Suspense>
              </PlannerErrorBoundary>
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </>
  );
}

function LoadingState() {
  return (
    <div style={st.message}>
      <div style={st.spinner} aria-hidden="true" />
      <p style={st.messageText}>Loading the 3D planner…</p>
    </div>
  );
}

function FallbackState({ onRequestEstimate }: { onRequestEstimate: () => void }) {
  return (
    <div style={st.message} role="status">
      <div style={st.fallbackMark} aria-hidden="true">
        ▦
      </div>
      <p style={st.fallbackHeading}>
        Planner is being prepared. Please request a consultation.
      </p>
      <button
        type="button"
        onClick={onRequestEstimate}
        style={{ ...st.estimateBtn, marginTop: 6 }}
        className="cta-prim"
      >
        Request Estimate →
      </button>
    </div>
  );
}

// Catches lazy-load/runtime failures in the editor and shows the fallback.
class PlannerErrorBoundary extends Component<
  { onRequestEstimate: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <FallbackState onRequestEstimate={this.props.onRequestEstimate} />;
    }
    return this.props.children;
  }
}

const st: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
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
  stage: { position: "relative", flex: 1, minHeight: 0, background: "#000" },
  message: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    textAlign: "center",
    padding: "24px",
  },
  messageText: { color: "#9c927f", fontSize: 14 },
  fallbackMark: { fontSize: 40, color: GOLD, opacity: 0.7 },
  fallbackHeading: {
    color: "#efe8da",
    fontSize: 17,
    lineHeight: 1.6,
    maxWidth: 460,
    fontFamily: DISPLAY,
  },
  spinner: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `3px solid ${GOLD}33`,
    borderTopColor: GOLD,
    animation: "jr-planner-spin 0.8s linear infinite",
  },
};

const CSS = `
@keyframes jr-planner-spin { to { transform: rotate(360deg); } }

/* Mobile-friendly: stack the brand and actions. */
@media (max-width: 560px) {
  [role="dialog"] header { flex-direction: column; align-items: stretch; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="jr-planner-spin"] { animation: none !important; }
}
`;
