# JR Design Build

Marketing site for **JR Design Build** — a CSLB licensed design-build firm in
Los Angeles, CA, delivering luxury custom homes, whole-home remodels, and ADUs.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **TailwindCSS v3** (dark luxury theme — `#0a0a0a` ink, `#C9A84C` gold,
  Cormorant Garamond + Inter)
- **React Router v6** with route-level code splitting (`React.lazy`)
- **React Helmet Async** for per-page SEO
- **Framer Motion** for animation
- Signature visuals:
  - `BlueprintCanvas` — animated SVG architectural blueprint
  - `LiquidCanvas` — WebGL "liquid gold" shader background (graceful fallback)

## Pages

Home · Services · Portfolio · About · Contact (+ 404)

## SEO

- Schema.org `LocalBusiness` / `GeneralContractor` JSON-LD
- Open Graph + Twitter Card meta per route
- `public/sitemap.xml`, `public/robots.txt`
- `public/_redirects` SPA fallback for Cloudflare Pages / Netlify

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (code split by route)
npm run preview  # preview the production build
```

## Deploy

Build output is `dist/`. The included `_redirects` routes all paths to
`index.html` so client-side routing works on Cloudflare Pages / Netlify.

> Note: the contact form is currently front-end only. Wire it to a form
> endpoint (e.g. a Cloudflare Worker) before going live. Replace the
> placeholder business details in `src/data/site.ts` and add a real
> `public/og-image.jpg`.
