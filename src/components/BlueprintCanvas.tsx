import { motion } from 'framer-motion'

/**
 * BlueprintCanvas
 * Animated architectural blueprint rendered as SVG paths.
 * Lines "draw" themselves on mount using framer-motion pathLength,
 * evoking a technical drawing coming to life behind the hero.
 */

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.18, duration: 2.2, ease: 'easeInOut' },
      opacity: { delay: i * 0.18, duration: 0.4 },
    },
  }),
}

export default function BlueprintCanvas({
  className = '',
}: {
  className?: string
}) {
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
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#9E8237" stopOpacity="0.4" />
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

      {/* faint technical grid */}
      <rect width="800" height="600" fill="url(#bp-grid)" />

      <motion.g
        initial="hidden"
        animate="visible"
        stroke="url(#bp-stroke)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* house elevation outline */}
        <motion.path
          custom={0}
          variants={draw}
          d="M150 430 L150 250 L400 110 L650 250 L650 430"
        />
        {/* ground line */}
        <motion.path custom={1} variants={draw} d="M90 430 L710 430" />
        {/* roof ridge detail */}
        <motion.path
          custom={1}
          variants={draw}
          d="M400 110 L400 175 M330 162 L470 162"
        />
        {/* interior division */}
        <motion.path
          custom={2}
          variants={draw}
          d="M400 430 L400 250 M150 320 L650 320"
        />
        {/* door */}
        <motion.path
          custom={3}
          variants={draw}
          d="M360 430 L360 360 L440 360 L440 430"
        />
        {/* left window */}
        <motion.path
          custom={3}
          variants={draw}
          d="M210 350 L300 350 L300 400 L210 400 Z M255 350 L255 400 M210 375 L300 375"
        />
        {/* right window */}
        <motion.path
          custom={4}
          variants={draw}
          d="M500 350 L590 350 L590 400 L500 400 Z M545 350 L545 400 M500 375 L590 375"
        />
        {/* dimension lines */}
        <motion.path
          custom={5}
          variants={draw}
          d="M150 470 L650 470 M150 462 L150 478 M650 462 L650 478"
        />
        {/* corner radius / detail circles */}
        <motion.circle custom={5} variants={draw} cx="400" cy="320" r="6" />
      </motion.g>

      {/* subtle measurement ticks */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.2, duration: 1 }}
        stroke="#C9A84C"
        strokeOpacity="0.3"
        strokeWidth="1"
      >
        <path d="M150 250 L130 250 M400 110 L400 90 M650 250 L670 250" />
      </motion.g>
    </svg>
  )
}
