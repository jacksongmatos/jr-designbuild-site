import { SEO } from '../components/SEO'
import { SectionHeading } from '../components/SectionHeading'
import { Reveal } from '../components/Reveal'
import { CtaBand } from './Home'
import { services, process } from '../data/site'

const advantages = [
  {
    title: 'Matterport 3D Tours',
    body: 'Walk your future home before a wall is framed. Every design is captured in immersive 3D so you can experience scale, light, and flow with total confidence.',
  },
  {
    title: 'HFS Financing',
    body: 'Through our Home Finance Solutions partnership, qualified clients access flexible renovation and construction financing with fast approvals and competitive terms.',
  },
  {
    title: 'CSLB Licensed & Insured',
    body: 'A fully licensed General Contractor with comprehensive liability and workers’ compensation coverage — accountability built into every contract.',
  },
  {
    title: 'Single Point of Accountability',
    body: 'One contract, one team, one timeline. Design and construction integrated to eliminate finger-pointing, change-order surprises, and schedule drift.',
  },
]

export default function Services() {
  return (
    <>
      <SEO
        title="Services"
        description="Custom homes, whole-home remodels, ADUs, and in-house design from JR Design Build — a CSLB licensed design-build firm in Los Angeles offering Matterport tours and HFS financing."
      />

      <PageHero
        eyebrow="Services"
        title="Design-build, end to end."
        intro="From the first concept sketch to the final punch list, JR Design Build manages every discipline in-house — so your project moves faster, costs less in surprises, and finishes beautifully."
      />

      <section className="py-20 md:py-28">
        <div className="container-luxe space-y-6">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.05}>
              <article className="card grid gap-8 p-8 md:grid-cols-[1fr_1.4fr] md:p-12">
                <div>
                  <span className="font-serif text-5xl text-gold/20">
                    0{i + 1}
                  </span>
                  <h2 className="mt-3 font-serif text-3xl text-bone">
                    {s.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                    {s.blurb}
                  </p>
                </div>
                <ul className="grid content-center gap-3 sm:grid-cols-2">
                  {s.details.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-3 text-sm text-bone/80"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {d}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Advantages */}
      <section className="border-y border-white/5 bg-ink-soft py-24 md:py-32">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Why JR Design Build"
            title="Advantages that show up on site."
            center
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {advantages.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.06}>
                <div className="card h-full p-8">
                  <h3 className="font-serif text-2xl text-gold">{a.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {a.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process recap */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <SectionHeading eyebrow="Engagement" title="How a project unfolds." />
          <div className="mt-14 space-y-px overflow-hidden rounded-2xl border border-white/5">
            {process.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.05}>
                <div className="grid gap-4 bg-ink-card/60 p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
                  <span className="font-serif text-4xl text-gold">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl text-bone">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}

export function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string
  title: string
  intro: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/5 pt-36 pb-20 md:pt-44 md:pb-28">
      <div className="absolute inset-0 bg-gradient-to-b from-ink-soft/60 to-ink" />
      <div className="container-luxe relative">
        <Reveal>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="h-display mt-5 max-w-3xl text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            {intro}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
