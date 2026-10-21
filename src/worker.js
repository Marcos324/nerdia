// nerdIA — Cloudflare Worker (nerdia.com.ar)
// Sirve la portada desde D1 (binding NERDIA_D1) y, desde oct 2026, todo lo
// necesario para buscadores: robots.txt, sitemaps, archivo de ediciones con
// URL propia, /sobre, RSS con enlaces permanentes y 404 reales.
// Desde el 21 oct 2026: imagen para redes propia por edición en /og/AAAA-MM-DD.png.
// La dibuja la tarea diaria (scripts/og.mjs) y la sube a la rama `og` del repo;
// el Worker solo la sirve, así que no necesita el plan pago de Workers.

const SITE = "https://nerdia.com.ar";
const SITE_NAME = "nerdIA";
const OG_IMAGE = "https://raw.githubusercontent.com/Marcos324/nerdia/main/assets/og-nerdia.png";
const OG_VERSION = "1"; // subir cuando cambie la plantilla, para que las redes pidan la imagen nueva
const OG_SOURCE = "https://raw.githubusercontent.com/Marcos324/nerdia/og/og"; // rama `og`, carpeta og/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// ---------- helpers ----------
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const escapeXml = esc;

function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
function fechaCorta(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`;
}
function pad3(n) { return String(n ?? 0).padStart(3, "0"); }
function recortar(s, n) {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20)).replace(/[,;:.\s]+$/, "") + "…";
}
function edUrl(date) { return `${SITE}/ediciones/${date}`; }
function ogUrl(date) { return `${SITE}/og/${date}.png?v=${OG_VERSION}`; }

const SEC_HEADERS = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" };

function html(body, status = 200, maxAge = 60) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": `public, max-age=${maxAge}`, ...SEC_HEADERS },
  });
}
function text(body, type, maxAge = 300, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": `${type}; charset=utf-8`, "cache-control": `public, max-age=${maxAge}`, ...SEC_HEADERS },
  });
}
function redirect(to, status = 301) {
  return new Response(null, { status, headers: { location: to, ...SEC_HEADERS } });
}

// Cambia la imagen para redes de una página ya armada (portada o foto de edición).
function withOgImage(page, image) {
  const tags = `<meta property="og:image" content="${image}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:image" content="${image}">`;
  let out = page
    .replace(/<meta property="og:image(?::[a-z]+)?" content="[^"]*">\s*/g, "")
    .replace(/<meta name="twitter:image(?::[a-z]+)?" content="[^"]*">\s*/g, "")
    // el JSON-LD de la nota del día (id="ld-edition") que escribe la tarea diaria trae la imagen genérica
    .split(`"image":["${OG_IMAGE}"]`).join(`"image":["${image}"]`);
  return out.replace("</head>", `${tags}\n</head>`);
}

// ---------- página simple con la identidad de nerdIA ----------
function shell({ title, description, canonical, body, jsonld = [], noindex = false, ogType = "website", image = OG_IMAGE }) {
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1"}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#C2652E">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%98%95%3C/text%3E%3C/svg%3E">
<link rel="alternate" type="application/rss+xml" title="nerdIA — RSS" href="${SITE}/rss.xml">
${ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@600;700&family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
  :root{--paper:#F2E8D8;--surface:#FBF6EC;--ink:#2B1C12;--muted:#6B5A45;--accent:#C2652E;--deep:#5B4636;--rule:rgba(43,28,18,.18);--soft:rgba(43,28,18,.10);color-scheme:light}
  @media (prefers-color-scheme:dark){:root{--paper:#1B1410;--surface:#241C16;--ink:#F1E6D3;--muted:#B9A88C;--accent:#D9773D;--deep:#DCCBAE;--rule:rgba(241,230,211,.16);--soft:rgba(241,230,211,.09);color-scheme:dark}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .wrap{max-width:820px;margin:0 auto;padding:28px max(18px,env(safe-area-inset-left,0px)) 64px}
  .mast{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;text-decoration:none}
  .brand{font-family:"Zilla Slab",serif;font-weight:700;font-size:28px;text-decoration:none}
  .brand .ia{font-family:"JetBrains Mono",monospace;font-size:.55em;background:var(--accent);color:var(--surface);padding:2px 7px 3px;border-radius:5px;vertical-align:middle;position:relative;top:-3px}
  .tag{font-family:"Archivo",sans-serif;font-style:italic;font-size:12px;color:var(--muted)}
  .mnav{font-family:"JetBrains Mono",monospace;font-size:12px;display:flex;gap:16px}
  .mnav a{text-decoration:none;color:var(--muted)} .mnav a:hover{color:var(--accent)}
  .rule{height:3px;background:var(--ink);margin-top:16px}.rule2{height:1px;background:var(--ink);margin:3px 0 28px}
  h1{font-family:"Zilla Slab",serif;font-weight:700;font-size:clamp(26px,5vw,36px);line-height:1.15;margin:0 0 14px;text-wrap:balance}
  h2{font-family:"Zilla Slab",serif;font-weight:700;font-size:15px;letter-spacing:.08em;text-transform:uppercase;margin:34px 0 10px;padding-bottom:8px;border-bottom:2px solid var(--ink)}
  .kicker{font-family:"JetBrains Mono",monospace;font-weight:600;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
  .meta{font-family:"JetBrains Mono",monospace;font-size:11.5px;color:var(--muted)}
  p,li{font-size:16.5px;line-height:1.65;max-width:66ch}
  .dek{color:var(--muted)}
  .list{list-style:none;padding:0;margin:0}
  .list li{padding:14px 0;border-bottom:1px solid var(--soft);max-width:none}
  .list a{text-decoration:none;font-family:"Zilla Slab",serif;font-weight:600;font-size:18px;line-height:1.35;display:block;margin-top:4px}
  .list a:hover{color:var(--accent)}
  .list .sum{font-size:14px;color:var(--muted);margin:6px 0 0;line-height:1.5}
  .pager{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:34px;padding-top:14px;border-top:1px solid var(--rule);font-family:"JetBrains Mono",monospace;font-size:12.5px}
  .pager a{text-decoration:none;color:var(--accent)}
  .btn{display:inline-block;margin-top:8px;font-weight:600;color:var(--accent);text-decoration:none}
  details{margin-top:22px;border-top:1px solid var(--soft);padding-top:12px}
  summary{cursor:pointer;font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--muted)}
  footer{margin-top:44px;padding-top:14px;border-top:3px double var(--ink);font-size:12.5px;color:var(--muted);line-height:1.6}
  :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="mast">
      <div><a class="brand" href="${SITE}/">nerd<span class="ia">IA</span></a><div class="tag">The AI Desk · noticias diarias de inteligencia artificial</div></div>
      <nav class="mnav" aria-label="Secciones"><a href="${SITE}/">Portada de hoy</a><a href="${SITE}/ediciones">Archivo</a><a href="${SITE}/sobre">Sobre nerdIA</a></nav>
    </div>
    <div class="rule"></div><div class="rule2"></div>
  </header>
  <main>
${body}
  </main>
  <footer>Redacción nerdIA · notas producidas con asistencia de IA a partir de fuentes primarias · editor responsable: Marcos Ávila · <a href="${SITE}/rss.xml">RSS</a></footer>
</div>
</body>
</html>`;
}

