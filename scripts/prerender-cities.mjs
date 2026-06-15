// Build-time prerender for programmatic SEO.
// Emits real, crawlable static HTML WITHOUT touching the SPA router:
//   dist/cities/index.html                      (hub)
//   dist/cities/<city>/index.html               (city page)
//   dist/cities/<city>/<service>/index.html     (city x service long-tail)
//   dist/sitemap.xml
// Cloudflare Pages serves these static files directly (they win over the
// _redirects SPA rewrite).
//
// HONESTY RULE: per-city project counts are REAL (from the JR ERP). Cities
// without a known count get no fabricated number — they lean on the real
// company-wide credentials (533+ projects, 147 permits, CSLB). Wire Supabase
// here at build time to make every count live.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const ORIGIN = "https://jrdesignbuilds.com";
const YEAR = new Date().getFullYear();
const LASTMOD = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, build date

// Cities with REAL project counts (from the JR ERP / QuickBooks, 2026-06-11).
// permits = real permits filed where known.
const CITIES_REAL = [
  { name: "San Mateo", projects: 83 },
  { name: "San Francisco", projects: 55 },
  { name: "Burlingame", projects: 49 },
  { name: "South San Francisco", projects: 34 },
  { name: "Millbrae", projects: 32, permits: 11 },
  { name: "Hillsborough", projects: 31 },
  { name: "Pacifica", projects: 23 },
  { name: "Foster City", projects: 18 },
  { name: "San Carlos", projects: 17 },
  { name: "San Bruno", projects: 17 },
  { name: "San Jose", projects: 16, permits: 118 },
  { name: "Redwood City", projects: 15 },
  { name: "Daly City", projects: 14 },
  { name: "Sunnyvale", projects: 9 },
  { name: "Palo Alto", projects: 9 },
  { name: "Hayward", projects: 7 },
  { name: "Belmont", projects: 7 },
  { name: "Santa Clara", projects: 6 },
  { name: "Menlo Park", projects: 5 },
  { name: "Oakland", projects: 5 },
  { name: "Brisbane", projects: 4, permits: 18 },
  { name: "Half Moon Bay", projects: 4 },
  { name: "Milpitas", projects: 4 },
  { name: "Berkeley", projects: 4 },
  { name: "Mountain View", projects: 4 },
  { name: "Cupertino", projects: 3 },
  { name: "Danville", projects: 3 },
  { name: "Fremont", projects: 3 },
  { name: "Mill Valley", projects: 2 },
  { name: "Los Altos", projects: 2 },
  { name: "Campbell", projects: 2 },
  { name: "Woodside", projects: 2 },
  { name: "Saratoga", projects: 2 },
  { name: "Pleasanton", projects: 2 },
  { name: "Martinez", projects: 1 },
  { name: "Hercules", projects: 1 },
  { name: "Monte Sereno", projects: 1 },
  { name: "Castro Valley", projects: 1 },
  { name: "Sausalito", projects: 1 },
  { name: "Walnut Creek", projects: 1 },
  { name: "San Ramon", projects: 1 },
  { name: "Richmond", projects: 1 },
  { name: "East Palo Alto", projects: 1 },
  { name: "Antioch", projects: 1 },
  { name: "Moss Beach", projects: 1 },
  { name: "Emeryville", projects: 1 },
  { name: "San Rafael", projects: 1 },
  { name: "Portola Valley", projects: 1 },
  { name: "Atherton", projects: 1 },
  { name: "Colma", projects: 1 },
  { name: "Livermore", projects: 1 },
  { name: "Dublin", projects: 1 },
];

// Service pages are generated only for cities with a meaningful track record,
// to avoid thin pages for one-off project cities.
const SERVICE_MIN = 5;

