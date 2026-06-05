import { SEO } from '../components/SEO'
import { SectionHeading } from '../components/SectionHeading'
import { Reveal } from '../components/Reveal'
import { PageHero } from './Services'
import { CtaBand } from './Home'
import { stats, site } from '../data/site'

const values = [
  {
    title: 'Craft',
    body: 'We sweat the joinery, the reveal lines, the way morning light lands on a wall. Excellence is the accumulation of details done right.',
  },
  {
    title: 'Transparency',
    body: 'Open-book estimating, weekly reporting, and clear communication. You always know where your project — and your budget — stands.',
  },
  {
    title: 'Integration',
    body: 'Architecture, engineering, interiors, and construction working as one. Fewer hand-offs, fewer surprises, a better result.',
  },
  {
    title: 'Longevity',
    body: 'We build homes meant to outlast trends — durable, timeless, and engineered for the next generation of the family.',
  },
]

export default function About() {
  return (
    <>
      <SEO
        title="About"
        description="JR Design Build is a Los Angeles design-build firm with 20+ years of experience delivering luxury custom homes, remodels, and ADUs. CSLB licensed and insured."
      />

      <PageHero
        eyebrow="About"
        title="Builders first. Designers always."
        intro={`For over two decades, ${site.name} has been shaping how Los Angeles lives — uniting architectural vision with the discipline of master construction.`}
      />

      {/* Narrative */}
      <section className="py-24 md:py-32">
        <div className="container-luxe grid gap-16 md:grid-cols-2">
          <Reveal>
            <div className="space-y-5 text-base leading-relaxed text-muted">
              <p>
                {site.name} began with a simple conviction: the best homes happen
                when the people who design them are accountable for building them.
                No translation gaps between architect and contractor. No blaming
                the drawings. Just one team that owns the vision and the outcome.
              </p>
              <p>
                From the hills of Bel Air to the bluffs of Malibu, we've delivered
                ground-up residences, gut renovations, and ADUs for homeowners who
                expect more — more precision, more transparency, more craft.
              </p>
              <p>
                Today our in-house studio pairs architectural and interior design
                with a seasoned field team, immersive Matterport visualization,
                and flexible HFS financing — an end-to-end partnership from first
                sketch to final reveal.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card relative overflow-hidden p-10">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gold/5 blur-3xl" />
              <h3 className="font-serif text-2xl text-bone">By the numbers</h3>
              <div className="mt-8 grid grid-cols-2 gap-8">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="font-serif text-4xl text-gold">{s.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-luxe text-muted">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="gold-rule my-8 opacity-40" />
              <p className="text-sm text-muted">{site.license}</p>
              <p className="mt-1 text-sm text-muted">
                Serving {site.areaServed.slice(0, 4).join(', ')} & beyond.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-white/5 bg-ink-soft py-24 md:py-32">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="What Guides Us"
            title="Principles, not slogans."
            center
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="card h-full p-7">
                  <h3 className="font-serif text-xl text-gold">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {v.body}
                  </p>
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
