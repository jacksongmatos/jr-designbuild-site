import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import LiquidCanvas from './LiquidCanvas'
import BlueprintCanvas from './BlueprintCanvas'
import { site } from '../data/site'

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      {/* WebGL liquid gold field */}
      <LiquidCanvas className="absolute inset-0 h-full w-full" />

      {/* darkening overlays for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-transparent to-transparent" />

      {/* animated architectural blueprint */}
      <BlueprintCanvas className="pointer-events-none absolute right-0 top-1/2 hidden h-[120%] w-[60%] -translate-y-1/2 opacity-50 lg:block" />

      <div className="container-luxe relative z-10 py-32">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="eyebrow"
        >
          {site.license} · Los Angeles, CA
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="h-display mt-6 max-w-3xl text-5xl sm:text-6xl md:text-7xl"
        >
          Designed and built
          <span className="block text-gold">under one roof.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-xl text-lg leading-relaxed text-bone/80"
        >
          {site.name} is a design-build studio crafting Los Angeles' most
          considered custom homes, remodels, and ADUs — architecture and
          construction in one seamless partnership.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link to="/contact" className="btn-gold">
            Start Your Project
          </Link>
          <Link to="/portfolio" className="btn-ghost">
            View the Portfolio
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs uppercase tracking-luxe text-muted"
        >
          <span>Matterport 3D Tours</span>
          <span className="hidden h-1 w-1 rounded-full bg-gold/60 sm:block" />
          <span>HFS Financing Available</span>
          <span className="hidden h-1 w-1 rounded-full bg-gold/60 sm:block" />
          <span>Licensed &amp; Insured</span>
        </motion.div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-10 w-6 items-start justify-center rounded-full border border-gold/40 p-1.5"
        >
          <span className="h-2 w-1 rounded-full bg-gold" />
        </motion.div>
      </div>
    </section>
  )
}
