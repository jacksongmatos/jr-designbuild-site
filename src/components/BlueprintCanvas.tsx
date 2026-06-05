import { useEffect, useRef } from 'react'

/**
 * BlueprintCanvas
 * Animated architectural blueprint. Each line "draws" itself in sequence
 * via a requestAnimationFrame loop that drives stroke-dashoffset, holds the
 * finished drawing, fades it out, then restarts — continuously.
 *
 * Respects prefers-reduced-motion (renders the finished drawing, statically).
 */

// Ordered so the structure builds up believably: shell -> rooms -> details.
const PATHS: { d: string; group: number }[] = [
  // house elevation outline
  { d: 'M150 430 L150 250 L400 110 L650 250 L650 430', group: 0 },
  // ground line
  { d: 'M90 430 L710 430', group: 0 },
  // roof ridge detail
  { d: 'M400 110 L400 175 M330 162 L470 162', group: 1 },
  // interior division
  { d: 'M400 430 L400 250', group: 1 },
  { d: 'M150 320 L650 320', group: 1 },
  // door
  { d: 'M360 430 L360 360 L440 360 L440 430', group: 2 },
  // left window
  {
    d: 'M210 350 L300 350 L300 400 L210 400 Z M255 350 L255 400 M210 375 L300 375',
    group: 2,
  },
  // right window
  {
    d: 'M500 350 L590 350 L590 400 L500 400 Z M545 350 L545 400 M500 375 L590 375',
    group: 3,
  },
  // dimension lines
  { d: 'M150 470 L650 470 M150 462 L150 478 M650 462 L650 478', group: 4 },
  // measurement ticks
  { d: 'M150 250 L130 250 M400 110 L400 90 M650 250 L670 250', group: 4 },
]

const DRAW = 0.85 // seconds to draw a single path
const STAGGER = 0.32 // seconds between consecutive paths starting
const HOLD = 2.2 // seconds to hold the completed drawing
const FADE = 1.1 // seconds to fade the whole drawing out
const GAP = 0.4 // seconds blank before restarting

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export default function BlueprintCanvas({
  className = '',
}: {
  className?: string
}) {
  const groupRef = useRef<SVGGElement>(null)
  const pathRefs = useRef<SVGPathElement[]>([])
  const circleRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const paths = pathRefs.current.filter(Boolean)
    const circle = circleRef.current
    const group = groupRef.current
    if (!paths.length || !group) return

    // measure + prime each stroke as fully hidden
    const lengths = paths.map((p) => p.getTotalLength())
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lengths[i]}`
      p.style.strokeDashoffset = `${lengths[i]}`
    })
    let circleLen = 0
    if (circle) {
      circleLen = circle.getTotalLength()
      circle.style.strokeDasharray = `${circleLen}`
      circle.style.strokeDashoffset = `${circleLen}`
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      paths.forEach((p) => (p.style.strokeDashoffset = '0'))
      if (circle) circle.style.strokeDashoffset = '0'
      group.style.opacity = '1'
      return
    }

    const drawSpan = (PATHS.length - 1) * STAGGER + DRAW
    const circleStart = drawSpan // circle draws right after the last path
    const totalDraw = circleStart + DRAW
    const cycle = totalDraw + HOLD + FADE + GAP

    let raf = 0
    let startTs = 0

    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const t = ((ts - startTs) / 1000) % cycle

      // group fade: visible while drawing/holding, fades during FADE window
      let opacity = 1
      if (t > totalDraw + HOLD) {
        const f = (t - (totalDraw + HOLD)) / FADE
        opacity = Math.max(0, 1 - f)
      }
      if (t > totalDraw + HOLD + FADE) opacity = 0
      group.style.opacity = `${opacity}`

      // per-path draw progress
      paths.forEach((p, i) => {
        const start = i * STAGGER
        const local = (t - start) / DRAW
        const prog = local <= 0 ? 0 : local >= 1 ? 1 : easeInOut(local)
        p.style.strokeDashoffset = `${lengths[i] * (1 - prog)}`
      })

      if (circle) {
        const local = (t - circleStart) / DRAW
        const prog = local <= 0 ? 0 : local >= 1 ? 1 : easeInOut(local)
        circle.style.strokeDashoffset = `${circleLen * (1 - prog)}`
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="bp-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2C879" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9E8237" stopOpacity="0.45" />
        </linearGradient>
        <pattern
          id="bp-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="#C9A84C"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* faint technical grid (static) */}
      <rect width="800" height="600" fill="url(#bp-grid)" />

      <g
        ref={groupRef}
        stroke="url(#bp-stroke)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS.map((p, i) => (
          <path
            key={i}
            data-group={p.group}
            ref={(el) => {
              if (el) pathRefs.current[i] = el
            }}
            d={p.d}
          />
        ))}
        {/* detail node at the plan's center */}
        <circle ref={circleRef} cx="400" cy="320" r="6" />
      </g>
    </svg>
  )
}
