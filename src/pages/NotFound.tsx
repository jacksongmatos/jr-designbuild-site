import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" noindex />
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="font-serif text-8xl text-gold/30 md:text-9xl">404</span>
        <h1 className="h-display mt-4 text-4xl md:text-5xl">
          This page is still on the drawing board.
        </h1>
        <p className="mt-5 max-w-md text-muted">
          The page you're looking for doesn't exist or has moved. Let's get you
          back to solid ground.
        </p>
        <Link to="/" className="btn-gold mt-9">
          Return Home
        </Link>
      </section>
    </>
  )
}
