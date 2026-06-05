import { useState, type FormEvent } from 'react'
import { SEO } from '../components/SEO'
import { Reveal } from '../components/Reveal'
import { PageHero } from './Services'
import { site, services } from '../data/site'

type Status = 'idle' | 'submitting' | 'success'

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle')

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('submitting')
    // No backend wired yet — simulate a submission.
    // Replace with a real endpoint (e.g. Cloudflare Worker / form service).
    setTimeout(() => setStatus('success'), 900)
  }

  return (
    <>
      <SEO
        title="Contact"
        description="Start your design-build project with JR Design Build in Los Angeles. Request a consultation, Matterport tour, or financing details today."
      />

      <PageHero
        eyebrow="Contact"
        title="Let's start the conversation."
        intro="Share a few details about your project and our team will be in touch within one business day to schedule a consultation."
      />

      <section className="py-20 md:py-28">
        <div className="container-luxe grid gap-14 lg:grid-cols-[1fr_1.2fr]">
          {/* Details */}
          <Reveal>
            <div className="space-y-10">
              <div>
                <h2 className="eyebrow">Studio</h2>
                <p className="mt-4 font-serif text-2xl text-bone">
                  {site.address.street}
                </p>
                <p className="text-muted">
                  {site.address.city}, {site.address.region}{' '}
                  {site.address.postalCode}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-luxe text-muted">
                    Phone
                  </p>
                  <a
                    href={site.phoneHref}
                    className="font-serif text-xl text-bone transition-colors hover:text-gold"
                  >
                    {site.phone}
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-luxe text-muted">
                    Email
                  </p>
                  <a
                    href={`mailto:${site.email}`}
                    className="font-serif text-xl text-bone transition-colors hover:text-gold"
                  >
                    {site.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-luxe text-muted">
                    Hours
                  </p>
                  <p className="text-bone">{site.hours}</p>
                </div>
              </div>

              <div className="card p-6">
                <p className="text-sm leading-relaxed text-muted">
                  Ask us about{' '}
                  <span className="text-gold">Matterport 3D tours</span> of past
                  work and flexible{' '}
                  <span className="text-gold">HFS financing</span> for qualified
                  projects.
                </p>
                <p className="mt-4 text-xs uppercase tracking-luxe text-gold/80">
                  {site.license}
                </p>
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={0.1}>
            <div className="card p-8 md:p-10">
              {status === 'success' ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-gold/40 text-3xl text-gold">
                    ✓
                  </div>
                  <h3 className="mt-6 font-serif text-3xl text-bone">
                    Thank you.
                  </h3>
                  <p className="mt-3 max-w-sm text-sm text-muted">
                    Your inquiry is on its way to our team. We'll respond within
                    one business day to schedule your consultation.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" name="name" required />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      required
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Phone" name="phone" type="tel" />
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-luxe text-muted">
                        Project type
                      </label>
                      <select
                        name="projectType"
                        className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm text-bone outline-none transition-colors focus:border-gold"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        {services.map((s) => (
                          <option key={s.title} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <Field label="Project location / city" name="location" />
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-luxe text-muted">
                      Tell us about your project
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      className="w-full resize-none rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm text-bone outline-none transition-colors focus:border-gold"
                      placeholder="Scope, vision, timeline, budget range…"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === 'submitting'
                      ? 'Sending…'
                      : 'Request Consultation'}
                  </button>
                  <p className="text-center text-xs text-muted">
                    By submitting you agree to be contacted about your project.
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs uppercase tracking-luxe text-muted"
      >
        {label}
        {required && <span className="text-gold"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm text-bone outline-none transition-colors focus:border-gold"
      />
    </div>
  )
}