// ---------- JSON-LD ----------
const ORG_REF = { "@id": `${SITE}/#org` };
function articleLd(r) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: recortar(r.headline_es, 110),
    description: recortar(r.dek_es, 300),
    datePublished: `${r.date}T07:00:00-03:00`,
    inLanguage: "es",
    url: edUrl(r.date),
    mainEntityOfPage: edUrl(r.date),
    image: [ogUrl(r.date)],
    author: { "@type": "Organization", name: "Redacción nerdIA", url: `${SITE}/sobre` },
    editor: { "@type": "Person", "@id": `${SITE}/#marcos`, name: "Marcos Ávila" },
    publisher: { "@type": "NewsMediaOrganization", "@id": `${SITE}/#org`, name: SITE_NAME, url: `${SITE}/`, logo: { "@type": "ImageObject", url: OG_IMAGE } },
  };
}
function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
  };
}

// ---------- datos ----------
async function latestHtml(env) {
  const row = await env.NERDIA_D1.prepare("SELECT html, updated_at FROM pages WHERE key = ?").bind("latest").first();
  return row && row.html ? row : null;
}
async function latestEditionDate(env) {
  const row = await env.NERDIA_D1.prepare("SELECT date FROM editions ORDER BY date DESC LIMIT 1").first();
  return row ? row.date : null;
}
async function allEditions(env) {
  const { results } = await env.NERDIA_D1
    .prepare("SELECT date, editionNumber, kicker_es, headline_es, headline_en, dek_es, dek_en FROM editions ORDER BY date DESC")
    .all();
  return results || [];
}

