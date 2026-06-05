// Build-time prerender for programmatic SEO.
// Emits real, crawlable static HTML at dist/cities/<slug>/index.html (+ a hub
// and a fresh sitemap.xml) WITHOUT touching the SPA router. Cloudflare Pages
// serves these static files directly (they win over the _redirects SPA rewrite).
//
// City project counts are REAL (from the JR ERP). Make them live later by
// querying Supabase here at build time.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const ORIGIN = "https://www.jrdesignbuild.com";

// Real numbers from the JR ERP (projects by city; permits by jurisdiction).
const CITIES = [
  { name: "San Mateo", projects: 57 },
  { name: "San Francisco", projects: 35 },
  { name: "Burlingame", projects: 17 },
  { name: "South San Francisco", projects: 16 },
  { name: "San Jose", projects: 14, permits: 118 },
  { name: "Hillsborough", projects: 11 },
  { name: "Daly City", projects: 9 },
  { name: "Millbrae", projects: 9, permits: 11 },
  { name: "Redwood City", projects: 9 },
  { name: "San Carlos", projects: 8 },
  { name: "Pacifica", projects: 7 },
  { name: "San Bruno", projects: 7 },
  { name: "Palo Alto", projects: 5 },
  { name: "Hayward", projects: 5 },
  { name: "Brisbane", projects: 0, permits: 18 },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HEAD = (title, desc, canonical, jsonld) => `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0c0a08" />
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
  h1{font-family:'Bodoni Moda',Georgia,serif;font-size:clamp(34px,6vw,64px);font-weight:500;line-height:1.05;margin:14px 0 10px;color:#fff;letter-spacing:-1px}
  h2{font-family:'Bodoni Moda',serif;font-weight:500;color:#fff;font-size:26px;margin:42px 0 12px}
  p{color:#e6ddcd;max-width:64ch}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:#c9a25e1f;border:1px solid #c9a25e1f;margin:30px 0}
  .stat{background:#0c0a08;padding:24px 14px;text-align:center}
  .stat b{font-family:'Bodoni Moda',serif;font-size:34px;color:#c9a25e;display:block}
  .stat span{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#cfc6b6}
  .cta{display:inline-block;background:#c9a25e;color:#0c0a08;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-size:12px;padding:14px 24px;border-radius:3px;margin:8px 10px 0 0}
  .ghost{display:inline-block;border:1px solid #c9a25e88;color:#f3e3be;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;font-size:11px;padding:13px 22px;border-radius:3px;margin-top:8px}
  .chips a{display:inline-block;border:1px solid #ffffff22;border-radius:30px;padding:8px 14px;margin:6px 6px 0 0;color:#ece6db;font-size:13px}
  .faq{border-top:1px solid #ffffff14;padding:18px 0}
  .faq b{color:#fff}
  nav{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a8276;margin-bottom:28px}
  footer{border-top:1px solid #ffffff14;margin-top:50px;padding-top:24px;font-size:12px;color:#9a9286}
</style></head><body><div class="wrap">`;

function cityPage(c) {
  const slug = slugify(c.name);
  const canonical = `${ORIGIN}/cities/${slug}`;
  const title = `${c.name} Remodels, ADUs & Additions | JR Design Build`;
  const desc = `JR Design Build has completed ${c.projects}+ projects in ${c.name}. CSLB-licensed design-build for ADUs, additions, kitchens, baths and whole-home remodels in ${c.name}, CA.`;
  const faqs = [
    [`Does JR Design Build work in ${c.name}?`, `Yes. We're a CSLB-licensed design-build general contractor and have completed ${c.projects}+ projects in ${c.name}${c.permits ? `, with ${c.permits} permits filed in the jurisdiction` : ""}.`],
    [`Can I build an ADU in ${c.name}?`, `In most cases yes — California ADU law allows accessory dwelling units on most single-family lots, subject to local rules. Run your address through our free Property Intelligence Report to see your options.`],
    [`How much does a remodel cost in ${c.name}?`, `It depends on scope and finish level. Our public cost tools give live Bay Area ranges, and your free consultation provides exact, fixed numbers.`],
  ];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["GeneralContractor", "HomeAndConstructionBusiness"],
        name: "JR Design Build",
        url: canonical,
        areaServed: { "@type": "City", name: `${c.name}, CA` },
        hasCredential: "CSLB License #1083248",
        knowsAbout: ["ADUs", "Home additions", "Kitchen remodels", "Bathroom remodels", "Whole-home remodels", "Permit management"],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cities", item: `${ORIGIN}/cities` },
          { "@type": "ListItem", position: 2, name: c.name, item: canonical },
        ],
      },
    ],
  };

  return (
    HEAD(title, desc, canonical, jsonld) +
    `<nav><a href="/">JR Design Build</a> · <a href="/cities/">Cities</a> · ${esc(c.name)}</nav>
<span class="eyebrow">Bay Area · ${esc(c.name)}</span>
<h1>Design-build in ${esc(c.name)}.</h1>
<p>From ADUs and additions to whole-home remodels — designed and built under one roof, with transparent schedules and Matterport precision. We restore trust in construction across ${esc(c.name)} and the Bay Area.</p>
<div class="stats">
  <div class="stat"><b>${c.projects}+</b><span>Projects in ${esc(c.name)}</span></div>
  ${c.permits ? `<div class="stat"><b>${c.permits}</b><span>Permits filed</span></div>` : ``}
  <div class="stat"><b>CSLB</b><span>Licensed &amp; insured</span></div>
  <div class="stat"><b>287+</b><span>Projects total</span></div>
</div>
<a class="cta" href="/#/report">Analyze my ${esc(c.name)} property →</a>
<a class="ghost" href="/#/contact">Book a free consultation</a>
<h2>What we build in ${esc(c.name)}</h2>
<div class="chips">
  <a href="/#/report">ADUs</a><a href="/#/report">Additions</a><a href="/#/tools">Kitchens</a>
  <a href="/#/tools">Bathrooms</a><a href="/#/report">Whole-home remodels</a><a href="/#/report">Garage conversions</a>
</div>
<h2>${esc(c.name)} FAQ</h2>
${faqs.map(([q, a]) => `<div class="faq"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join("")}
<footer>© ${new Date().getFullYear()} JR Design Build Inc · CSLB #1083248 · Serving ${esc(c.name)} &amp; the Bay Area · <a href="/">Home</a></footer>
</div></body></html>`
  );
}

function hubPage() {
  const canonical = `${ORIGIN}/cities`;
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bay Area cities served by JR Design Build",
    url: canonical,
  };
  return (
    HEAD("Bay Area Cities We Serve | JR Design Build", "JR Design Build serves 60+ Bay Area cities with ADUs, additions and remodels. Explore project counts and insights by city.", canonical, jsonld) +
    `<nav><a href="/">JR Design Build</a> · Cities</nav>