// Additional Bay Area cities we serve (no fabricated count — real cred only).
const CITIES_MORE = [
  "Foster City", "Belmont", "Menlo Park", "Mountain View", "Sunnyvale",
  "Santa Clara", "Cupertino", "Los Altos", "Los Altos Hills", "Atherton",
  "Woodside", "Portola Valley", "Half Moon Bay", "East Palo Alto", "Colma",
  "Brisbane", "San Leandro", "Oakland", "Berkeley", "Alameda", "Emeryville",
  "Fremont", "Union City", "Newark", "Milpitas", "Campbell", "Saratoga",
  "Los Gatos", "Morgan Hill", "Gilroy", "Pleasanton", "Dublin", "Livermore",
  "San Ramon", "Walnut Creek", "Castro Valley", "San Lorenzo", "Pacheco",
  "Belmont", "San Anselmo", "Mill Valley", "Sausalito", "Tiburon",
  "Novato", "San Rafael", "Brentwood",
];

// Service lines for the city x service long-tail (built for REAL-count cities).
const SERVICES = [
  { slug: "adu", name: "ADUs & Junior ADUs", short: "ADU", blurb: "Detached, attached, garage-conversion and junior ADUs — designed, permitted and built under one roof." },
  { slug: "home-additions", name: "Home Additions", short: "home addition", blurb: "Room additions and second-story expansions that match your home and pass inspection the first time." },
  { slug: "kitchen-remodel", name: "Kitchen Remodels", short: "kitchen remodel", blurb: "Layout, cabinetry and full structural kitchen remodels with transparent fixed pricing." },
  { slug: "bathroom-remodel", name: "Bathroom Remodels", short: "bathroom remodel", blurb: "From guest baths to spa primary suites — waterproofed and built to last." },
  { slug: "whole-home-remodel", name: "Whole-Home Remodels", short: "whole-home remodel", blurb: "Down-to-the-studs transformations with one accountable design-build team." },
  { slug: "garage-conversion", name: "Garage Conversions", short: "garage conversion", blurb: "Turn an underused garage into living space, an office, or an income ADU." },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// de-dupe cities (some names appear in both lists / repeated)
const REAL_NAMES = new Set(CITIES_REAL.map((c) => c.name));
const ALL = [
  ...CITIES_REAL,
  ...[...new Set(CITIES_MORE)].filter((n) => !REAL_NAMES.has(n)).map((name) => ({ name, projects: 0 })),
];

const HEAD = (title, desc, canonical, jsonld) => `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0c0a08" />
<!-- Google Analytics 4 — async. Replace G-XXXXXXXXXX with the real Measurement ID (same as index.html). -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-XXXXXXXXXX');document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('[data-analytics]');if(!el)return;gtag('event',el.getAttribute('data-analytics'),{event_category:'engagement',event_label:(el.textContent||'').trim().slice(0,80)});});</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${canonical}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,500;1,400&family=Archivo:wght@400;600&display=swap" rel="stylesheet" />
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
  :root{color-scheme:dark}*{box-sizing:border-box}
  body{margin:0;background:#0c0a08;color:#ece6db;font-family:'Archivo',system-ui,sans-serif;line-height:1.6}
  a{color:#c9a25e;text-decoration:none}
  .wrap{max-width:920px;margin:0 auto;padding:48px 6vw 80px}
  .eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#c9a25e;font-weight:600}
  h1{font-family:'Bodoni Moda',Georgia,serif;font-size:clamp(32px,6vw,60px);font-weight:500;line-height:1.05;margin:14px 0 10px;color:#fff;letter-spacing:-1px}
  h2{font-family:'Bodoni Moda',serif;font-weight:500;color:#fff;font-size:24px;margin:40px 0 12px}
  p{color:#e6ddcd;max-width:64ch}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:#c9a25e1f;border:1px solid #c9a25e1f;margin:28px 0}
  .stat{background:#0c0a08;padding:22px 14px;text-align:center}
  .stat b{font-family:'Bodoni Moda',serif;font-size:32px;color:#c9a25e;display:block}
  .stat span{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#cfc6b6}
  .cta{display:inline-block;background:#c9a25e;color:#0c0a08;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-size:12px;padding:14px 24px;border-radius:3px;margin:8px 10px 0 0}
  .ghost{display:inline-block;border:1px solid #c9a25e88;color:#f3e3be;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;font-size:11px;padding:13px 22px;border-radius:3px;margin-top:8px}
  .chips a{display:inline-block;border:1px solid #ffffff22;border-radius:30px;padding:8px 14px;margin:6px 6px 0 0;color:#ece6db;font-size:13px}
  .faq{border-top:1px solid #ffffff14;padding:16px 0}
  .faq b{color:#fff}
  nav{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a8276;margin-bottom:26px}
  footer{border-top:1px solid #ffffff14;margin-top:48px;padding-top:22px;font-size:12px;color:#9a9286}
</style></head><body><div class="wrap">`;

const FOOT = (extra = "") =>
  `<footer>© ${YEAR} JR Design Build Inc · CSLB #1083248 · ${extra}<a href="/">Home</a> · <a href="/cities/">All cities</a></footer></div></body></html>`;

const statBand = (c) => `<div class="stats">
  ${c.projects ? `<div class="stat"><b>${c.projects}+</b><span>Projects in ${esc(c.name)}</span></div>` : ``}
  ${c.permits ? `<div class="stat"><b>${c.permits}</b><span>Permits filed</span></div>` : ``}
  <div class="stat"><b>533+</b><span>Projects total</span></div>
  <div class="stat"><b>147</b><span>Permits managed</span></div>
  <div class="stat"><b>CSLB</b><span>Licensed &amp; insured</span></div>
</div>`;

const serviceChips = (slug) =>
  `<div class="chips">${SERVICES.map((s) => `<a href="/cities/${slug}/${s.slug}/">${esc(s.name)}</a>`).join("")}</div>`;

function cityPage(c) {
  const slug = slugify(c.name);
  const canonical = `${ORIGIN}/cities/${slug}`;
  const title = `${c.name} Remodels, ADUs & Additions | JR Design Build`;
  const desc = c.projects
    ? `JR Design Build has completed ${c.projects}+ projects in ${c.name}. CSLB-licensed design-build for ADUs, additions, kitchens, baths and whole-home remodels in ${c.name}, CA.`
    : `CSLB-licensed design-build in ${c.name}, CA — ADUs, additions, kitchens, baths and whole-home remodels. 533+ projects and 147 permits across the Bay Area.`;
  const faqs = [
    [`Does JR Design Build work in ${c.name}?`, `Yes. We're a CSLB-licensed design-build general contractor serving ${c.name} and the greater Bay Area${c.projects ? `, with ${c.projects}+ completed projects here` : ""}.`],
    [`Can I build an ADU in ${c.name}?`, `In most cases yes — California ADU law allows accessory dwelling units on most single-family lots, subject to local rules. Run your address through our free Property Intelligence Report to see your options.`],
    [`How much does a remodel cost in ${c.name}?`, `It depends on scope and finish level. Our public cost tools give live Bay Area ranges, and your free consultation provides exact, fixed numbers.`],
  ];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": ["GeneralContractor", "HomeAndConstructionBusiness"], name: "JR Design Build", url: canonical, areaServed: { "@type": "City", name: `${c.name}, CA` }, hasCredential: "CSLB License #1083248", knowsAbout: SERVICES.map((s) => s.name) },
      { "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Cities", item: `${ORIGIN}/cities` }, { "@type": "ListItem", position: 2, name: c.name, item: canonical }] },
    ],
  };
  return (
    HEAD(title, desc, canonical, jsonld) +
    `<nav><a href="/">JR Design Build</a> · <a href="/cities/">Cities</a> · ${esc(c.name)}</nav>
<span class="eyebrow">Bay Area · ${esc(c.name)}</span>
<h1>Design-build in ${esc(c.name)}.</h1>
<p>From ADUs and additions to whole-home remodels — designed and built under one roof, with transparent schedules and Matterport precision. We restore trust in construction across ${esc(c.name)} and the Bay Area.</p>
${statBand(c)}
<a class="cta" href="/report" data-analytics="analyze_property">Analyze my ${esc(c.name)} property →</a>
<a class="ghost" href="/contact" data-analytics="book_consultation">Book a free consultation</a>
<h2>What we build in ${esc(c.name)}</h2>
${serviceChips(slug)}
<h2>${esc(c.name)} FAQ</h2>
${faqs.map(([q, a]) => `<div class="faq"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join("")}
` +
    FOOT(`Serving ${esc(c.name)} &amp; the Bay Area · `)
  );
}

function servicePage(c, sv) {
  const slug = slugify(c.name);
  const canonical = `${ORIGIN}/cities/${slug}/${sv.slug}`;
  const title = `${sv.name} in ${c.name} | JR Design Build`;
  const desc = `${sv.name} in ${c.name}, CA by JR Design Build — CSLB-licensed design-build. ${sv.blurb}`;
  const faqs = [
    [`Who does ${sv.short}s in ${c.name}?`, `JR Design Build — a CSLB-licensed design-build general contractor serving ${c.name}${c.projects ? ` with ${c.projects}+ local projects` : ""}. ${sv.blurb}`],
    [`How long does a ${sv.short} take in ${c.name}?`, `Design, engineering, permitting and construction each have their own timeline. Our Property Intelligence Report gives a per-phase estimate for your address.`],
    [`What does a ${sv.short} cost in ${c.name}?`, `Cost depends on size, finish and site conditions. See live Bay Area ranges in our public cost tools, then get exact fixed pricing in a free consultation.`],
  ];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Service", serviceType: sv.name, provider: { "@type": "GeneralContractor", name: "JR Design Build", hasCredential: "CSLB License #1083248" }, areaServed: { "@type": "City", name: `${c.name}, CA` }, url: canonical },
      { "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Cities", item: `${ORIGIN}/cities` }, { "@type": "ListItem", position: 2, name: c.name, item: `${ORIGIN}/cities/${slug}` }, { "@type": "ListItem", position: 3, name: sv.name, item: canonical }] },
    ],
  };
  const others = SERVICES.filter((s) => s.slug !== sv.slug);
  return (
    HEAD(title, desc, canonical, jsonld) +
    `<nav><a href="/">JR Design Build</a> · <a href="/cities/">Cities</a> · <a href="/cities/${slug}/">${esc(c.name)}</a> · ${esc(sv.name)}</nav>