// ---------- rutas ----------
async function routeHome(env) {
  const row = await latestHtml(env);
  if (!row) return text("nerdIA: todavía no se publicó ninguna edición.", "text/plain", 30, 503);
  const date = await latestEditionDate(env);
  return html(date ? withOgImage(row.html, ogUrl(date)) : row.html);
}

// Imagen para redes de una edición: la trae de la rama `og` del repo y la guarda en la
// caché de Cloudflare. Si esa edición todavía no tiene imagen, manda a la genérica.
async function routeOg(ctx, request, date) {
  const cache = caches.default;
  const cacheKey = new Request(`${SITE}/og/${date}.png?v=${OG_VERSION}`, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return request.method === "HEAD" ? new Response(null, hit) : hit;

  const upstream = await fetch(`${OG_SOURCE}/${date}.png`, { cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 3600, "404": 60, "500-599": 0 } } });
  if (!upstream.ok) return redirect(OG_IMAGE, 302);

  const res = new Response(upstream.body, {
    status: 200,
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400, stale-while-revalidate=604800", ...SEC_HEADERS },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return request.method === "HEAD" ? new Response(null, res) : res;
}

function routeRobots() {
  return text(
`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/sitemap-news.xml
`, "text/plain", 3600);
}

async function routeSitemap(env) {
  const eds = await allEditions(env);
  const latest = await env.NERDIA_D1.prepare("SELECT updated_at FROM pages WHERE key = 'latest'").first();
  const sobre = await env.NERDIA_D1.prepare("SELECT updated_at FROM pages WHERE key = 'sobre'").first();
  const urls = [
    `  <url><loc>${SITE}/</loc>${latest ? `<lastmod>${esc(latest.updated_at)}</lastmod>` : ""}<changefreq>daily</changefreq></url>`,
    `  <url><loc>${SITE}/ediciones</loc>${eds[0] ? `<lastmod>${eds[0].date}</lastmod>` : ""}<changefreq>daily</changefreq></url>`,
  ];
  if (sobre) urls.push(`  <url><loc>${SITE}/sobre</loc><lastmod>${esc(sobre.updated_at)}</lastmod></url>`);
  for (const e of eds) urls.push(`  <url><loc>${edUrl(e.date)}</loc><lastmod>${e.date}</lastmod></url>`);
  return text(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`, "application/xml", 900);
}

async function routeNewsSitemap(env) {
  // Google News: solo notas de las últimas 48 horas
  const desde = new Date(Date.now() - 2 * 86400 * 1000 - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const { results } = await env.NERDIA_D1
    .prepare("SELECT date, headline_es FROM editions WHERE date >= ? ORDER BY date DESC")
    .bind(desde).all();
  const items = (results || []).map((e) => `  <url>
    <loc>${edUrl(e.date)}</loc>
    <news:news>
      <news:publication><news:name>${SITE_NAME}</news:name><news:language>es</news:language></news:publication>
      <news:publication_date>${e.date}T07:00:00-03:00</news:publication_date>
      <news:title>${escapeXml(recortar(e.headline_es, 110))}</news:title>
    </news:news>
  </url>`).join("\n");
  return text(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>
`, "application/xml", 900);
}

async function routeRss(env) {
  const { results } = await env.NERDIA_D1
    .prepare("SELECT date, editionNumber, headline_es, dek_es FROM editions ORDER BY date DESC LIMIT 20")
    .all();
  const items = (results || []).map((r) => {
    let pubDate = "";
    try { pubDate = new Date(r.date + "T10:00:00Z").toUTCString(); } catch (e) {}
    return `  <item>
    <title>${escapeXml(r.headline_es)}</title>
    <link>${edUrl(r.date)}</link>
    <guid isPermaLink="true">${edUrl(r.date)}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(r.dek_es)}</description>
  </item>`;
  }).join("\n");
  return text(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>nerdIA — The AI Desk</title>
  <link>${SITE}/</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
  <description>Noticias diarias de inteligencia artificial en español.</description>
  <language>es-ar</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`, "application/rss+xml", 300);
}

async function routeApiEditions(env) {
  const { results } = await env.NERDIA_D1
    .prepare("SELECT date, editionNumber, kicker_es, kicker_en, headline_es, headline_en, dek_es, dek_en FROM editions ORDER BY date DESC LIMIT 14")
    .all();
  return new Response(JSON.stringify(results || []), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", "x-robots-tag": "noindex" },
  });
}

async function routeArchive(env) {
  const eds = await allEditions(env);
  let body = `    <h1>Archivo de ediciones</h1>
    <p class="dek">Todas las portadas de nerdIA, la edición diaria de noticias de inteligencia artificial en español. ${eds.length} ediciones desde el ${eds.length ? fechaLarga(eds[eds.length - 1].date) : "inicio"}.</p>`;
  let mes = "";
  for (const e of eds) {
    const m = e.date.slice(0, 7);
    if (m !== mes) {
      if (mes) body += `\n    </ul>`;
      mes = m;
      const [y, mm] = m.split("-").map(Number);
      body += `\n    <h2>${MESES[mm - 1]} ${y}</h2>\n    <ul class="list">`;
    }
    body += `
      <li><span class="meta">N.º ${pad3(e.editionNumber)} · ${fechaCorta(e.date)}</span>
        <a href="/ediciones/${e.date}">${esc(e.headline_es)}</a>
        <p class="sum">${esc(recortar(e.dek_es, 220))}</p></li>`;
  }
  if (mes) body += `\n    </ul>`;
  return html(shell({
    title: "Archivo de ediciones — nerdIA",
    description: "Todas las ediciones de nerdIA: noticias diarias de inteligencia artificial en español, ordenadas por fecha.",
    canonical: `${SITE}/ediciones`,
    body,
    jsonld: [breadcrumbLd([["Portada", `${SITE}/`], ["Archivo", `${SITE}/ediciones`]])],
  }), 200, 300);
}

function archivedBanner(date, n) {
  return `<div style="background:var(--accent);color:var(--surface);font-family:'JetBrains Mono',monospace;font-size:12px;padding:8px 16px;text-align:center">Edición archivada · N.º ${pad3(n)} · ${fechaLarga(date)} &nbsp;·&nbsp; <a href="/" style="color:inherit;text-decoration:underline">Ir a la portada de hoy</a> · <a href="/ediciones" style="color:inherit;text-decoration:underline">Archivo</a></div>`;
}

async function routeEdition(env, date) {
  const ed = await env.NERDIA_D1.prepare("SELECT * FROM editions WHERE date = ?").bind(date).first();
  if (!ed) return notFound();
  const url = edUrl(date);
  const title = `${recortar(ed.headline_es, 80)} — nerdIA, ${fechaCorta(date)}`;
  const desc = recortar(ed.dek_es, 158);
  const image = ogUrl(date);

  // 1) Si hay una foto completa de la portada de ese día, se sirve con su URL propia.
  const snap = await env.NERDIA_D1.prepare("SELECT html FROM pages WHERE key = ?").bind("ed-" + date).first();
  if (snap && snap.html) {
    let page = snap.html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
      .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="article">`)
      // el reloj del topbar no debe mostrar la hora actual en una edición vieja
      .replace("var now = new Date();", "return;")
      .replace('<div id="app" data-lang="es">', '<div id="app" data-lang="es">\n' + archivedBanner(date, ed.editionNumber));
    if (!page.includes('rel="canonical"')) page = page.replace("</head>", `<link rel="canonical" href="${url}">\n</head>`);
    return html(withOgImage(page, image), 200, 3600);
  }

  // 2) Si no, una página liviana armada desde la tabla de ediciones.
  const prev = await env.NERDIA_D1.prepare("SELECT date, headline_es FROM editions WHERE date < ? ORDER BY date DESC LIMIT 1").bind(date).first();
  const next = await env.NERDIA_D1.prepare("SELECT date, headline_es FROM editions WHERE date > ? ORDER BY date ASC LIMIT 1").bind(date).first();
  const body = `    <article>
      <div class="meta">N.º ${pad3(ed.editionNumber)} · ${fechaLarga(date)} · Nota principal</div>
      ${ed.kicker_es ? `<div class="kicker" style="margin-top:14px">${esc(ed.kicker_es)}</div>` : ""}
      <h1>${esc(ed.headline_es)}</h1>
      <p class="meta">Por Redacción nerdIA · editor responsable: Marcos Ávila</p>
      <p>${esc(ed.dek_es)}</p>
      ${ed.headline_en ? `<details lang="en"><summary>Read in English</summary><h2 style="text-transform:none;letter-spacing:0;font-size:20px;border:0">${esc(ed.headline_en)}</h2><p>${esc(ed.dek_en)}</p></details>` : ""}
    </article>
    <nav class="pager" aria-label="Otras ediciones">
      <span>${prev ? `<a href="/ediciones/${prev.date}">← ${fechaCorta(prev.date)}</a>` : ""}</span>
      <a href="/ediciones">Todas las ediciones</a>
      <span>${next ? `<a href="/ediciones/${next.date}">${fechaCorta(next.date)} →</a>` : ""}</span>
    </nav>`;
  return html(shell({
    title, description: desc, canonical: url, body, ogType: "article", image,
    jsonld: [articleLd(ed), breadcrumbLd([["Portada", `${SITE}/`], ["Archivo", `${SITE}/ediciones`], [fechaCorta(date), url]])],
  }), 200, 3600);
}

