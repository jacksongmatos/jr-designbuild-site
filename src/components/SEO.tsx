import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { site } from '../data/site'

type SEOProps = {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

const DEFAULT_TITLE = `${site.name} | Luxury Design & Construction in Los Angeles`
const DEFAULT_IMAGE = `${site.url}/og-image.jpg`

export function SEO({
  title,
  description = site.description,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
}: SEOProps) {
  const { pathname } = useLocation()
  const url = `${site.url}${pathname}`
  const fullTitle = title ? `${title} | ${site.name}` : DEFAULT_TITLE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
