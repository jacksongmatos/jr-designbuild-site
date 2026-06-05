import { useEffect, useRef, useState } from 'react'

/**
 * CursorFollower
 * A precise dot plus a larger ring that trails the pointer with eased lag,
 * giving a soft "magnetic" feel. The ring grows when hovering interactive
 * elements (a, button, [data-cursor]). Only mounts on fine-pointer / hover
 * capable devices — never on touch.
 */

export default function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine) return
    setEnabled(true)

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ringPos = { ...pos }
    let hovering = false
    let visible = false

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
      // dot tracks instantly
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`

      const target = e.target as HTMLElement | null
      const interactive = !!target?.closest('a, button, [data-cursor], input, textarea, select')
      if (interactive !== hovering) {
        hovering = interactive
        ring.style.width = hovering ? '64px' : '36px'
        ring.style.height = hovering ? '64px' : '36px'
        ring.style.borderColor = hovering
          ? 'rgba(201,168,76,0.9)'
          : 'rgba(201,168,76,0.45)'
        ring.style.backgroundColor = hovering
          ? 'rgba(201,168,76,0.08)'
          : 'transparent'
      }
    }

    const onLeave = () => {
      visible = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)

    let raf = 0
    let pressed = 1
    const onDown = () => (pressed = 0.85)
    const onUp = () => (pressed = 1)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.16
      ringPos.y += (pos.y - ringPos.y) * 0.16
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%) scale(${pressed})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden lg:block">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border border-gold/45 opacity-0 transition-[width,height,background-color,border-color] duration-300 ease-out"
        style={{ transitionProperty: 'width, height, background-color, border-color' }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-gold opacity-0"
      />
    </div>
  )
}
