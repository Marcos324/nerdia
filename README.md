# nerdIA

Código y recursos de [nerdia.com.ar](https://nerdia.com.ar), la portada diaria de inteligencia artificial.

El sitio es un Cloudflare Worker (`dawn-cell-d2d8`) que lee la base D1 `nerdia-content`.

## Qué hay acá

- `src/worker.js` — el Worker: portada, `/ediciones`, `/ediciones/AAAA-MM-DD`, `/sobre`, RSS, sitemaps y `/og/AAAA-MM-DD.png`.
- `scripts/og.mjs` + `scripts/og-template.js` — dibujan la imagen para redes de cada edición (1200×630 PNG) con la plantilla del sistema de diseño nerdIA.
- `migrations/` — cambios a la base D1.
- `assets/og-nerdia.png` — la imagen genérica para redes. Es el respaldo cuando una edición no tiene imagen propia; renombrarla o moverla rompe esas vistas previas.
- `assets/nerdia-mark.svg` — el logo de la taza.
- Rama `og` — las imágenes ya dibujadas, una por edición, en `og/AAAA-MM-DD.png`.

## Imagen para redes por edición

Funciona con el plan gratuito de Cloudflare: el Worker no dibuja nada, solo sirve.

1. La tarea diaria de Claude, después de publicar la edición, escribe un JSON con sus datos y corre
   `npm run og -- edicion.json carpeta/` (con `stat_value` y `stat_caption_es` aparece la tarjeta de cifra; sin eso, solo el titular).
2. Sube el PNG a la rama `og`.
3. El Worker sirve `https://nerdia.com.ar/og/AAAA-MM-DD.png` trayéndolo de esa rama (con caché) y lo pone como `og:image`, `twitter:image` y en el JSON-LD de la portada y de cada edición. Si una edición todavía no tiene imagen, redirige a la genérica.

Al cambiar la plantilla, volver a dibujar las imágenes y subir `OG_VERSION` en `src/worker.js` para que las redes pidan la nueva.

## Trabajar en local

```sh
npm install
npm run dev        # Worker local con una copia local de D1
```

## Publicar

```sh
npm run migrate    # aplica migrations/ a la base de producción (una vez por migración)
npm run deploy
```

O conectar el repo en Cloudflare (Workers & Pages › dawn-cell-d2d8 › Settings › Builds) para que cada push a `main` se publique solo.