<span class="eyebrow">${esc(c.name)} · ${esc(sv.name)}</span>
<h1>${esc(sv.name)} in ${esc(c.name)}.</h1>
<p>${esc(sv.blurb)} One accountable design-build team — design, engineering, permits and construction under one roof in ${esc(c.name)}.</p>
${statBand(c)}
<a class="cta" href="/report" data-analytics="analyze_property">See what your ${esc(c.name)} property can do →</a>
<a class="ghost" href="/contact" data-analytics="book_consultation">Book a free consultation</a>
<h2>Other services in ${esc(c.name)}</h2>
<div class="chips">${others.map((s) => `<a href="/cities/${slug}/${s.slug}/">${esc(s.name)}</a>`).join("")}</div>
<h2>${esc(sv.name)} in ${esc(c.name)} — FAQ</h2>
${faqs.map(([q, a]) => `<div class="faq"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join("")}
` +
    FOOT(`${esc(sv.name)} in ${esc(c.name)} · `)
  );
}

function hubPage() {
  const canonical = `${ORIGIN}/cities`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Bay Area cities served by JR Design Build", url: canonical };
  const real = CITIES_REAL.filter((c) => c.projects >= SERVICE_MIN).sort((a, b) => b.projects - a.projects);
  const more = ALL.filter((c) => c.projects < SERVICE_MIN).sort((a, b) => a.name.localeCompare(b.name));
  return (
    HEAD("Bay Area Cities We Serve | JR Design Build", "JR Design Build serves 52 Bay Area cities with ADUs, additions and remodels — 533+ projects, 147 permits, CSLB licensed.", canonical, jsonld) +
    `<nav><a href="/">JR Design Build</a> · Cities</nav>
<span class="eyebrow">Neighborhood Intelligence</span>
<h1>Cities we build in.</h1>
<p>533+ projects and 147 permits across 52 Bay Area cities. Explore where we work and what we've built.</p>
<h2>Most active cities</h2>
<div class="chips">${real.map((c) => `<a href="/cities/${slugify(c.name)}/">${esc(c.name)} (${c.projects}+)</a>`).join("")}</div>
<h2>Also serving</h2>
<div class="chips">${more.map((c) => `<a href="/cities/${slugify(c.name)}/">${esc(c.name)}</a>`).join("")}</div>
<a class="cta" style="margin-top:30px" href="/report" data-analytics="analyze_property">Analyze my property →</a>
` +
    FOOT()
  );
}