async function routeSobre(env) {
  const row = await env.NERDIA_D1.prepare("SELECT html FROM pages WHERE key = ?").bind("sobre").first();
  if (!row || !row.html) return notFound();
  return html(row.html, 200, 3600);
}

function notFound() {
  return html(shell({
    title: "Página no encontrada — nerdIA",
    description: "Esta página no existe en nerdIA.",
    canonical: "",
    noindex: true,
    body: `    <h1>No encontramos esta página</h1>
    <p class="dek">Puede que la dirección esté mal escrita o que la edición todavía no exista.</p>
    <p><a class="btn" href="/">Ir a la portada de hoy →</a><br><a class="btn" href="/ediciones">Ver el archivo de ediciones →</a></p>`,
  }), 404, 300);
}

// ---------- entrada ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return redirect(url.toString());
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }

    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) return redirect(SITE + path.replace(/\/+$/, "") + url.search);
    if (path === "/index.html") return redirect(SITE + "/");

    try {
      if (path === "/") return await routeHome(env);
      if (path === "/robots.txt") return routeRobots();
      if (path === "/sitemap.xml") return await routeSitemap(env);
      if (path === "/sitemap-news.xml") return await routeNewsSitemap(env);
      if (path === "/rss.xml") return await routeRss(env);
      if (path === "/api/editions") return await routeApiEditions(env);
      if (path === "/ediciones") return await routeArchive(env);
      if (path === "/sobre") return await routeSobre(env);
      const m = path.match(/^\/ediciones\/(\d{4}-\d{2}-\d{2})$/);
      if (m) return await routeEdition(env, m[1]);
      const og = path.match(/^\/og\/(\d{4}-\d{2}-\d{2})\.png$/);
      if (og) return await routeOg(ctx, request, og[1]);
      return notFound();
    } catch (e) {
      return text("nerdIA: error temporal, probá de nuevo en unos segundos.", "text/plain", 0, 503);
    }
  },
};
