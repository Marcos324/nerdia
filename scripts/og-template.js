// nerdIA — plantilla de la imagen para redes por edición (1200×630).
// Plantilla "OG · Nota principal" del sistema de diseño nerdIA: masthead con la taza,
// doble regla, kicker, titular y, si la edición tiene cifra destacada, la tarjeta de cifra.
// La usa scripts/og.mjs (Node) para dibujar el PNG; no corre dentro del Worker.

// Tokens del sistema de diseño (tema claro).
export const T = {
  paper: "#F2E8D8",
  surface: "#FBF6EC",
  ink: "#2B1C12",
  muted: "#6B5A45",
  accent: "#C2652E",
  accentText: "#995024", // accent para texto chico: 4,9:1 sobre paper
  rule: "rgba(43,28,18,0.18)",
  ruleSoft: "rgba(43,28,18,0.10)",
};



const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fechaCorta(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`;
}
function recortar(s, n) {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20)).replace(/[,;:.\s]+$/, "") + "…";
}

// Tamaño del titular según su largo, para que siempre entre en 4 líneas.
function headlineSize(text, withStat) {
  const n = text.length;
  if (withStat) return n > 95 ? 40 : n > 75 ? 46 : 52;
  return n > 110 ? 48 : n > 80 ? 56 : 64;
}

// El kicker de la tabla viene como "DEEPSEEK" o "DEEPSEEK · POLÍTICA": la primera parte va en la etiqueta llena.
// Algunas ediciones guardaron el titular entero como kicker: si es largo, no se muestra.
function kickerParts(kicker) {
  const parts = String(kicker || "").split(/\s*[·|]\s*/).filter(Boolean);
  if (!parts.length || parts[0].length > 28) return { tag: "", rest: "" };
  const rest = parts.slice(1).join(" · ");
  return { tag: parts[0], rest: rest.length > 40 ? "" : rest };
}

export function ogHtml(ed, markUri) {
  const headline = recortar(ed.headline_es, 140);
  const hasStat = Boolean(ed.stat_value && String(ed.stat_value).trim());
  const size = headlineSize(headline, hasStat);
  const { tag, rest } = kickerParts(ed.kicker_es);
  const n = String(ed.editionNumber ?? 0).padStart(3, "0");

  const kicker = tag
    ? `<div style="display:flex;align-items:center;font-family:'JetBrains Mono';font-weight:600;font-size:17px;letter-spacing:1.7px;text-transform:uppercase;color:${T.accentText};margin-bottom:18px">
        <div style="display:flex;background:${T.accent};color:${T.surface};padding:3px 10px;border-radius:3px">${esc(tag)}</div>
        ${rest ? `<div style="display:flex;margin-left:12px">${esc(rest)}</div>` : ""}
      </div>`
    : "";

  const stat = hasStat
    ? `<div style="display:flex;flex-direction:column;width:330px;min-width:330px;max-width:330px;flex-shrink:0;margin-left:48px;background:${T.surface};border:1px solid ${T.ruleSoft};border-radius:8px;padding:28px 28px 26px">
        <div style="display:flex;font-family:'JetBrains Mono';font-weight:600;font-size:${String(ed.stat_value).length > 6 ? 64 : 92}px;line-height:1;color:${T.accent}">${esc(String(ed.stat_value).trim())}</div>
        ${ed.stat_caption_es ? `<div style="display:flex;margin-top:12px;font-family:'Archivo';font-size:18px;line-height:1.45;color:${T.muted}">${esc(recortar(ed.stat_caption_es, 120))}</div>` : ""}
      </div>`
    : "";

  return `<div style="display:flex;flex-direction:column;width:1200px;height:630px;padding:52px 64px 48px;background:${T.paper};color:${T.ink};font-family:'Archivo'">
  <div style="display:flex;width:1072px;align-items:center">
    <div style="display:flex;align-items:center">
      <img src="${markUri}" width="52" height="52" />
      <div style="display:flex;flex-direction:column;margin-left:14px">
        <div style="display:flex;align-items:center;font-family:'Zilla Slab';font-weight:700;font-size:30px;line-height:1.1">nerd<div style="display:flex;font-family:'JetBrains Mono';font-weight:700;font-size:17px;color:${T.surface};background:${T.accent};padding:2px 8px 3px;border-radius:5px;margin-left:3px">IA</div></div>
        <div style="display:flex;font-family:'Archivo';font-weight:500;font-size:14px;color:${T.muted};margin-top:2px">The AI Desk</div>
      </div>
    </div>
    <div style="display:flex;flex-grow:1"></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;font-family:'JetBrains Mono';font-weight:600;font-size:15px;color:${T.muted};line-height:1.6">
      <div style="display:flex">N.º ${n} · Edición diaria</div>
      <div style="display:flex">${fechaCorta(ed.date)}</div>
    </div>
  </div>
  <div style="display:flex;width:1072px;height:3px;background:${T.ink};margin-top:22px"></div>
  <div style="display:flex;width:1072px;height:1px;background:${T.ink};margin-top:3px"></div>
  <div style="display:flex;width:1072px;flex:1;align-items:center;padding-top:20px">
    <div style="display:flex;flex-direction:column;flex:1">
      ${kicker}
      <div style="display:flex;font-family:'Zilla Slab';font-weight:700;font-size:${size}px;line-height:1.1">${esc(headline)}</div>
    </div>
    ${stat}
  </div>
  <div style="display:flex;width:1072px;align-items:center;border-top:1px solid ${T.rule};padding-top:16px;font-family:'JetBrains Mono';font-weight:600;font-size:15px;color:${T.muted}">
    <div style="display:flex">Redacción nerdIA · ${fechaCorta(ed.date)}</div>
    <div style="display:flex;flex-grow:1"></div>
    <div style="display:flex;color:${T.ink}">nerdia.com.ar</div>
  </div>
</div>`;
}
