import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SEO } from '../components/SEO'
import { Reveal } from '../components/Reveal'
import { PageHero } from './Services'
import { CtaBand } from './Home'
import { projects } from '../data/site'

export default function Portfolio() {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.category)))],
    [],
  )
  const [active, setActive] = useState('All')

  const filtered =
    active === 'All'
      ? projects
      : projects.filter((p) => p.category === active)

  return (
    <>
      <SEO
        title="Portfolio"
        description="Explore custom homes, remodels, and ADUs delivered by JR Design Build across Beverly Hills, Bel Air, Malibu, and greater Los Angeles."
      />

      <PageHero
        eyebrow="Portfolio"
        title="Homes with a point of view."
        intro="A selection of recent design-build projects across Los Angeles — each one a collaboration between client, architect, and craftsman. Matterport tours available on request."
      />

      <section className="py-16 md:py-24">
        <div className="container-luxe">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full border px-5 py-2 text-xs uppercase tracking-luxe transition-all duration-300 ${
                  active === c
                    ? 'border-gold bg-gold text-ink'
                    : 'border-white/10 text-muted hover:border-gold/50 hover:text-bone'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Grid */}
          <motion.div layout className="mt-12 grid gap-6 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <motion.article
                  key={p.title}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`group relative aspect-[16/11] overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${p.accent}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-90" />
                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-luxe text-gold">
                      <span>{p.category}</span>
                      <span className="h-1 w-1 rounded-full bg-gold/60" />
                      <span className="text-muted">{p.year}</span>
                    </div>
                    <h2 className="mt-3 font-serif text-3xl text-bone">
                      {p.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{p.location}</p>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-bone/70 opacity-0 transition-all duration-500 group-hover:opacity-100">
                      {p.scope}
                    </p>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          <Reveal className="mt-16 text-center">
            <p className="text-sm text-muted">
              Want a closer look? We provide immersive Matterport walkthroughs of
              completed homes on request.
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