<span class="eyebrow">Neighborhood Intelligence</span>
<h1>Cities we build in.</h1>
<p>287+ projects across 60+ Bay Area cities. Explore where we work and what we've built.</p>
<div class="chips" style="margin-top:24px">
${CITIES.map((c) => `<a href="/cities/${slugify(c.name)}/">${esc(c.name)} (${c.projects}+)</a>`).join("")}
</div>
<a class="cta" style="margin-top:30px" href="/#/report">Analyze my property →</a>
<footer>© ${new Date().getFullYear()} JR Design Build Inc · CSLB #1083248 · <a href="/">Home</a></footer>
</div></body></html>`
  );
}

function sitemap() {
  const urls = [
    `${ORIGIN}/`,
    `${ORIGIN}/cities`,
    ...CITIES.map((c) => `${ORIGIN}/cities/${slugify(c.name)}`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join("\n")}
</urlset>
`;
}

function main() {
  if (!existsSync(DIST)) {
    console.warn("[prerender] dist/ not found — skipping (run after vite build).");
    return;
  }
  mkdirSync(join(DIST, "cities"), { recursive: true });
  writeFileSync(join(DIST, "cities", "index.html"), hubPage());
  let n = 0;
  for (const c of CITIES) {
    const dir = join(DIST, "cities", slugify(c.name));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), cityPage(c));
    n++;
  }
  writeFileSync(join(DIST, "sitemap.xml"), sitemap());
  console.log(`[prerender] wrote ${n} city pages + hub + sitemap.xml`);
}

main();
