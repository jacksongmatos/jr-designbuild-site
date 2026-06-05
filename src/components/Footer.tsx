import { Link } from 'react-router-dom'
import { nav, site } from '../data/site'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/5 bg-ink-soft">
      <div className="container-luxe py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-md border border-gold/40 font-serif text-lg font-semibold text-gold">
                JR
              </span>
              <div className="leading-none">
                <p className="font-serif text-xl text-bone">{site.name}</p>
                <p className="text-[10px] uppercase tracking-luxe text-muted">
                  {site.tagline}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
              {site.description}
            </p>
            <p className="mt-6 text-xs uppercase tracking-luxe text-gold/80">
              {site.license}
            </p>
          </div>

          <div>
            <h3 className="eyebrow">Explore</h3>
            <ul className="mt-5 space-y-3">
              {nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-muted transition-colors hover:text-bone"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow">Studio</h3>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              <li>
                {site.address.street}
                <br />
                {site.address.city}, {site.address.region}{' '}
                {site.address.postalCode}
              </li>
              <li>
                <a
                  href={site.phoneHref}
                  className="transition-colors hover:text-bone"
                >
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="transition-colors hover:text-bone"
                >
                  {site.email}
                </a>
              </li>
              <li>{site.hours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-muted md:flex-row">
          <p>
            © {year} {site.legalName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-gold"
            >
              Instagram
            </a>
            <a
              href={site.social.houzz}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-gold"
            >
              Houzz
            </a>
            <a
              href={site.social.linkedin}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-gold"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
