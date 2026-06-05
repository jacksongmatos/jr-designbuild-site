import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { nav, site } from '../data/site'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/5 bg-ink/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-luxe flex h-20 items-center justify-between">
        <Link to="/" className="group flex items-center gap-3" aria-label={site.name}>
          <span className="grid h-10 w-10 place-items-center rounded-md border border-gold/40 font-serif text-lg font-semibold text-gold transition-colors group-hover:bg-gold/10">
            JR
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-serif text-lg tracking-wide text-bone">
              Design Build
            </span>
            <span className="text-[10px] uppercase tracking-luxe text-muted">
              Los Angeles
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `relative text-sm tracking-wide transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-gold after:transition-all after:duration-300 hover:text-bone ${
                    isActive
                      ? 'text-bone after:w-full'
                      : 'text-muted after:w-0 hover:after:w-full'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Link to="/contact" className="btn-gold">
            Start a Project
          </Link>
        </div>

        <button
          className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span
            className={`h-px w-6 bg-bone transition-all duration-300 ${
              open ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-px w-6 bg-bone transition-all duration-300 ${
              open ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-px w-6 bg-bone transition-all duration-300 ${
              open ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col bg-ink/98 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-1 flex-col items-center justify-center gap-7">
              {nav.map((item, i) => (
                <motion.li
                  key={item.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                >
                  <NavLink
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `font-serif text-3xl ${isActive ? 'text-gold' : 'text-bone'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * nav.length }}
              >
                <Link
                  to="/contact"
                  onClick={() => setOpen(false)}
                  className="btn-gold mt-4"
                >
                  Start a Project
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
