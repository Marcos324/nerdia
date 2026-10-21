#!/usr/bin/env node
// Dibuja la imagen para redes (1200×630 PNG) de una o varias ediciones de nerdIA.
//
// Uso:
//   node scripts/og.mjs edicion.json [carpeta-de-salida]
//
// edicion.json es un objeto o una lista de objetos con los campos de la tabla `editions`:
//   { "date": "2026-10-21", "editionNumber": 35, "kicker_es": "DEEPSEEK",
//     "headline_es": "…", "stat_value": "100+", "stat_caption_es": "…" }
// stat_value y stat_caption_es son opcionales: sin cifra, la imagen sale solo con el titular.
// Escribe <carpeta>/<date>.png (por defecto, la carpeta og/).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import { ogHtml } from "./og-template.js";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (pkg, file) => readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`));

const FONTS = [
  { name: "Zilla Slab", data: font("zilla-slab", "zilla-slab-latin-700-normal.woff"), weight: 700, style: "normal" },
  { name: "Archivo", data: font("archivo", "archivo-latin-400-normal.woff"), weight: 400, style: "normal" },
  { name: "Archivo", data: font("archivo", "archivo-latin-500-normal.woff"), weight: 500, style: "normal" },
  { name: "JetBrains Mono", data: font("jetbrains-mono", "jetbrains-mono-latin-600-normal.woff"), weight: 600, style: "normal" },
  { name: "JetBrains Mono", data: font("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"), weight: 700, style: "normal" },
];
const MARK_URI = "data:image/svg+xml;base64," + readFileSync(join(root, "assets/nerdia-mark.svg")).toString("base64");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const [input, outDir = join(root, "og")] = process.argv.slice(2);
if (!input) {
  console.error("Uso: node scripts/og.mjs edicion.json [carpeta-de-salida]");
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, "utf8"));
const editions = Array.isArray(data) ? data : [data];
mkdirSync(outDir, { recursive: true });

let fallas = 0;
for (const ed of editions) {
  if (!ed || !DATE_RE.test(ed.date || "") || !ed.headline_es) {
    console.error(`salteada: falta date (AAAA-MM-DD) o headline_es en ${JSON.stringify(ed).slice(0, 80)}`);
    fallas++;
    continue;
  }
  const svg = await satori(html(ogHtml(ed, MARK_URI)), { width: 1200, height: 630, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  const out = join(outDir, `${ed.date}.png`);
  writeFileSync(out, png);
  console.log(`${out} (${Math.round(png.length / 1024)} KB)`);
}
process.exit(fallas ? 2 : 0);
