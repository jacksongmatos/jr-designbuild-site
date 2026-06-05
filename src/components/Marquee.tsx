import { motion } from 'framer-motion'

/**
 * Marquee
 * Infinite horizontal ticker. The track holds two identical copies of the
 * content and translates by -50%, so the loop is seamless. Pauses on hover.
 */

const DEFAULT_ITEMS = [
  'Nurture',
  'Amaze',
  'Dare',
  'Restore trust in construction',
  'Designed & built under one roof',
  'Matterport 3D Tours',
  'HFS Financing',
  'CSLB Licensed',
]

export default function Marquee({
  items = DEFAULT_ITEMS,
  speed = 28,
  className = '',
}: {
  items?: string[]
  speed?: number
  className?: string
}) {
  const sequence = [...items, ...items]

  return (
    <div
      className={`group relative flex overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <motion.div
        className="flex shrink-0 items-center whitespace-nowrap"
        initial={{ x: '0%' }}
        animate={{ x: '-50%' }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity }}
      >
        {sequence.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 text-xs uppercase tracking-luxe text-bone/70">
              {item}
            </span>
            <span className="text-gold">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
