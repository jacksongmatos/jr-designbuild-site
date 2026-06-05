import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'
import Hero from '../components/Hero'
import { SectionHeading } from '../components/SectionHeading'
import { Reveal } from '../components/Reveal'
import { services, stats, process, projects } from '../data/site'

export default function Home() {
  const featured = projects.slice(0, 3)

  return (
    <>
      <SEO
        title="Luxury Design-Build Studio"
        description="JR Design Build delivers luxury custom homes, remodels, and ADUs across Los Angeles. CSLB licensed, with Matterport 3D tours and HFS financing."
      />

      <Hero />

      {/* Stats band */}
      <section className="border-y border-white/5 bg-ink-soft">
        <div className="container-luxe grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center">
              <p className="font-serif text-4xl text-gold md:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-xs uppercase tracking-luxe text-muted">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="What We Do"
            title="A single team, from blueprint to build."
            intro="Because design and construction live under one roof, nothing is lost in translation — the home you imagine is the home we deliver, on budget and on schedule."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <article className="card group h-full p-8">
                  <h3 className="font-serif text-2xl text-bone">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {s.blurb}
                  </p>
                  <div className="gold-rule my-6 opacity-40" />
                  <ul className="space-y-2">
                    {s.details.slice(0, 3).map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-3 text-sm text-bone/70"
                      >
                        <span className="h-1 w-1 rounded-full bg-gold" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="mt-12">
            <Link to="/services" className="btn-ghost">
              Explore All Services
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Process */}
      <section className="border-y border-white/5 bg-ink-soft py-24 md:py-32">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="The Process"
            title="Considered at every stage."
            center
          />

          <div className="mt-16 grid gap-10 md:grid-cols-4">
            {process.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="relative">
                  <span className="font-serif text-6xl text-gold/20">
                    {step.n}
                  </span>
                  <h3 className="mt-2 font-serif text-2xl text-bone">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured work */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Selected Work"
              title="Recently delivered."
            />
            <Reveal>
              <Link to="/portfolio" className="btn-ghost">
                Full Portfolio
              </Link>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <Link
                  to="/portfolio"
                  className={`group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${p.accent}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <p className="text-xs uppercase tracking-luxe text-gold">
                      {p.category}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl text-bone">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{p.location}</p>
                  </div>
                  <span className="absolute right-6 top-6 text-xs text-bone/50 transition-transform duration-500 group-hover:translate-x-1">
                    {p.year} →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaBand />
    </>
  )
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-ink-soft py-24 md:py-32">
      <div className="absolute inset-0 bg-gold-line opacity-[0.07]" />
      <div className="container-luxe relative text-center">
        <Reveal>
          <span className="eyebrow">Let's Build Something Enduring</span>
          <h2 className="h-display mx-auto mt-5 max-w-3xl text-4xl md:text-6xl">
            Your next home begins with a conversation.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted">
            Tell us about your site, your vision, and your timeline. We'll bring
            the rest — including Matterport tours and flexible HFS financing.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link to="/contact" className="btn-gold">
              Book a Consultation
            </Link>
            <Link to="/services" className="btn-ghost">
              How We Work
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