function sitemap(urls) {
  // Each entry may be a plain string or { loc, changefreq, priority }.
  const norm = (u) =>
    typeof u === "string" ? { loc: u, changefreq: "weekly", priority: "0.7" } : u;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(norm)
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${u.changefreq || "weekly"}</changefreq><priority>${u.priority || "0.7"}</priority></url>`
  )
  .join("\n")}
</urlset>
`;
}

function main() {
  if (!existsSync(DIST)) {
    console.warn("[prerender] dist/ not found — skipping (run after vite build).");
    return;
  }
  // Real, crawlable URLs (no hash fragments). Money pages get higher priority.
  const urls = [
    { loc: `${ORIGIN}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${ORIGIN}/services`, changefreq: "monthly", priority: "0.9" },
    { loc: `${ORIGIN}/portfolio`, changefreq: "monthly", priority: "0.8" },
    { loc: `${ORIGIN}/contact`, changefreq: "monthly", priority: "0.9" },
    { loc: `${ORIGIN}/studio`, changefreq: "monthly", priority: "0.7" },
    { loc: `${ORIGIN}/tools`, changefreq: "monthly", priority: "0.7" },
    { loc: `${ORIGIN}/dna`, changefreq: "monthly", priority: "0.6" },
    { loc: `${ORIGIN}/group`, changefreq: "monthly", priority: "0.6" },
    { loc: `${ORIGIN}/cities`, changefreq: "weekly", priority: "0.8" },
  ];
  mkdirSync(join(DIST, "cities"), { recursive: true });
  writeFileSync(join(DIST, "cities", "index.html"), hubPage());

  let cityCount = 0;
  let svcCount = 0;
  for (const c of ALL) {
    const slug = slugify(c.name);
    const dir = join(DIST, "cities", slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), cityPage(c));
    urls.push({ loc: `${ORIGIN}/cities/${slug}`, changefreq: "weekly", priority: "0.7" });
    cityCount++;
    // city x service long-tail only for cities with a meaningful track record
    if (c.projects >= SERVICE_MIN) {
      for (const sv of SERVICES) {
        const sdir = join(dir, sv.slug);
        mkdirSync(sdir, { recursive: true });
        writeFileSync(join(sdir, "index.html"), servicePage(c, sv));
        urls.push({ loc: `${ORIGIN}/cities/${slug}/${sv.slug}`, changefreq: "monthly", priority: "0.6" });
        svcCount++;
      }
    }
  }
  writeFileSync(join(DIST, "sitemap.xml"), sitemap(urls));
  console.log(`[prerender] ${cityCount} city pages + ${svcCount} city×service pages + hub + sitemap (${urls.length} urls)`);
}

main();
